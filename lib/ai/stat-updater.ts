/**
 * Stat Updater
 * 
 * Applies stat changes from turn resolution, handles level-ups with perk generation,
 * and manages status effects.
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3**
 */

import { PowerSheet, StatUpdate, Status, Perk } from '../types';
import { prisma } from '../prisma';
import OpenAI from 'openai';

// Initialize OpenAI client (lazy initialization to avoid errors in tests)
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
    });
  }
  return openai;
}

// Level-up thresholds (Skyrim-style frequent upgrades)
const LEVEL_UP_FREQUENCY = 3; // Level up every 3 successful actions/events

/**
 * Apply stat updates to a character's Power Sheet
 * 
 * @param characterId - The character to update
 * @param statUpdate - The stat changes to apply
 * @param gameId - The game ID for context
 * @param turnId - The turn ID for snapshot tracking
 * @returns Updated Power Sheet
 */
export async function applyStatUpdates(
  characterId: string,
  statUpdate: StatUpdate,
  gameId: string,
  turnId: string
): Promise<PowerSheet> {
  // Fetch current character
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    throw new Error('CHARACTER_NOT_FOUND');
  }

  const currentPowerSheet = character.powerSheet as unknown as PowerSheet;
  const updatedPowerSheet = { ...currentPowerSheet };

  // Apply HP changes
  if (statUpdate.changes.hp !== undefined) {
    updatedPowerSheet.hp = Math.max(
      0,
      Math.min(updatedPowerSheet.maxHp, currentPowerSheet.hp + statUpdate.changes.hp)
    );
  }

  // Apply level changes
  if (statUpdate.changes.level !== undefined) {
    const newLevel = statUpdate.changes.level;
    updatedPowerSheet.level = newLevel;

    // Scale maxHp with level
    const hpIncrease = Math.floor((newLevel - currentPowerSheet.level) * 10);
    updatedPowerSheet.maxHp = currentPowerSheet.maxHp + hpIncrease;
    updatedPowerSheet.hp = Math.min(updatedPowerSheet.hp + hpIncrease, updatedPowerSheet.maxHp);
  }

  // Apply attribute changes
  if (statUpdate.changes.attributes) {
    updatedPowerSheet.attributes = {
      ...currentPowerSheet.attributes,
      ...statUpdate.changes.attributes,
    };
  }

  // Apply status effects
  if (statUpdate.changes.statuses) {
    updatedPowerSheet.statuses = mergeStatuses(
      currentPowerSheet.statuses,
      statUpdate.changes.statuses
    );
  }

  // Apply new perks
  if (statUpdate.changes.newPerks) {
    updatedPowerSheet.perks = [
      ...currentPowerSheet.perks,
      ...statUpdate.changes.newPerks,
    ];
  }

  // Tick down status durations
  updatedPowerSheet.statuses = tickStatusDurations(updatedPowerSheet.statuses);

  // Update character in database
  await prisma.character.update({
    where: { id: characterId },
    data: {
      powerSheet: updatedPowerSheet as any,
    },
  });

  // Create stats snapshot
  await createStatsSnapshot(characterId, gameId, turnId, updatedPowerSheet);

  return updatedPowerSheet;
}

/**
 * Handle level-up with AI-generated perk
 * 
 * @param characterId - The character leveling up
 * @param newLevel - The new level
 * @param gameId - The game ID for context
 * @param turnId - The turn ID for snapshot tracking
 * @returns Updated Power Sheet with new perk
 */
export async function handleLevelUp(
  characterId: string,
  newLevel: number,
  gameId: string,
  turnId: string
): Promise<PowerSheet> {
  // Fetch current character
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    throw new Error('CHARACTER_NOT_FOUND');
  }

  const currentPowerSheet = character.powerSheet as unknown as PowerSheet;

  // Generate perk using AI
  const newPerk = await generatePerk(character.name, currentPowerSheet, newLevel);

  // Create stat update with level and perk
  const statUpdate: StatUpdate = {
    characterId,
    changes: {
      level: newLevel,
      newPerks: [newPerk],
    },
  };

  // Apply the updates
  return await applyStatUpdates(characterId, statUpdate, gameId, turnId);
}

/**
 * Generate a perk for level-up using AI
 * 
 * @param characterName - The character's name
 * @param powerSheet - The character's current Power Sheet
 * @param newLevel - The new level
 * @returns Generated perk
 */
export async function generatePerk(
  characterName: string,
  powerSheet: PowerSheet,
  newLevel: number
): Promise<Perk> {
  const prompt = `Generate a perk for a character who just leveled up.

CHARACTER: ${characterName}
NEW LEVEL: ${newLevel}

CURRENT ABILITIES:
${powerSheet.abilities.map(a => `- ${a.name}: ${a.description}`).join('\n')}

CURRENT PERKS:
${powerSheet.perks.length > 0 ? powerSheet.perks.map(p => `- ${p.name}: ${p.description}`).join('\n') : 'None yet'}

WEAKNESS: ${powerSheet.weakness}

Generate a perk that:
1. Complements the character's existing abilities
2. Provides a meaningful but balanced upgrade
3. Fits the character's theme and fusion ingredients
4. Is appropriate for level ${newLevel}
5. Does not negate the character's weakness

The perk should be a small, Skyrim-style upgrade (e.g., +10% damage, new passive ability, resistance to a status effect).

Return JSON in this format:
{
  "name": "Perk name (2-4 words)",
  "description": "Clear description of what the perk does (1-2 sentences)",
  "unlockedAt": ${newLevel}
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a game designer creating balanced character perks. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI for perk generation');
  }

  const perkData = JSON.parse(content);

  // Validate perk structure
  if (!perkData.name || !perkData.description || perkData.unlockedAt !== newLevel) {
    throw new Error('Invalid perk structure from AI');
  }

  return {
    name: perkData.name,
    description: perkData.description,
    unlockedAt: newLevel,
  };
}

/**
 * Merge new statuses with existing statuses
 * - If a status with the same name exists, refresh its duration
 * - Otherwise, add the new status
 * 
 * @param currentStatuses - Current status effects
 * @param newStatuses - New status effects to apply
 * @returns Merged status array
 */
export function mergeStatuses(currentStatuses: Status[], newStatuses: Status[]): Status[] {
  const statusMap = new Map<string, Status>();

  // Add current statuses to map
  for (const status of currentStatuses) {
    statusMap.set(status.name, status);
  }

  // Merge or add new statuses
  for (const newStatus of newStatuses) {
    const existing = statusMap.get(newStatus.name);
    if (existing) {
      // Refresh duration if new duration is longer
      statusMap.set(newStatus.name, {
        ...existing,
        duration: Math.max(existing.duration, newStatus.duration),
      });
    } else {
      // Add new status
      statusMap.set(newStatus.name, newStatus);
    }
  }

  return Array.from(statusMap.values());
}

/**
 * Tick down status durations and remove expired statuses
 * 
 * @param statuses - Current status effects
 * @returns Updated status array with decremented durations
 */
export function tickStatusDurations(statuses: Status[]): Status[] {
  return statuses
    .map(status => ({
      ...status,
      duration: status.duration - 1,
    }))
    .filter(status => status.duration > 0);
}

/**
 * Create a stats snapshot for history tracking
 * 
 * @param characterId - The character ID
 * @param gameId - The game ID
 * @param turnId - The turn ID
 * @param powerSheet - The current Power Sheet state
 */
export async function createStatsSnapshot(
  characterId: string,
  gameId: string,
  turnId: string,
  powerSheet: PowerSheet
): Promise<void> {
  await prisma.statsSnapshot.create({
    data: {
      gameId,
      characterId,
      turnId,
      level: powerSheet.level,
      hp: powerSheet.hp,
      maxHp: powerSheet.maxHp,
      attributes: powerSheet.attributes as any,
      statuses: powerSheet.statuses as any,
      perks: powerSheet.perks as any,
    },
  });
}

/**
 * Check if a character should level up based on turn count
 * 
 * @param characterId - The character ID
 * @param gameId - The game ID
 * @returns True if character should level up
 */
export async function shouldLevelUp(
  characterId: string,
  gameId: string
): Promise<boolean> {
  // Count successful actions/events for this character
  const eventCount = await prisma.gameEvent.count({
    where: {
      gameId,
      characterId,
      type: {
        in: ['action', 'stat_change'],
      },
    },
  });

  // Get current level
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { powerSheet: true },
  });

  if (!character) {
    return false;
  }

  const powerSheet = character.powerSheet as unknown as PowerSheet;
  const expectedLevel = Math.floor(eventCount / LEVEL_UP_FREQUENCY) + 1;

  return expectedLevel > powerSheet.level;
}

/**
 * Process all stat updates from a turn resolution
 * 
 * @param statUpdates - Array of stat updates to apply
 * @param gameId - The game ID
 * @param turnId - The turn ID
 * @returns Map of character IDs to updated Power Sheets
 */
export async function processStatUpdates(
  statUpdates: StatUpdate[],
  gameId: string,
  turnId: string
): Promise<Map<string, PowerSheet>> {
  const updatedPowerSheets = new Map<string, PowerSheet>();

  // First, validate all character IDs exist
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          character: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }

  const validCharacterIds = new Set(
    game.players
      .filter(p => p.character)
      .map(p => p.character!.id)
  );

  for (const statUpdate of statUpdates) {
    // Skip stat updates for non-existent characters
    if (!validCharacterIds.has(statUpdate.characterId)) {
      console.warn(
        `Skipping stat update for non-existent character: ${statUpdate.characterId}`
      );
      continue;
    }

    try {
      const updatedPowerSheet = await applyStatUpdates(
        statUpdate.characterId,
        statUpdate,
        gameId,
        turnId
      );

      updatedPowerSheets.set(statUpdate.characterId, updatedPowerSheet);

      // Check if character should level up (if not already leveling up in this update)
      if (!statUpdate.changes.level) {
        const shouldLevel = await shouldLevelUp(statUpdate.characterId, gameId);
        if (shouldLevel) {
          const character = await prisma.character.findUnique({
            where: { id: statUpdate.characterId },
            select: { powerSheet: true },
          });

          if (character) {
            const currentPowerSheet = character.powerSheet as unknown as PowerSheet;
            const newLevel = currentPowerSheet.level + 1;

            const leveledUpPowerSheet = await handleLevelUp(
              statUpdate.characterId,
              newLevel,
              gameId,
              turnId
            );

            updatedPowerSheets.set(statUpdate.characterId, leveledUpPowerSheet);
          }
        }
      }
    } catch (error) {
      // Log error but continue processing other stat updates
      console.error(
        `Failed to process stat update for character ${statUpdate.characterId}:`,
        error
      );
    }
  }

  return updatedPowerSheets;
}

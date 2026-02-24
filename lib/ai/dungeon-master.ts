/**
 * AI Dungeon Master Prompt Construction
 * Builds comprehensive prompts for GPT-4 narrative generation
 * Validates: Requirements 7.1, 7.2
 */

import { prisma } from '../prisma';
import { PowerSheet } from '../turn-manager';

/**
 * Game context for DM prompt construction
 */
export interface DMPromptContext {
  gameSettings: {
    toneTags: string[];
    difficultyCurve: string;
    houseRules: string | null;
  };
  turnOrder: string[];
  activePlayer: {
    id: string;
    displayName: string;
    character: {
      id: string;
      name: string;
      fusionIngredients: string;
      description: string;
      powerSheet: PowerSheet;
    };
  };
  allCharacters: Array<{
    id: string;
    name: string;
    fusionIngredients: string;
    powerSheet: PowerSheet;
    userId: string;
    displayName: string;
  }>;
  recentEvents: Array<{
    type: string;
    content: string;
    characterId: string | null;
    createdAt: Date;
  }>;
  currentTurn: number;
}

/**
 * Fetches comprehensive game context for DM prompt construction
 * Validates: Requirements 7.1, 7.2
 */
export async function fetchDMContext(gameId: string): Promise<DMPromptContext> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
            }
          },
          character: true,
        }
      },
      events: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 20, // Last 20 events
        select: {
          type: true,
          content: true,
          characterId: true,
          createdAt: true,
        }
      },
      turns: {
        orderBy: {
          turnIndex: 'desc',
        },
        take: 1,
        select: {
          turnIndex: true,
        }
      }
    }
  });

  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }

  if (game.status !== 'active') {
    throw new Error('GAME_NOT_ACTIVE');
  }

  if (game.turnOrder.length === 0) {
    throw new Error('EMPTY_TURN_ORDER');
  }

  // Get active player
  const activePlayerId = game.turnOrder[game.currentTurnIndex];
  const activePlayerData = game.players.find(p => p.userId === activePlayerId);

  if (!activePlayerData || !activePlayerData.character) {
    throw new Error('ACTIVE_PLAYER_NOT_FOUND');
  }

  // Build active player context
  const activePlayer = {
    id: activePlayerData.userId,
    displayName: activePlayerData.user.displayName,
    character: {
      id: activePlayerData.character.id,
      name: activePlayerData.character.name,
      fusionIngredients: activePlayerData.character.fusionIngredients,
      description: activePlayerData.character.description,
      powerSheet: activePlayerData.character.powerSheet as unknown as PowerSheet,
    }
  };

  // Build all characters context
  const allCharacters = game.players
    .filter(p => p.character)
    .map(p => ({
      id: p.character!.id,
      name: p.character!.name,
      fusionIngredients: p.character!.fusionIngredients,
      powerSheet: p.character!.powerSheet as unknown as PowerSheet,
      userId: p.userId,
      displayName: p.user.displayName,
    }));

  // Get recent events (reverse to chronological order - oldest first)
  const recentEvents = [...game.events].reverse();

  // Get current turn number
  const currentTurn = game.turns.length > 0 ? game.turns[0].turnIndex + 1 : 1;

  return {
    gameSettings: {
      toneTags: game.toneTags,
      difficultyCurve: game.difficultyCurve,
      houseRules: game.houseRules,
    },
    turnOrder: game.turnOrder,
    activePlayer,
    allCharacters,
    recentEvents,
    currentTurn,
  };
}

/**
 * Builds the DM prompt for narrative generation
 * Validates: Requirements 7.1, 7.2
 */
export function buildDMPrompt(context: DMPromptContext, customAction?: string): string {
  const {
    gameSettings,
    activePlayer,
    allCharacters,
    recentEvents,
    currentTurn,
  } = context;

  // Format Power Sheet for readability
  const formatPowerSheet = (ps: PowerSheet) => {
    return `
Level: ${ps.level}
HP: ${ps.hp}/${ps.maxHp}
Attributes:
  - Strength: ${ps.attributes.strength}
  - Agility: ${ps.attributes.agility}
  - Intelligence: ${ps.attributes.intelligence}
  - Charisma: ${ps.attributes.charisma}
  - Endurance: ${ps.attributes.endurance}
Abilities:
${ps.abilities.map(a => `  - ${a.name} (Power Level: ${a.powerLevel}): ${a.description}${a.cooldown ? ` [Cooldown: ${a.cooldown} turns]` : ''}`).join('\n')}
Weakness: ${ps.weakness}
${ps.statuses.length > 0 ? `Active Statuses:\n${ps.statuses.map(s => `  - ${s.name}: ${s.description} (${s.duration} turns remaining)`).join('\n')}` : ''}
${ps.perks.length > 0 ? `Perks:\n${ps.perks.map(p => `  - ${p.name}: ${p.description}`).join('\n')}` : ''}
`.trim();
  };

  // Format all characters
  const allCharactersText = allCharacters.map(char => {
    const status = char.powerSheet.hp <= 0 ? ' [DEAD]' : '';
    return `
${char.name} (${char.displayName})${status}
Fusion: ${char.fusionIngredients}
${formatPowerSheet(char.powerSheet)}
`.trim();
  }).join('\n\n');

  // Format recent events
  const recentEventsText = recentEvents.length > 0
    ? recentEvents.map(e => `[${e.type}] ${e.content}`).join('\n')
    : 'No previous events - this is the beginning of the adventure.';

  // Build the prompt
  let prompt = `You are the Dungeon Master for a multiplayer narrative game called Warlynx.

GAME SETTINGS:
- Tone Tags: ${gameSettings.toneTags.join(', ')}
- Difficulty: ${gameSettings.difficultyCurve}
${gameSettings.houseRules ? `- House Rules: ${gameSettings.houseRules}` : ''}

CURRENT GAME STATE:
- Turn: ${currentTurn}
- Active Player: ${activePlayer.displayName} playing as ${activePlayer.character.name}

ACTIVE PLAYER'S CHARACTER:
${activePlayer.character.name}
Fusion: ${activePlayer.character.fusionIngredients}
Description: ${activePlayer.character.description}

ACTIVE PLAYER'S POWER SHEET:
${formatPowerSheet(activePlayer.character.powerSheet)}

ALL CHARACTERS IN THE GAME:
${allCharactersText}

RECENT EVENTS:
${recentEventsText}

`;

  if (customAction) {
    prompt += `
PLAYER'S CUSTOM ACTION:
"${customAction}"

INSTRUCTIONS:
1. First, validate if this action is within the active player's Power Sheet abilities and reasonable power scaling
2. If INVALID:
   - Explain why the action is not allowed
   - Reference specific abilities or limitations from their Power Sheet
   - Require the player to choose from the A-D options below
3. If VALID:
   - Resolve the action with appropriate consequences
   - Update character stats as needed
   - Generate narrative that flows from this action
   - Present 4 new choices (A, B, C, D) for what happens next

`;
  } else {
    prompt += `
INSTRUCTIONS:
Generate the next turn of the game:

`;
  }

  prompt += `
1. Write engaging narrative (2-4 paragraphs) that:
   - Continues naturally from recent events
   - Presents a situation for the active player (${activePlayer.character.name})
   - Matches the tone tags (${gameSettings.toneTags.join(', ')})
   - Respects the ${gameSettings.difficultyCurve} difficulty curve
   - Considers the character's current state and abilities

2. Present EXACTLY 4 choices (A, B, C, D):
   - Each choice should be meaningful and distinct
   - Choices should align with the active player's abilities
   - Include risk levels: low, medium, high, or extreme
   - No choice should be obviously "correct" - create interesting dilemmas
   - Consider the character's weaknesses when presenting options

3. Suggest stat updates if the narrative warrants them:
   - HP changes from damage or healing
   - Status effects (buffs, debuffs, conditions)
   - Level ups if appropriate (Skyrim-style frequent small upgrades)
   - New perks if leveling up

CRITICAL RULES:
- ALWAYS generate exactly 4 choices labeled A, B, C, D
- NEVER allow actions outside the active player's Power Sheet
- NEVER provide plot armor - characters can die if HP reaches 0
- ALWAYS consider character weaknesses in consequences
- ALWAYS update stats based on narrative events
- Maintain consistency with recent events and character states
- Keep the narrative engaging and the stakes meaningful

Return your response in the following JSON format:
{
  "valid": true,
  "narrative": "Your narrative text here (2-4 paragraphs)",
  "choices": [
    {
      "label": "A",
      "description": "Description of choice A",
      "riskLevel": "low" | "medium" | "high" | "extreme"
    },
    {
      "label": "B",
      "description": "Description of choice B",
      "riskLevel": "low" | "medium" | "high" | "extreme"
    },
    {
      "label": "C",
      "description": "Description of choice C",
      "riskLevel": "low" | "medium" | "high" | "extreme"
    },
    {
      "label": "D",
      "description": "Description of choice D",
      "riskLevel": "low" | "medium" | "high" | "extreme"
    }
  ],
  "statUpdates": [
    {
      "characterId": "character_id",
      "changes": {
        "hp": number (optional),
        "level": number (optional),
        "attributes": { "strength": number, ... } (optional),
        "statuses": [{ "name": "status", "description": "desc", "duration": number, "effect": "effect" }] (optional),
        "newPerks": [{ "name": "perk", "description": "desc", "unlockedAt": level }] (optional)
      }
    }
  ],
  "validationError": null
}

If validating a custom action and it's INVALID, return:
{
  "valid": false,
  "validationError": "Explanation of why the action is invalid",
  "narrative": "",
  "choices": [],
  "statUpdates": []
}
`;

  return prompt;
}

/**
 * Builds a simplified prompt for action validation only
 * Used when we need to quickly validate if an action is within Power Sheet bounds
 */
export function buildActionValidationPrompt(
  action: string,
  powerSheet: PowerSheet,
  characterName: string
): string {
  const formatPowerSheet = (ps: PowerSheet) => {
    return `
Level: ${ps.level}
HP: ${ps.hp}/${ps.maxHp}
Attributes: Strength ${ps.attributes.strength}, Agility ${ps.attributes.agility}, Intelligence ${ps.attributes.intelligence}, Charisma ${ps.attributes.charisma}, Endurance ${ps.attributes.endurance}
Abilities:
${ps.abilities.map(a => `  - ${a.name} (Power ${a.powerLevel}): ${a.description}`).join('\n')}
Weakness: ${ps.weakness}
${ps.statuses.length > 0 ? `Active Statuses: ${ps.statuses.map(s => s.name).join(', ')}` : ''}
`.trim();
  };

  return `Validate this player action against their character's Power Sheet.

CHARACTER: ${characterName}
ACTION: "${action}"

POWER SHEET:
${formatPowerSheet(powerSheet)}

Determine:
1. Is this action within the character's abilities?
2. Is the power scaling reasonable for this character's level and abilities?
3. Are there any weaknesses or statuses that would prevent this action?
4. What are the likely consequences if this action is performed?

Return JSON:
{
  "valid": true | false,
  "reason": "Explanation of why the action is valid or invalid",
  "suggestedAlternatives": ["alternative 1", "alternative 2"] (optional, only if invalid)
}
`;
}

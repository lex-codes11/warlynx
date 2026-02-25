/**
 * AI Dungeon Master Prompt Construction and Narrative Generation
 * Builds comprehensive prompts for GPT-4 narrative generation
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import OpenAI from 'openai';
import { prisma } from '../prisma';
import { PowerSheet } from '../turn-manager';
import { sanitizeAction } from '../sanitize';

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

// Configuration for retry logic
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

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
 * Choice presented to the player
 */
export interface Choice {
  label: 'A' | 'B' | 'C' | 'D';
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

/**
 * Stat changes for a character
 */
export interface StatUpdate {
  characterId: string;
  changes: {
    hp?: number;
    level?: number;
    attributes?: Partial<PowerSheet['attributes']>;
    statuses?: Array<{
      name: string;
      description: string;
      duration: number;
      effect: string;
    }>;
    newPerks?: Array<{
      name: string;
      description: string;
      unlockedAt: number;
    }>;
  };
}

/**
 * Turn narrative response from AI
 */
export interface TurnNarrativeResponse {
  success: boolean;
  narrative: string;
  choices: Choice[];
  statUpdates: StatUpdate[];
  validationError: string | null;
  error?: string;
}

/**
 * Raw AI response structure
 */
interface AITurnResponse {
  valid: boolean;
  narrative: string;
  choices: Choice[];
  statUpdates: StatUpdate[];
  validationError: string | null;
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
 * Sanitizes custom actions to prevent prompt injection
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

  // Sanitize custom action if provided
  const sanitizedAction = customAction ? sanitizeAction(customAction).sanitized : undefined;

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

  if (sanitizedAction) {
    prompt += `
PLAYER'S CUSTOM ACTION:
"${sanitizedAction}"

INSTRUCTIONS:
1. The DM should be VERY FLEXIBLE and allow creative actions
2. Players can:
   - Flee battles and go elsewhere (night school, training, shopping, etc.)
   - Learn new skills through training or education
   - Attempt creative solutions to problems
   - Use their existing abilities in novel ways
   - Travel through space, portals, dimensions if they have the means (flight, portals, magic, etc.)
   - Transform, mutate, or enhance themselves through various means
3. ONLY reject actions that are:
   - Instant god-mode powers with no buildup or explanation (e.g., "I become omnipotent instantly")
   - Using highly specific abilities the character has never trained for AND has no way to learn
4. BE OPEN-MINDED about what's possible:
   - Space travel is possible for beings with flight, portals, or special powers
   - Portals, dimensions, and reality-bending exist in this universe
   - Characters can learn, grow, and gain new abilities through experience
   - Creative uses of existing powers should be encouraged
5. If the action is VALID (most should be):
   - Resolve it with appropriate consequences
   - Update character stats as needed
   - Generate narrative that flows from this action
   - Present 4 new choices (A, B, C, D) for what happens next
6. If the action is INVALID (very rare):
   - Explain why briefly
   - Require the player to choose from the A-D options below

REMEMBER: Be permissive and creative! This is a fantasy universe where almost anything is possible with the right powers or circumstances.

`;
  } else {
    prompt += `
INSTRUCTIONS:
Generate the next turn of the game:

`;
  }

  prompt += `
1. Write SHORT, PUNCHY narrative (3-8 sentences MAX):
   - Use short, impactful sentences
   - Focus on immediate action and consequences
   - Show, don't tell - use vivid imagery
   - **SHOW HP CHANGES**: When damage/healing occurs, show before/after HP (e.g., "HP: 85% → 62%")
   - **SHOW IMPACT**: Describe how effective attacks were (e.g., "💥 IMPACT: Critical hit! Armor shattered.")
   - Continues naturally from recent events
   - Presents a situation for the active player (${activePlayer.character.name})
   - Matches the tone tags (${gameSettings.toneTags.join(', ')})
   - Respects the ${gameSettings.difficultyCurve} difficulty curve
   - Use emojis for emphasis (🔥, ⚡, 💀, ✨, 💥, etc.)
   
   NARRATIVE FORMAT EXAMPLE:
   "🔥 ${activePlayer.character.name} unleashes a devastating attack!
   
   💥 IMPACT RESULT:
   Target HP: 85% → 62% - Direct hit! Armor cracked.
   
   The battlefield trembles as energy dissipates."

2. Present EXACTLY 4 choices (A, B, C, D):
   - Keep choice descriptions SHORT (5-10 words max)
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
- KEEP IT SHORT - Maximum 8 sentences for narrative
- Use dynamic, action-focused language
- ALWAYS generate exactly 4 choices labeled A, B, C, D
- BE FLEXIBLE - Allow creative actions (fleeing, training, learning new skills, etc.)
- ONLY reject truly impossible actions (instant god powers, abilities never trained for)
- Characters can learn new abilities through training, education, or experience
- Characters can go anywhere (night school, different locations, flee battles)
- NEVER provide plot armor - characters can die if HP reaches 0
- Weaknesses affect effectiveness, not possibility
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

/**
 * Generate turn narrative using GPT-4
 * Implements retry logic with exponential backoff
 * 
 * **Validates: Requirements 7.3, 7.4, 7.5**
 */
export async function generateTurnNarrative(
  gameId: string,
  customAction?: string
): Promise<TurnNarrativeResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await attemptTurnNarrativeGeneration(gameId, customAction);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Turn narrative generation attempt ${attempt + 1} failed:`,
        error
      );

      // If this isn't the last attempt, wait before retrying
      if (attempt < MAX_RETRIES - 1) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt);
        console.log(`Retrying in ${backoffTime}ms...`);
        await sleep(backoffTime);
      }
    }
  }

  return {
    success: false,
    narrative: '',
    choices: [],
    statUpdates: [],
    validationError: null,
    error: lastError?.message || 'Failed to generate turn narrative after multiple attempts',
  };
}

/**
 * Single attempt to generate turn narrative
 */
async function attemptTurnNarrativeGeneration(
  gameId: string,
  customAction?: string
): Promise<TurnNarrativeResponse> {
  // Fetch game context
  const context = await fetchDMContext(gameId);

  // Build the prompt
  const prompt = buildDMPrompt(context, customAction);

  // Call GPT-4
  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a Dungeon Master for a fast-paced multiplayer narrative game. Write SHORT, PUNCHY narratives (3-8 sentences MAX). Use dynamic action language. Respond with valid JSON only. Always generate exactly 4 choices labeled A, B, C, D with brief descriptions.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  // Parse and validate response
  const parsedResponse = JSON.parse(content) as AITurnResponse;
  const validatedResponse = validateTurnResponse(parsedResponse);

  return validatedResponse;
}

/**
 * Validate the AI response structure
 * 
 * **Validates: Requirement 7.4** - Exactly 4 choices labeled A, B, C, D
 */
export function validateTurnResponse(data: any): TurnNarrativeResponse {
  // Check if this is an invalid action response
  if (data.valid === false) {
    if (!data.validationError || typeof data.validationError !== 'string') {
      throw new Error('Invalid response: missing validationError for invalid action');
    }
    return {
      success: false,
      narrative: '',
      choices: [],
      statUpdates: [],
      validationError: data.validationError,
    };
  }

  // Validate narrative
  if (!data.narrative || typeof data.narrative !== 'string') {
    throw new Error('Invalid response: missing or invalid narrative');
  }

  // Validate choices array
  if (!Array.isArray(data.choices)) {
    throw new Error('Invalid response: choices must be an array');
  }

  // CRITICAL: Validate exactly 4 choices
  if (data.choices.length !== 4) {
    throw new Error(
      `Invalid response: must have exactly 4 choices, got ${data.choices.length}`
    );
  }

  // Validate each choice
  const expectedLabels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  const validatedChoices: Choice[] = data.choices.map((choice: any, index: number) => {
    const expectedLabel = expectedLabels[index];

    if (choice.label !== expectedLabel) {
      throw new Error(
        `Invalid choice label at index ${index}: expected ${expectedLabel}, got ${choice.label}`
      );
    }

    if (!choice.description || typeof choice.description !== 'string') {
      throw new Error(`Invalid choice description at index ${index}`);
    }

    const validRiskLevels = ['low', 'medium', 'high', 'extreme'];
    if (!validRiskLevels.includes(choice.riskLevel)) {
      throw new Error(
        `Invalid risk level at index ${index}: must be one of ${validRiskLevels.join(', ')}`
      );
    }

    return {
      label: choice.label,
      description: choice.description,
      riskLevel: choice.riskLevel,
    };
  });

  // Validate stat updates
  if (!Array.isArray(data.statUpdates)) {
    throw new Error('Invalid response: statUpdates must be an array');
  }

  const validatedStatUpdates: StatUpdate[] = data.statUpdates.map(
    (update: any, index: number) => {
      if (!update.characterId || typeof update.characterId !== 'string') {
        throw new Error(`Invalid characterId in stat update at index ${index}`);
      }

      if (!update.changes || typeof update.changes !== 'object') {
        throw new Error(`Invalid changes object in stat update at index ${index}`);
      }

      // Validate optional fields if present
      if (update.changes.hp !== undefined && typeof update.changes.hp !== 'number') {
        throw new Error(`Invalid hp in stat update at index ${index}`);
      }

      if (update.changes.level !== undefined && typeof update.changes.level !== 'number') {
        throw new Error(`Invalid level in stat update at index ${index}`);
      }

      if (update.changes.attributes !== undefined) {
        if (typeof update.changes.attributes !== 'object') {
          throw new Error(`Invalid attributes in stat update at index ${index}`);
        }
      }

      if (update.changes.statuses !== undefined) {
        if (!Array.isArray(update.changes.statuses)) {
          throw new Error(`Invalid statuses in stat update at index ${index}`);
        }
      }

      if (update.changes.newPerks !== undefined) {
        if (!Array.isArray(update.changes.newPerks)) {
          throw new Error(`Invalid newPerks in stat update at index ${index}`);
        }
      }

      return {
        characterId: update.characterId,
        changes: update.changes,
      };
    }
  );

  return {
    success: true,
    narrative: data.narrative,
    choices: validatedChoices,
    statUpdates: validatedStatUpdates,
    validationError: null,
  };
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

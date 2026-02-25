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

  // Format all characters with VERY CLEAR ID labeling
  const allCharactersText = allCharacters.map(char => {
    const status = char.powerSheet.hp <= 0 ? ' [DEAD]' : '';
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHARACTER: ${char.name} (${char.displayName})${status}
⚠️  IMPORTANT - USE THIS ID IN statUpdates: "${char.id}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

**DIFFICULTY SCALING** (based on turn ${currentTurn}):
${currentTurn <= 10 ? '- EARLY GAME: Easier encounters, focus on learning and exploration. Enemies should be manageable.' : ''}
${currentTurn > 10 && currentTurn <= 30 ? '- MID GAME: Moderate challenge, strategic depth required. Enemies are competent and dangerous.' : ''}
${currentTurn > 30 ? '- LATE GAME: DEADLY encounters, high stakes. Enemies are extremely powerful and unforgiving. One mistake can be fatal.' : ''}

**POWER USAGE PHILOSOPHY**:
- NO RESTRICTIONS on power usage - players can use their full abilities from the start
- Characters should feel POWERFUL and capable of using all their listed abilities
- Don't artificially limit what players can do with their powers
- When players level up, create NEW creative abilities or enhance existing ones
- Be generous with power - this is a power fantasy game!

**SURRENDER & ELIMINATION MECHANICS**:
- Players can SURRENDER or GIVE UP at any time
- When a player surrenders:
  * They are immediately eliminated from the game
  * Their character dies (set HP to 0)
  * Generate a narrative describing their surrender/withdrawal
  * They cannot rejoin this game
- Players can also SELF-DESTRUCT (suicide attack):
  * Player's character dies (HP to 0)
  * If enemies/opponents are nearby, they take MASSIVE damage (40-80% of their maxHP)
  * Describe the dramatic explosion/final attack
  * This is a valid tactical choice (sacrifice for team advantage)
- Surrender keywords: "surrender", "give up", "forfeit", "quit", "withdraw"
- Self-destruct keywords: "self destruct", "suicide attack", "kamikaze", "sacrifice myself", "blow myself up"

**LEARNING & ADAPTATION**:
- Players may provide context about their universe, items, or abilities (e.g., "Compound V is a serum that...")
- LEARN and REMEMBER this information for future turns
- Incorporate player-provided lore into the narrative
- If a player explains something, treat it as canon for this game
- Be flexible and adapt to the players' creative vision

**BATTLE SCENARIOS**:
The game supports different types of encounters:

1. **PvE (Players vs Environment/Bosses)**:
   - Players work together against powerful enemies
   - Boss enemies should be challenging and require teamwork
   - Create dramatic boss battles with multiple phases
   - Bosses can have unique mechanics and weaknesses
   - Reward cooperation and strategic coordination

2. **PvP (Player vs Player)**:
   - Players can battle each other to the death
   - Treat all players as equals - no favoritism
   - Make PvP battles intense, strategic, and fair
   - Use the full damage calculation system
   - Winner takes all - loser dies (no plot armor)
   - Create dramatic arena/battlefield descriptions
   - Allow for pre-battle positioning and strategy

3. **Mixed Scenarios**:
   - Players might fight bosses together, then turn on each other
   - Environmental hazards can affect all combatants
   - Alliances can form and break
   - Betrayals should have dramatic impact

**SCENE DESCRIPTIONS**:
Adapt your narrative style to the scenario:

- **Boss Battles**: Epic, cinematic descriptions. Emphasize scale and danger. Use dramatic language.
  Example: "🔥 The ancient dragon ROARS, its flames scorching the sky! HP: 2000/2000. Its scales shimmer with dark magic..."

- **PvP Duels**: Tense, focused descriptions. Emphasize the personal stakes and tactical positioning.
  Example: "⚔️ The arena falls silent. ${activePlayer.character.name} and their opponent circle each other, weapons drawn. Only one will leave alive..."

- **Exploration**: Atmospheric, mysterious descriptions. Build tension and intrigue.
  Example: "🌙 The ancient ruins stretch before you, shadows dancing in the moonlight..."

- **Social/Roleplay**: Character-focused descriptions. Emphasize dialogue and interaction.
  Example: "💬 The tavern buzzes with activity. A hooded figure watches from the corner..."

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
   - ATTACK OTHER PLAYERS (PvP) - this is allowed and encouraged when appropriate!
3. ONLY reject actions that are:
   - Instant god-mode powers with no buildup or explanation (e.g., "I become omnipotent instantly")
   - Using highly specific abilities the character has never trained for AND has no way to learn
4. BE OPEN-MINDED about what's possible:
   - Space travel is possible for beings with flight, portals, or special powers
   - Portals, dimensions, and reality-bending exist in this universe
   - Characters can learn, grow, and gain new abilities through experience
   - Creative uses of existing powers should be encouraged
   - PvP combat is a valid and exciting part of the game
5. **DETECTING PvP SCENARIOS**:
   - If a player attacks another player character, this is PvP
   - If players are in an arena or duel scenario, expect PvP
   - If the narrative suggests "battle to the death" or "only one survives", this is PvP
   - Treat PvP with the same seriousness as boss fights
6. **HANDLING PvP COMBAT**:
   - Apply full damage calculations (no pulling punches)
   - Both players can die - no favoritism or plot armor
   - Make it dramatic and intense
   - Describe the combat cinematically
   - Winner gets the glory, loser dies (unless they flee/surrender)
   - Create arena/battlefield atmosphere
7. If the action is VALID (most should be):
   - Resolve it with appropriate consequences
   - Update character stats as needed
   - Generate narrative that flows from this action
   - Present 4 new choices (A, B, C, D) for what happens next
8. If the action is INVALID (very rare):
   - Explain why briefly
   - Require the player to choose from the A-D options below

REMEMBER: Be permissive and creative! This is a fantasy universe where almost anything is possible with the right powers or circumstances. PvP is ENCOURAGED when players want it!

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
   - **CRITICAL - HP DISPLAY**: ALWAYS show ACTUAL HP NUMBERS, NEVER percentages!
     * ✅ CORRECT: "HP: 102/120 → 34/120" or "HP: 66/120 → 0/120"
     * ❌ WRONG: "HP: 85% → 70%" or "HP: 55% → 40%"
     * NEVER use percentage symbols (%) when showing HP
     * ALWAYS use the format: currentHP/maxHP → newHP/maxHP
   - **SHOW IMPACT**: Describe how effective attacks were (e.g., "💥 IMPACT: Critical hit! Armor shattered.")
   - Continues naturally from recent events
   - Presents a situation for the active player (${activePlayer.character.name})
   - Matches the tone tags (${gameSettings.toneTags.join(', ')})
   - Respects the ${gameSettings.difficultyCurve} difficulty curve
   - Use emojis for emphasis (🔥, ⚡, 💀, ✨, 💥, etc.)
   
   NARRATIVE FORMAT EXAMPLE:
   "🔥 ${activePlayer.character.name} unleashes a devastating attack!
   
   💥 IMPACT RESULT:
   Target HP: 102/120 → 34/120 - Took 68 damage! Critical hit!
   
   The battlefield trembles as energy dissipates."
   
   ⚠️ REMINDER: Use ACTUAL HP NUMBERS (66/120), NOT percentages (55%)!

2. Present EXACTLY 4 choices (A, B, C, D):
   - Keep choice descriptions SHORT (5-10 words max)
   - Each choice should be meaningful and distinct
   - Choices should align with the active player's abilities
   - Include risk levels: low, medium, high, or extreme
   - No choice should be obviously "correct" - create interesting dilemmas
   - Consider the character's weaknesses when presenting options

3. **CRITICAL - STAT UPDATES**: You MUST generate stat updates for ALL characters affected by the narrative:
   - **WHEN DAMAGE OCCURS**: Generate stat updates for BOTH attacker AND defender
     * Attacker: May gain experience, use resources, or trigger abilities
     * Defender: MUST receive HP damage (negative hp value)
   - **⚠️ CRITICAL RULE**: ONLY damage characters that are DIRECTLY involved in the action!
     * If Player A attacks Player B, ONLY Player B takes damage
     * If Player A does something that doesn't involve Player C, Player C's HP should NOT change
     * Don't apply random damage to uninvolved characters
     * Environmental damage (explosions, traps) can affect multiple characters if they're in the area
   - **WHEN HEALING OCCURS**: Character receives HP healing (positive hp value)
   - **STATUS EFFECTS**: Apply buffs, debuffs, or conditions to affected characters
   - **LEVEL UPS**: Award level ups for significant achievements (defeating bosses, completing quests, epic moments)
   - **NEW PERKS/ABILITIES**: When leveling up, be CREATIVE and GENEROUS:
     * Create NEW abilities that fit the character's theme and recent actions
     * Enhance existing abilities with new effects or increased power
     * Grant unique perks based on how they achieved the level up
     * Examples: "Flame Mastery: Fire attacks deal 50% more damage"
     * Examples: "Battle Hardened: +20 Endurance from surviving near-death"
     * Examples: "Tactical Genius: Can predict enemy moves (advantage on defense)"
     * Don't just increase numbers - give them something FUN and POWERFUL
   - **CRITICAL**: Use the exact Character ID from the character list above, NOT the character name
   
   **DAMAGE CALCULATION GUIDELINES** - FOLLOW THESE STRICTLY:
   
   ⚠️ **CRITICAL RULES**:
   1. DO NOT use fixed damage values like -15 HP! Calculate based on percentages of maxHP!
   2. In your narrative, ALWAYS show ACTUAL HP NUMBERS (66/120), NEVER percentages (55%)!
   3. Format: "HP: 66/120 → 0/120" NOT "HP: 55% → 0%"
   
   **STEP-BY-STEP DAMAGE CALCULATION**:
   
   1. **Determine Base Damage** (as % of target's maxHP):
      - Weak/Glancing hit: 5-10% of maxHP
      - Normal hit: 10-20% of maxHP
      - Strong hit: 20-35% of maxHP
      - Critical/Devastating hit: 35-50% of maxHP
      - Ultimate/Finishing move: 50-80% of maxHP
   
   2. **Apply Attribute Modifiers**:
      - Check attacker's relevant attribute (Strength/Intelligence/etc.)
      - Check defender's Endurance
      - High attacker attribute (70+): Multiply damage by 1.3-1.4
      - Low attacker attribute (<40): Multiply damage by 0.7-0.8
      - High defender Endurance (70+): Multiply damage by 0.7-0.75
      - Low defender Endurance (<40): Multiply damage by 1.2-1.3
   
   3. **Check for Weakness Exploitation** (MOST IMPORTANT):
      - Does the attack exploit the target's listed weakness?
      - If YES: Multiply damage by 1.5-2.0 (50-100% bonus!)
      - Example: Water attack on fire-weak character = MASSIVE damage
      - Example: Drowning attack on Charizard (fire type) = DEVASTATING
   
   4. **Apply Action Context**:
      - Surprise attack/defenseless target: +20-30%
      - All-out desperate attack: +30-40%
      - Environmental advantage: +20-30%
   
   5. **Apply Difficulty Curve**:
      - Easy: Multiply by 0.8
      - Medium: No change
      - Hard: Multiply by 1.2
      - Brutal: Multiply by 1.4
   
   **EXAMPLE CALCULATION** (Blastoise drowning Charizard):
   - Charizard maxHP: 120, Weakness: "Fire type (weak to water)"
   - Blastoise Strength: 80 (high), Charizard Endurance: 45 (medium)
   - Action: Drowning (water attack on fire-weak target, surprise attack)
   
   Step 1: Base = 25% of 120 = 30 HP (strong hit)
   Step 2: High Strength = 30 × 1.35 = 40.5 HP
   Step 3: WEAKNESS EXPLOIT (water vs fire) = 40.5 × 1.75 = 71 HP
   Step 4: Surprise/defenseless = 71 × 1.25 = 89 HP
   Step 5: Medium difficulty = 89 HP (no change)
   
   **FINAL DAMAGE: -89 HP** (NOT -15 HP!)
   
   This would take Charizard from 66 HP (55% of 120) to -23 HP (DEAD!)
   
   **REMEMBER**: 
   - ALWAYS calculate as percentage of maxHP first
   - ALWAYS check for weakness exploitation
   - NEVER use fixed values like -15 HP
   - Make damage feel appropriate to the action and character matchup
   - In your narrative, show ACTUAL HP numbers (e.g., "HP: 66/120 → 0/120"), NOT percentages
   - The hp value in statUpdates should be the ACTUAL damage number (e.g., -89), NOT a percentage
   e) **Difficulty Curve**:
      - Easy: Reduce damage by 20%
      - Medium: Normal damage
      - Hard: Increase damage by 20%
      - Brutal: Increase damage by 40%
   
   **EXAMPLE CALCULATIONS**:
   - Blastoise (Strength 80) uses Hydro Blast on Charizard (fire weakness, Endurance 45, maxHP 120):
     * Base: 30% of 120 = 36 HP (strong hit)
     * High Strength: +35% = 49 HP
     * Weakness exploitation: +75% = 86 HP
     * Final: -86 HP (devastating, nearly fatal)
   
   - Pikachu (Intelligence 60) uses Thunder Shock on Squirtle (Endurance 70, maxHP 150):
     * Base: 15% of 150 = 23 HP (normal hit)
     * Medium Intelligence: No modifier
     * High Endurance: -25% = 17 HP
     * Final: -17 HP (moderate damage)
   
   - Weak punch from exhausted character (Strength 30) on tank (Endurance 85, maxHP 200):
     * Base: 8% of 200 = 16 HP (weak hit)
     * Low Strength: -25% = 12 HP
     * Very High Endurance: -30% = 8 HP
     * Final: -8 HP (barely scratched)
   
   **IMPORTANT**: 
   - NEVER use fixed damage values like -15 HP for everything
   - Consider the narrative context and make damage feel appropriate
   - Weakness exploitation should be DRAMATIC and potentially decisive
   - Tank characters (high Endurance) should take noticeably less damage
   - Glass cannons (high offense, low Endurance) should take heavy damage
   - Calculate damage as a PERCENTAGE of maxHP, then apply modifiers

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
- **USE CHARACTER IDs NOT NAMES** in statUpdates (e.g., use "${allCharacters[0]?.id || 'cm...'}" not "${allCharacters[0]?.name || 'CharacterName'}")

**GAME BALANCE & FUN PRINCIPLES**:

1. **EQUAL WINNING CHANCES**: Every player should have an equal opportunity to win through smart choices
   - Don't favor any character based on their power level or backstory
   - Weaker characters can win through clever tactics and good decisions
   - Stronger characters can lose through poor choices or overconfidence
   - Victory comes from STRATEGY, not just raw power

2. **NO PLOT ARMOR**: Characters can and should die from bad decisions
   - If a player makes a reckless choice, they face real consequences
   - HP reaching 0 means death - no miraculous saves
   - Extreme risk choices can lead to instant death if they fail
   - Players must think carefully about their actions

3. **NO FAVORITISM**: Treat all characters equally
   - Don't give special treatment to any character
   - Don't make outcomes easier for characters you "like"
   - Apply the same rules and consequences to everyone
   - Let the dice (and player choices) determine outcomes

4. **UNPREDICTABILITY**: Keep outcomes interesting and non-obvious
   - Don't make the "right" choice obvious
   - Sometimes the safe choice fails, risky choices succeed
   - Add unexpected twists and complications
   - Environmental factors, luck, and timing matter
   - Even "perfect" plans can have complications

5. **SMART PLAY MATTERS**: Reward intelligent decision-making
   - Players who use their abilities cleverly should have advantages
   - Exploiting enemy weaknesses should be highly effective
   - Defensive/cautious play when low on HP should help survival
   - Creative solutions should be rewarded
   - Poor tactical choices should have consequences

6. **MAKE IT FUN**: Above all, keep the game engaging
   - Create dramatic moments and close calls
   - Give players meaningful choices with real stakes
   - Balance tension with moments of triumph
   - Make combat feel dynamic and impactful
   - Keep the pacing exciting

7. **DIFFICULTY PROGRESSION**: 
   - Early game (turns 1-10): Easier encounters, learning phase
   - Mid game (turns 11-30): Moderate challenge, strategic depth
   - Late game (turns 31+): Deadly encounters, high stakes
   - Scale enemy power and encounter difficulty with player levels
   - Give frequent stat updates and level-ups to show progression

8. **REREAD POWER SHEETS**: Before generating each turn:
   - Check current HP levels for all characters
   - Review active abilities and their power levels
   - Consider character weaknesses in the situation
   - Factor in any active status effects
   - Ensure stat updates are accurate and consistent

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
      "characterId": "USE_ACTUAL_CHARACTER_ID_FROM_ABOVE_NOT_NAME",
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
  
  console.log('Raw AI response before validation:', {
    statUpdatesCount: parsedResponse.statUpdates?.length || 0,
    statUpdates: parsedResponse.statUpdates?.map(u => ({
      characterId: u.characterId,
      changes: u.changes,
    })),
  });
  
  const validatedResponse = validateTurnResponse(parsedResponse, context);

  return validatedResponse;
}

/**
 * Validate and fix character IDs in stat updates
 * Converts character names to IDs if the AI used names instead
 */
function validateAndFixCharacterIds(
  statUpdates: StatUpdate[],
  allCharacters: DMPromptContext['allCharacters']
): StatUpdate[] {
  return statUpdates.map(update => {
    // Check if characterId looks like a name (doesn't start with 'c' and contain alphanumeric ID pattern)
    const looksLikeId = /^c[a-z0-9]{20,}$/i.test(update.characterId);
    
    if (!looksLikeId) {
      // Try to find character by name (case-insensitive)
      const matchedChar = allCharacters.find(
        char => char.name.toLowerCase() === update.characterId.toLowerCase()
      );
      
      if (matchedChar) {
        console.warn(
          `AI used character name "${update.characterId}" instead of ID. ` +
          `Auto-correcting to "${matchedChar.id}"`
        );
        return {
          ...update,
          characterId: matchedChar.id,
        };
      } else {
        console.error(
          `Could not find character matching "${update.characterId}". ` +
          `Available characters: ${allCharacters.map(c => c.name).join(', ')}`
        );
      }
    }
    
    return update;
  });
}

/**
 * Validate the AI response structure
 * 
 * **Validates: Requirement 7.4** - Exactly 4 choices labeled A, B, C, D
 */
export function validateTurnResponse(data: any, context?: DMPromptContext): TurnNarrativeResponse {
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

  // Fix character IDs if AI used names instead
  const fixedStatUpdates = context 
    ? validateAndFixCharacterIds(validatedStatUpdates, context.allCharacters)
    : validatedStatUpdates;

  return {
    success: true,
    narrative: data.narrative,
    choices: validatedChoices,
    statUpdates: fixedStatUpdates,
    validationError: null,
  };
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

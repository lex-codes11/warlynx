/**
 * AI Move Generator Service
 * Generates move options for players during their turn
 * Validates: Requirements 9.1, 9.5
 */

import OpenAI from 'openai';
import { Character, GameContext, MoveOptions } from '@/types/game-enhancements';

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

// Export for testing purposes
export function resetOpenAIClient(): void {
  openai = null;
}

// Configuration
const GENERATION_TIMEOUT_MS = 15000; // Increased from 3s to 15s
const FALLBACK_MOVES: MoveOptions = {
  A: 'Assess the situation carefully',
  B: 'Take a defensive stance',
  C: 'Attempt to negotiate',
  D: 'Act boldly and decisively',
};

/**
 * Move generation response with error handling
 */
export interface MoveGenerationResponse {
  success: boolean;
  moves: MoveOptions;
  error?: string;
}

/**
 * Raw AI response structure for move generation
 */
interface AIMoveResponse {
  A: string;
  B: string;
  C: string;
  D: string;
}

/**
 * Builds the prompt for move generation
 * Validates: Requirements 9.1
 */
function buildMovePrompt(character: Character, context: GameContext): string {
  const otherCharacters = context.characters
    .filter((c) => c.id !== character.id)
    .map((c) => `- ${c.name}: ${c.description.substring(0, 100)}...`)
    .join('\n');

  const recentActions = context.recentActions.length > 0
    ? context.recentActions.slice(-3).join('\n')
    : 'No recent actions yet.';

  return `You are a game master generating move options for a player's turn.

CURRENT CHARACTER:
Name: ${character.name}
Description: ${character.description}
Abilities: ${character.abilities.join(', ')}
Weakness: ${character.weakness}

OTHER CHARACTERS:
${otherCharacters}

CURRENT SITUATION:
${context.currentSituation}

RECENT ACTIONS:
${recentActions}

INSTRUCTIONS:
Generate 4 distinct move options (A, B, C, D) that:
1. Are appropriate for this character's abilities and personality
2. Respond to the current situation
3. Offer different strategic approaches (aggressive, defensive, creative, social)
4. Are specific and actionable (not vague)
5. Are concise (10-20 words each)
6. Create interesting narrative possibilities

MOVE VARIETY:
- Option A: Bold or aggressive action
- Option B: Cautious or defensive action
- Option C: Creative or unconventional action
- Option D: Social or diplomatic action

Return your response in the following JSON format:
{
  "A": "move option A",
  "B": "move option B",
  "C": "move option C",
  "D": "move option D"
}`;
}

/**
 * Validates the AI response structure for move generation
 */
function validateMoveResponse(data: any): MoveOptions {
  const requiredKeys = ['A', 'B', 'C', 'D'];

  for (const key of requiredKeys) {
    if (!(key in data)) {
      throw new Error(`Invalid response: missing move option ${key}`);
    }

    if (typeof data[key] !== 'string' || data[key].trim().length === 0) {
      throw new Error(`Invalid response: move option ${key} must be a non-empty string`);
    }

    // Validate length (should be concise)
    if (data[key].length > 200) {
      throw new Error(`Invalid response: move option ${key} is too long (max 200 characters)`);
    }
  }

  return {
    A: data.A.trim(),
    B: data.B.trim(),
    C: data.C.trim(),
    D: data.D.trim(),
  };
}

/**
 * Single attempt to generate moves with timeout
 */
async function attemptMoveGeneration(
  character: Character,
  context: GameContext
): Promise<MoveOptions> {
  const prompt = buildMovePrompt(character, context);

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Move generation timeout')), GENERATION_TIMEOUT_MS);
  });

  // Race between API call and timeout
  const response = await Promise.race([
    getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a game master generating move options. You must respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    }),
    timeoutPromise,
  ]);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  const parsedResponse = JSON.parse(content) as AIMoveResponse;
  return validateMoveResponse(parsedResponse);
}

/**
 * Generate 4 move options for a character's turn
 * Returns fallback moves on failure
 * 
 * **Validates: Requirements 9.1, 9.5**
 * 
 * @param character - The character taking their turn
 * @param context - Current game context
 * @returns Promise with 4 move options labeled A, B, C, D
 */
export async function generateMoves(
  character: Character,
  context: GameContext
): Promise<MoveGenerationResponse> {
  // Validate inputs
  if (!character) {
    return {
      success: false,
      moves: FALLBACK_MOVES,
      error: 'Character is required',
    };
  }

  if (!context || !context.currentSituation) {
    return {
      success: false,
      moves: FALLBACK_MOVES,
      error: 'Game context with current situation is required',
    };
  }

  try {
    const moves = await attemptMoveGeneration(character, context);
    return {
      success: true,
      moves,
    };
  } catch (error) {
    console.error('Move generation failed:', error);
    
    // Return fallback moves on any error
    return {
      success: false,
      moves: FALLBACK_MOVES,
      error: error instanceof Error ? error.message : 'Failed to generate moves',
    };
  }
}

/**
 * Get fallback moves (for testing or when AI is unavailable)
 */
export function getFallbackMoves(): MoveOptions {
  return { ...FALLBACK_MOVES };
}

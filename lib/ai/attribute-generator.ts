/**
 * AI Attribute Generator Service
 * Generates character abilities and weaknesses from descriptions
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import OpenAI from 'openai';
import { Character } from '@/types/game-enhancements';

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

// Configuration for retry logic
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

/**
 * Generated attributes response
 */
export interface GeneratedAttributes {
  abilities: string[];
  weaknesses: string[];
}

/**
 * Attribute generation response with error handling
 */
export interface AttributeGenerationResponse {
  success: boolean;
  abilities: string[];
  weaknesses: string[];
  error?: string;
}

/**
 * Raw AI response structure for attribute generation
 */
interface AIAttributeResponse {
  abilities: string[];
  weaknesses: string[];
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Builds the prompt for attribute generation from character description
 * Validates: Requirements 2.1, 2.2
 */
function buildAttributePrompt(description: string): string {
  return `You are a game master analyzing a character description to derive their abilities and weaknesses.

CHARACTER DESCRIPTION:
"${description}"

INSTRUCTIONS:
1. Analyze the character description carefully
2. Derive 3-5 abilities that naturally emerge from the description
   - Abilities should be specific and actionable
   - Each ability should be a concise phrase (5-10 words)
   - Abilities should reflect the character's strengths, skills, or powers
   - Consider physical, mental, social, and supernatural aspects

3. Derive 2-3 weaknesses that balance the character
   - Weaknesses should be meaningful limitations
   - Each weakness should be a concise phrase (5-10 words)
   - Weaknesses can be physical, mental, emotional, or situational
   - Weaknesses should create interesting gameplay challenges

EXAMPLES:
Description: "A nimble thief with a silver tongue and a dark past"
Abilities: ["Stealth and lockpicking", "Persuasive negotiation", "Quick reflexes", "Street knowledge"]
Weaknesses: ["Haunted by past mistakes", "Distrusts authority", "Physically weak"]

Description: "An ancient dragon who hoards knowledge instead of gold"
Abilities: ["Vast magical knowledge", "Flight and fire breath", "Centuries of wisdom", "Intimidating presence"]
Weaknesses: ["Obsessed with learning", "Physically slow on ground", "Arrogant"]

Return your response in the following JSON format:
{
  "abilities": ["ability 1", "ability 2", "ability 3", ...],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3", ...]
}`;
}

/**
 * Builds the prompt for fusion attribute generation
 * Validates: Requirement 2.3
 */
function buildFusionPrompt(char1: Character, char2: Character): string {
  return `You are a game master creating a fusion character from two existing characters.

CHARACTER 1: ${char1.name}
Description: ${char1.description}
Abilities: ${char1.abilities.join(', ')}
Weakness: ${char1.weakness}

CHARACTER 2: ${char2.name}
Description: ${char2.description}
Abilities: ${char2.abilities.join(', ')}
Weakness: ${char2.weakness}

INSTRUCTIONS:
1. Create a fusion that combines elements from both characters
2. Derive 4-6 abilities that:
   - Blend or combine abilities from both characters
   - Create synergies between their powers
   - May introduce new abilities from the fusion itself
   - Should be more powerful than either character alone

3. Derive 2-4 weaknesses that:
   - May combine weaknesses from both characters
   - May introduce new weaknesses from the fusion
   - Should balance the increased power
   - Create interesting gameplay challenges

FUSION RULES:
- The fusion should feel like a natural combination
- Complementary abilities should synergize
- Conflicting traits should create interesting tensions
- The result should be greater than the sum of its parts

Return your response in the following JSON format:
{
  "abilities": ["ability 1", "ability 2", "ability 3", ...],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3", ...]
}`;
}

/**
 * Validates the AI response structure for attribute generation
 */
function validateAttributeResponse(data: any): GeneratedAttributes {
  // Validate abilities array
  if (!Array.isArray(data.abilities)) {
    throw new Error('Invalid response: abilities must be an array');
  }

  if (data.abilities.length < 3 || data.abilities.length > 6) {
    throw new Error(
      `Invalid response: must have 3-6 abilities, got ${data.abilities.length}`
    );
  }

  // Validate each ability is a string
  data.abilities.forEach((ability: any, index: number) => {
    if (typeof ability !== 'string' || ability.trim().length === 0) {
      throw new Error(`Invalid ability at index ${index}: must be a non-empty string`);
    }
  });

  // Validate weaknesses array
  if (!Array.isArray(data.weaknesses)) {
    throw new Error('Invalid response: weaknesses must be an array');
  }

  if (data.weaknesses.length < 2 || data.weaknesses.length > 4) {
    throw new Error(
      `Invalid response: must have 2-4 weaknesses, got ${data.weaknesses.length}`
    );
  }

  // Validate each weakness is a string
  data.weaknesses.forEach((weakness: any, index: number) => {
    if (typeof weakness !== 'string' || weakness.trim().length === 0) {
      throw new Error(`Invalid weakness at index ${index}: must be a non-empty string`);
    }
  });

  return {
    abilities: data.abilities.map((a: string) => a.trim()),
    weaknesses: data.weaknesses.map((w: string) => w.trim()),
  };
}

/**
 * Single attempt to generate attributes from description
 */
async function attemptAttributeGeneration(
  description: string
): Promise<GeneratedAttributes> {
  const prompt = buildAttributePrompt(description);

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a game master analyzing character descriptions. You must respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  const parsedResponse = JSON.parse(content) as AIAttributeResponse;
  return validateAttributeResponse(parsedResponse);
}

/**
 * Single attempt to generate fusion attributes
 */
async function attemptFusionGeneration(
  char1: Character,
  char2: Character
): Promise<GeneratedAttributes> {
  const prompt = buildFusionPrompt(char1, char2);

  const response = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a game master creating fusion characters. You must respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 600,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  const parsedResponse = JSON.parse(content) as AIAttributeResponse;
  return validateAttributeResponse(parsedResponse);
}

/**
 * Generate character abilities and weaknesses from description
 * Implements retry logic with exponential backoff (3 attempts)
 * 
 * **Validates: Requirements 2.1, 2.2**
 * 
 * @param description - Character description (max 1000 characters)
 * @returns Promise with generated abilities and weaknesses
 */
export async function generateAttributes(
  description: string
): Promise<AttributeGenerationResponse> {
  // Validate description
  if (!description || description.trim().length === 0) {
    return {
      success: false,
      abilities: [],
      weaknesses: [],
      error: 'Description cannot be empty',
    };
  }

  if (description.length > 1000) {
    return {
      success: false,
      abilities: [],
      weaknesses: [],
      error: 'Description exceeds maximum length of 1000 characters',
    };
  }

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await attemptAttributeGeneration(description);
      return {
        success: true,
        abilities: result.abilities,
        weaknesses: result.weaknesses,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Attribute generation attempt ${attempt + 1} failed:`,
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
    abilities: [],
    weaknesses: [],
    error: lastError?.message || 'Failed to generate attributes after 3 attempts',
  };
}

/**
 * Generate fusion attributes from two characters
 * Implements retry logic with exponential backoff (3 attempts)
 * 
 * **Validates: Requirement 2.3**
 * 
 * @param char1 - First character to fuse
 * @param char2 - Second character to fuse
 * @returns Promise with generated fusion abilities and weaknesses
 */
export async function generateFusionAttributes(
  char1: Character,
  char2: Character
): Promise<AttributeGenerationResponse> {
  // Validate characters
  if (!char1 || !char2) {
    return {
      success: false,
      abilities: [],
      weaknesses: [],
      error: 'Both characters are required for fusion',
    };
  }

  if (!char1.abilities || char1.abilities.length === 0) {
    return {
      success: false,
      abilities: [],
      weaknesses: [],
      error: 'Character 1 must have abilities',
    };
  }

  if (!char2.abilities || char2.abilities.length === 0) {
    return {
      success: false,
      abilities: [],
      weaknesses: [],
      error: 'Character 2 must have abilities',
    };
  }

  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await attemptFusionGeneration(char1, char2);
      return {
        success: true,
        abilities: result.abilities,
        weaknesses: result.weaknesses,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Fusion attribute generation attempt ${attempt + 1} failed:`,
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
    abilities: [],
    weaknesses: [],
    error: lastError?.message || 'Failed to generate fusion attributes after 3 attempts',
  };
}

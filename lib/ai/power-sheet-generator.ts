import OpenAI from "openai";
import { PowerSheet, Ability } from "../types";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration for retry logic
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

interface CharacterInput {
  name: string;
  fusionIngredients: string;
  description: string;
  abilities: string[];
  weakness: string;
  alignment?: string | null;
  archetype?: string | null;
  tags?: string[];
}

interface PowerSheetGenerationResult {
  success: boolean;
  powerSheet?: PowerSheet;
  error?: string;
}

/**
 * Generate a Power Sheet for a character using GPT-4
 * Implements retry logic with exponential backoff
 */
export async function generatePowerSheet(
  character: CharacterInput
): Promise<PowerSheetGenerationResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const powerSheet = await attemptPowerSheetGeneration(character);
      return { success: true, powerSheet };
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Power Sheet generation attempt ${attempt + 1} failed:`,
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
    error: lastError?.message || "Failed to generate Power Sheet after multiple attempts",
  };
}

/**
 * Single attempt to generate a Power Sheet
 */
async function attemptPowerSheetGeneration(
  character: CharacterInput
): Promise<PowerSheet> {
  const prompt = buildPowerSheetPrompt(character);

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You are a game master creating balanced character sheets for a multiplayer narrative game. You must respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from OpenAI");
  }

  const parsedResponse = JSON.parse(content);
  const powerSheet = validateAndNormalizePowerSheet(parsedResponse, character);

  return powerSheet;
}

/**
 * Build the GPT-4 prompt for Power Sheet generation
 */
function buildPowerSheetPrompt(character: CharacterInput): string {
  return `You are a game master creating a balanced character for a multiplayer narrative game.

Character Information:
- Name: ${character.name}
- Fusion Ingredients: ${character.fusionIngredients}
- Description: ${character.description}
- Abilities: ${character.abilities.join(", ")}
- Weakness: ${character.weakness}
${character.alignment ? `- Alignment: ${character.alignment}` : ""}
${character.archetype ? `- Archetype: ${character.archetype}` : ""}
${character.tags && character.tags.length > 0 ? `- Tags: ${character.tags.join(", ")}` : ""}

Generate a normalized Power Sheet with:
1. Starting level (always 1)
2. HP and maxHP (balanced for level 1, typically 50-150 based on character type)
3. Attributes (strength, agility, intelligence, charisma, endurance) - each 1-100, total should be approximately 250
4. Detailed ability descriptions with power levels (1-10 scale) - one for each ability listed above
5. Weakness description (expand on the provided weakness)
6. Empty statuses array (filled during gameplay)
7. Empty perks array (filled during gameplay)

CRITICAL RULES:
- Ensure the character is balanced and not overpowered
- The fusion ingredients should influence the stats and abilities
- Maintain game balance - no single attribute should exceed 80 at level 1
- Each ability should have a clear description and appropriate power level
- Power levels should reflect the ability's strength (1-3: weak, 4-6: moderate, 7-9: strong, 10: ultimate)
- Consider cooldowns for powerful abilities (in turns, or null for no cooldown)

Return JSON in this exact format:
{
  "level": 1,
  "hp": <number between 50-150>,
  "maxHp": <same as hp>,
  "attributes": {
    "strength": <number 1-100>,
    "agility": <number 1-100>,
    "intelligence": <number 1-100>,
    "charisma": <number 1-100>,
    "endurance": <number 1-100>
  },
  "abilities": [
    {
      "name": "<ability name>",
      "description": "<detailed description>",
      "powerLevel": <number 1-10>,
      "cooldown": <number or null>
    }
  ],
  "weakness": "<expanded weakness description>",
  "statuses": [],
  "perks": []
}`;
}

/**
 * Validate and normalize the AI-generated Power Sheet
 */
function validateAndNormalizePowerSheet(
  data: any,
  character: CharacterInput
): PowerSheet {
  // Validate required fields
  if (typeof data.level !== "number" || data.level !== 1) {
    throw new Error("Invalid level: must be 1");
  }

  if (typeof data.hp !== "number" || data.hp < 1 || data.hp > 1000) {
    throw new Error("Invalid HP: must be between 1 and 1000");
  }

  if (typeof data.maxHp !== "number" || data.maxHp !== data.hp) {
    throw new Error("Invalid maxHp: must equal hp at level 1");
  }

  // Validate attributes
  if (!data.attributes || typeof data.attributes !== "object") {
    throw new Error("Missing or invalid attributes");
  }

  const requiredAttributes = [
    "strength",
    "agility",
    "intelligence",
    "charisma",
    "endurance",
  ];
  for (const attr of requiredAttributes) {
    const value = data.attributes[attr];
    if (typeof value !== "number" || value < 1 || value > 100) {
      throw new Error(`Invalid ${attr}: must be between 1 and 100`);
    }
  }

  // Validate total attributes are balanced
  const totalAttributes = Object.values(data.attributes).reduce(
    (sum: number, val: any) => sum + val,
    0
  );
  if (totalAttributes < 200 || totalAttributes > 300) {
    throw new Error(
      `Unbalanced attributes: total is ${totalAttributes}, should be between 200 and 300`
    );
  }

  // Validate abilities
  if (!Array.isArray(data.abilities) || data.abilities.length === 0) {
    throw new Error("Missing or invalid abilities array");
  }

  if (data.abilities.length !== character.abilities.length) {
    throw new Error(
      `Ability count mismatch: expected ${character.abilities.length}, got ${data.abilities.length}`
    );
  }

  const validatedAbilities: Ability[] = data.abilities.map((ability: any, index: number) => {
    if (!ability.name || typeof ability.name !== "string") {
      throw new Error(`Invalid ability name at index ${index}`);
    }
    if (!ability.description || typeof ability.description !== "string") {
      throw new Error(`Invalid ability description at index ${index}`);
    }
    if (
      typeof ability.powerLevel !== "number" ||
      ability.powerLevel < 1 ||
      ability.powerLevel > 10
    ) {
      throw new Error(
        `Invalid ability powerLevel at index ${index}: must be between 1 and 10`
      );
    }
    if (ability.cooldown !== null && typeof ability.cooldown !== "number") {
      throw new Error(`Invalid ability cooldown at index ${index}`);
    }

    return {
      name: ability.name,
      description: ability.description,
      powerLevel: ability.powerLevel,
      cooldown: ability.cooldown,
    };
  });

  // Validate weakness
  if (!data.weakness || typeof data.weakness !== "string") {
    throw new Error("Missing or invalid weakness");
  }

  // Validate statuses and perks arrays
  if (!Array.isArray(data.statuses)) {
    throw new Error("Invalid statuses: must be an array");
  }
  if (!Array.isArray(data.perks)) {
    throw new Error("Invalid perks: must be an array");
  }

  // Return validated Power Sheet
  return {
    level: data.level,
    hp: data.hp,
    maxHp: data.maxHp,
    attributes: {
      strength: data.attributes.strength,
      agility: data.attributes.agility,
      intelligence: data.attributes.intelligence,
      charisma: data.attributes.charisma,
      endurance: data.attributes.endurance,
    },
    abilities: validatedAbilities,
    weakness: data.weakness,
    statuses: data.statuses,
    perks: data.perks,
  };
}

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

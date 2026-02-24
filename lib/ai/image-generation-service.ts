/**
 * Image Generation Service
 * Handles character image generation and appearance change detection
 * Validates: Requirements 14.1, 14.2, 14.3, 14.5
 */

import { generateCharacterImage } from './image-generator';
import { Character, AppearanceChange } from '@/types/game-enhancements';

// Configuration
const IMAGE_GENERATION_TIMEOUT_MS = 10000;

// Appearance change keywords to detect in narrative
const APPEARANCE_KEYWORDS = [
  // Physical transformations
  'transform', 'transforms', 'transformed', 'transforming',
  'change', 'changes', 'changed', 'changing',
  'morph', 'morphs', 'morphed', 'morphing',
  'shift', 'shifts', 'shifted', 'shifting',
  'evolve', 'evolves', 'evolved', 'evolving',
  'mutate', 'mutates', 'mutated', 'mutating',
  
  // Appearance alterations
  'appearance', 'look', 'looks', 'looking',
  'become', 'becomes', 'became', 'becoming',
  'turn into', 'turns into', 'turned into',
  
  // Body changes
  'grow', 'grows', 'grew', 'grown', 'growing',
  'shrink', 'shrinks', 'shrank', 'shrinking',
  'expand', 'expands', 'expanded', 'expanding',
  
  // Color/texture changes
  'glow', 'glows', 'glowed', 'glowing',
  'shimmer', 'shimmers', 'shimmered', 'shimmering',
  'fade', 'fades', 'faded', 'fading',
  'darken', 'darkens', 'darkened', 'darkening',
  'brighten', 'brightens', 'brightened', 'brightening',
  
  // Clothing/equipment
  'wear', 'wears', 'wore', 'wearing',
  'don', 'dons', 'donned', 'donning',
  'equip', 'equips', 'equipped', 'equipping',
  
  // Magical/supernatural
  'enchant', 'enchants', 'enchanted', 'enchanting',
  'curse', 'curses', 'cursed', 'cursing',
  'bless', 'blesses', 'blessed', 'blessing',
  'possess', 'possesses', 'possessed', 'possessing',
];

/**
 * Detects appearance changes in narrative text
 * 
 * **Validates: Requirement 14.1**
 * 
 * @param narrative - The narrative text to analyze
 * @returns AppearanceChange object with detection result
 */
export function detectAppearanceChange(narrative: string): AppearanceChange {
  if (!narrative || narrative.trim().length === 0) {
    return { detected: false };
  }

  const lowerNarrative = narrative.toLowerCase();
  const detectedKeywords: string[] = [];

  // Check for appearance keywords
  for (const keyword of APPEARANCE_KEYWORDS) {
    if (lowerNarrative.includes(keyword)) {
      detectedKeywords.push(keyword);
    }
  }

  if (detectedKeywords.length === 0) {
    return { detected: false };
  }

  // Extract a description of the change (context around keywords)
  const sentences = narrative.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const relevantSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return detectedKeywords.some(keyword => lowerSentence.includes(keyword));
  });

  const description = relevantSentences.join('. ').trim();

  return {
    detected: true,
    description: description || narrative,
    keywords: detectedKeywords,
  };
}

/**
 * Generates a character image from description
 * 
 * **Validates: Requirements 14.2, 14.5**
 * 
 * @param description - Character description
 * @param characterId - Optional character ID for tracking
 * @returns Promise with image URL
 */
export async function generateCharacterImageFromDescription(
  description: string,
  characterId?: string
): Promise<string> {
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('Image generation timeout')),
      IMAGE_GENERATION_TIMEOUT_MS
    );
  });

  try {
    // Race between image generation and timeout
    const result = await Promise.race([
      generateCharacterImage({
        name: characterId || 'Character',
        fusionIngredients: 'Original',
        description,
      }),
      timeoutPromise,
    ]);

    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || 'Failed to generate image');
    }

    return result.imageUrl;
  } catch (error) {
    console.error('Image generation failed:', error);
    
    // Return placeholder image on failure
    return '/placeholder-character.png';
  }
}

/**
 * Regenerates a character image based on appearance change
 * 
 * **Validates: Requirements 14.2, 14.3**
 * 
 * @param character - The character to regenerate image for
 * @param changeDescription - Description of the appearance change
 * @returns Promise with new image URL
 */
export async function regenerateCharacterImage(
  character: Character,
  changeDescription: string
): Promise<string> {
  // Build updated description incorporating the change
  const updatedDescription = `${character.description}. ${changeDescription}`;

  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('Image regeneration timeout')),
      IMAGE_GENERATION_TIMEOUT_MS
    );
  });

  try {
    // Race between image generation and timeout
    const result = await Promise.race([
      generateCharacterImage({
        name: character.name,
        fusionIngredients: character.fusionIngredients,
        description: updatedDescription,
        alignment: character.alignment,
        archetype: character.archetype,
        tags: character.tags,
      }),
      timeoutPromise,
    ]);

    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || 'Failed to regenerate image');
    }

    return result.imageUrl;
  } catch (error) {
    console.error('Image regeneration failed:', error);
    
    // Return existing image on failure
    return character.imageUrl;
  }
}

/**
 * Checks if a narrative contains appearance changes for a specific character
 * 
 * @param narrative - The narrative text
 * @param characterName - The character's name to check for
 * @returns boolean indicating if the character's appearance changed
 */
export function characterAppearanceChanged(
  narrative: string,
  characterName: string
): boolean {
  if (!narrative || !characterName) {
    return false;
  }

  const lowerNarrative = narrative.toLowerCase();
  const lowerName = characterName.toLowerCase();

  // Check if character name is mentioned
  if (!lowerNarrative.includes(lowerName)) {
    return false;
  }

  // Check if appearance keywords are present
  const appearanceChange = detectAppearanceChange(narrative);
  return appearanceChange.detected;
}

/**
 * Extracts appearance change description for a specific character
 * 
 * @param narrative - The narrative text
 * @param characterName - The character's name
 * @returns Description of the appearance change or null
 */
export function extractCharacterAppearanceChange(
  narrative: string,
  characterName: string
): string | null {
  if (!characterAppearanceChanged(narrative, characterName)) {
    return null;
  }

  const appearanceChange = detectAppearanceChange(narrative);
  return appearanceChange.description || null;
}

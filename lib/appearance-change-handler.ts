/**
 * Appearance Change Handler
 * Monitors narrative updates and triggers image regeneration
 * Validates: Requirements 14.1, 14.4
 */

import { prisma } from './prisma';
import {
  detectAppearanceChange,
  regenerateCharacterImage,
  characterAppearanceChanged,
  extractCharacterAppearanceChange,
} from './ai/image-generation-service';
import { broadcastEvent } from './realtime/broadcast';

/**
 * Processes narrative text for appearance changes
 * Checks all characters in the game for appearance changes
 * Triggers image regeneration and broadcasts updates
 * 
 * **Validates: Requirements 14.1, 14.4**
 * 
 * @param gameId - The game session ID
 * @param narrative - The narrative text to analyze
 */
export async function processNarrativeForAppearanceChanges(
  gameId: string,
  narrative: string
): Promise<void> {
  if (!narrative || narrative.trim().length === 0) {
    return;
  }

  // First check if there are any appearance keywords at all
  const appearanceChange = detectAppearanceChange(narrative);
  if (!appearanceChange.detected) {
    return; // No appearance changes detected
  }

  console.log('Appearance change detected in narrative:', {
    keywords: appearanceChange.keywords,
    description: appearanceChange.description?.substring(0, 100),
  });

  // Get all characters in the game
  const characters = await prisma.character.findMany({
    where: { gameId },
    select: {
      id: true,
      name: true,
      description: true,
      fusionIngredients: true,
      abilities: true,
      weakness: true,
      alignment: true,
      archetype: true,
      tags: true,
      imageUrl: true,
    },
  });

  if (characters.length === 0) {
    return;
  }

  // Check each character for appearance changes
  const updatePromises = characters.map(async (character) => {
    // Check if this character's appearance changed
    if (!characterAppearanceChanged(narrative, character.name)) {
      return null;
    }

    console.log(`Appearance change detected for character: ${character.name}`);

    // Extract the specific change description
    const changeDescription = extractCharacterAppearanceChange(narrative, character.name);
    if (!changeDescription) {
      return null;
    }

    try {
      // Regenerate the character image
      const newImageUrl = await regenerateCharacterImage(
        {
          id: character.id,
          gameId,
          userId: '', // Not needed for regeneration
          name: character.name,
          fusionIngredients: character.fusionIngredients,
          description: character.description,
          abilities: character.abilities as string[],
          weakness: character.weakness,
          alignment: character.alignment,
          archetype: character.archetype,
          tags: character.tags as string[],
          imageUrl: character.imageUrl,
          imagePrompt: '', // Not needed for regeneration
          isReady: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          powerSheet: {} as any, // Not needed for regeneration
        },
        changeDescription
      );

      // Update character record with new image URL
      await prisma.character.update({
        where: { id: character.id },
        data: {
          imageUrl: newImageUrl,
          updatedAt: new Date(),
        },
      });

      console.log(`Updated image for character ${character.name}: ${newImageUrl}`);

      // Broadcast image update to all players (Requirement 14.4)
      await broadcastEvent(gameId, 'image:updated', {
        characterId: character.id,
        characterName: character.name,
        imageUrl: newImageUrl,
      });

      return {
        characterId: character.id,
        characterName: character.name,
        newImageUrl,
      };
    } catch (error) {
      console.error(`Failed to regenerate image for character ${character.name}:`, error);
      return null;
    }
  });

  // Wait for all updates to complete
  const results = await Promise.all(updatePromises);
  const successfulUpdates = results.filter((r) => r !== null);

  if (successfulUpdates.length > 0) {
    console.log(`Successfully updated ${successfulUpdates.length} character image(s)`);
  }
}

/**
 * Hook to be called after narrative generation
 * Integrates with the game loop to monitor for appearance changes
 * 
 * @param gameId - The game session ID
 * @param narrative - The newly generated narrative
 */
export async function onNarrativeGenerated(
  gameId: string,
  narrative: string
): Promise<void> {
  // Process in background to avoid blocking the game loop
  processNarrativeForAppearanceChanges(gameId, narrative).catch((error) => {
    console.error('Error processing appearance changes:', error);
  });
}

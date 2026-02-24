/**
 * Character Mutation Functions
 * 
 * This module provides functions for updating character attributes with
 * optimistic updates and real-time synchronization.
 * 
 * Requirements:
 * - 3.3: Real-time character updates
 * - 3.4: Persist character changes immediately upon edit
 */

import { prisma } from './prisma';
import { broadcastCharacterUpdate } from './realtime/broadcast';
import type { Character } from '@/types/game-enhancements';
import type { Character as PrismaCharacter } from '@prisma/client';

/**
 * Convert Prisma Character to app Character type
 */
function toCharacter(prismaCharacter: PrismaCharacter): Character {
  return prismaCharacter as unknown as Character;
}

/**
 * Update character description
 * 
 * @param characterId - Character ID to update
 * @param description - New description (max 1000 characters)
 * @returns Updated character
 */
export async function updateCharacterDescription(
  characterId: string,
  description: string
): Promise<Character> {
  // Validate description length
  if (description.length > 1000) {
    throw new Error('Description must be 1000 characters or less');
  }

  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      description,
      updatedAt: new Date(),
    },
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Update character abilities
 * 
 * @param characterId - Character ID to update
 * @param abilities - New abilities array
 * @returns Updated character
 */
export async function updateCharacterAbilities(
  characterId: string,
  abilities: string[]
): Promise<Character> {
  // Validate abilities
  if (!Array.isArray(abilities)) {
    throw new Error('Abilities must be an array');
  }

  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      abilities,
      updatedAt: new Date(),
    },
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Update character weakness
 * 
 * @param characterId - Character ID to update
 * @param weakness - New weakness
 * @returns Updated character
 */
export async function updateCharacterWeakness(
  characterId: string,
  weakness: string
): Promise<Character> {
  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      weakness,
      updatedAt: new Date(),
    },
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Update character name
 * 
 * @param characterId - Character ID to update
 * @param name - New name
 * @returns Updated character
 */
export async function updateCharacterName(
  characterId: string,
  name: string
): Promise<Character> {
  // Validate name
  if (!name || name.trim().length === 0) {
    throw new Error('Name cannot be empty');
  }

  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      name: name.trim(),
      updatedAt: new Date(),
    },
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Update character power sheet (stats)
 * 
 * @param characterId - Character ID to update
 * @param powerSheet - New power sheet data
 * @returns Updated character
 */
export async function updateCharacterPowerSheet(
  characterId: string,
  powerSheet: any
): Promise<Character> {
  // Validate power sheet structure
  if (!powerSheet || typeof powerSheet !== 'object') {
    throw new Error('Invalid power sheet data');
  }

  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      powerSheet,
      updatedAt: new Date(),
    },
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Update multiple character attributes at once
 * 
 * @param characterId - Character ID to update
 * @param updates - Object containing fields to update
 * @returns Updated character
 */
export async function updateCharacterAttributes(
  characterId: string,
  updates: {
    name?: string;
    description?: string;
    abilities?: string[];
    weakness?: string;
    powerSheet?: any;
    alignment?: string | null;
    archetype?: string | null;
    tags?: string[];
  }
): Promise<Character> {
  // Validate updates
  if (updates.description && updates.description.length > 1000) {
    throw new Error('Description must be 1000 characters or less');
  }

  if (updates.name && updates.name.trim().length === 0) {
    throw new Error('Name cannot be empty');
  }

  if (updates.abilities && !Array.isArray(updates.abilities)) {
    throw new Error('Abilities must be an array');
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  if (updates.abilities !== undefined) {
    updateData.abilities = updates.abilities;
  }
  if (updates.weakness !== undefined) {
    updateData.weakness = updates.weakness;
  }
  if (updates.powerSheet !== undefined) {
    updateData.powerSheet = updates.powerSheet;
  }
  if (updates.alignment !== undefined) {
    updateData.alignment = updates.alignment;
  }
  if (updates.archetype !== undefined) {
    updateData.archetype = updates.archetype;
  }
  if (updates.tags !== undefined) {
    updateData.tags = updates.tags;
  }

  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: updateData,
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Update character ready state
 * 
 * @param characterId - Character ID to update
 * @param isReady - Ready state
 * @returns Updated character
 */
export async function updateCharacterReadyState(
  characterId: string,
  isReady: boolean
): Promise<Character> {
  // Update character in database
  const updatedCharacter = await prisma.character.update({
    where: { id: characterId },
    data: {
      isReady,
      updatedAt: new Date(),
    } as any, // Type assertion needed until Prisma client is regenerated with isReady field
  });

  // Broadcast update to all clients in the game
  await broadcastCharacterUpdate(updatedCharacter.gameId, updatedCharacter);

  return toCharacter(updatedCharacter);
}

/**
 * Get character by ID
 * 
 * @param characterId - Character ID
 * @returns Character or null if not found
 */
export async function getCharacter(characterId: string): Promise<Character | null> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  return character ? toCharacter(character) : null;
}

/**
 * Check if user can edit character
 * User can edit if:
 * - They own the character
 * - Character is not marked as ready
 * 
 * @param characterId - Character ID
 * @param userId - User ID
 * @returns True if user can edit
 */
export async function canEditCharacter(
  characterId: string,
  userId: string
): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      userId: true,
      isReady: true,
    } as any, // Type assertion needed until Prisma client is regenerated with isReady field
  }) as { userId: string; isReady: boolean } | null;

  if (!character) {
    return false;
  }

  // User must own the character and it must not be ready
  return character.userId === userId && !character.isReady;
}

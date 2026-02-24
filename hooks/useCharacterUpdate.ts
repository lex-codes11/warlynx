/**
 * Character Update Hook
 * 
 * Provides functions for updating character attributes with optimistic updates
 * and real-time synchronization.
 * 
 * Requirements:
 * - 3.3: Real-time character updates
 * - 3.4: Persist character changes immediately upon edit
 */

import { useState, useCallback } from 'react';
import type { Character } from '@/types/game-enhancements';

interface UpdateCharacterParams {
  characterId: string;
  updates: {
    name?: string;
    description?: string;
    abilities?: string[];
    weakness?: string;
    powerSheet?: any;
    alignment?: string | null;
    archetype?: string | null;
    tags?: string[];
  };
}

interface UseCharacterUpdateResult {
  updateCharacter: (params: UpdateCharacterParams) => Promise<Character>;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for updating character attributes with optimistic updates
 * 
 * @example
 * const { updateCharacter, isUpdating, error } = useCharacterUpdate();
 * 
 * const handleUpdate = async () => {
 *   try {
 *     const updated = await updateCharacter({
 *       characterId: 'char-123',
 *       updates: { description: 'New description' }
 *     });
 *     console.log('Updated:', updated);
 *   } catch (err) {
 *     console.error('Update failed:', err);
 *   }
 * };
 */
export function useCharacterUpdate(): UseCharacterUpdateResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCharacter = useCallback(async ({
    characterId,
    updates,
  }: UpdateCharacterParams): Promise<Character> => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/characters/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId,
          updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update character');
      }

      return data.character;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update character';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updateCharacter,
    isUpdating,
    error,
    clearError,
  };
}

/**
 * Hook for updating character with optimistic UI updates
 * 
 * This version immediately updates the local state before the server responds,
 * providing instant feedback to the user.
 * 
 * @param character - Current character state
 * @param onUpdate - Callback when character is updated
 * 
 * @example
 * const { updateCharacterOptimistic, isUpdating } = useCharacterUpdateOptimistic(
 *   character,
 *   (updated) => setCharacter(updated)
 * );
 * 
 * const handleUpdate = async () => {
 *   await updateCharacterOptimistic({
 *     description: 'New description'
 *   });
 * };
 */
export function useCharacterUpdateOptimistic(
  character: Character | null,
  onUpdate: (character: Character) => void
) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCharacterOptimistic = useCallback(async (
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
  ): Promise<void> => {
    if (!character) {
      throw new Error('No character to update');
    }

    // Store original character for rollback
    const originalCharacter = { ...character };

    // Optimistically update local state
    const optimisticCharacter: Character = {
      ...character,
      ...updates,
      updatedAt: new Date(),
    };
    onUpdate(optimisticCharacter);

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch('/api/characters/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: character.id,
          updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update character');
      }

      // Update with server response
      onUpdate(data.character);
    } catch (err) {
      // Rollback on error
      onUpdate(originalCharacter);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update character';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [character, onUpdate]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    updateCharacterOptimistic,
    isUpdating,
    error,
    clearError,
  };
}

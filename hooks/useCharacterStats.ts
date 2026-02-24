/**
 * React hook for subscribing to character stats updates
 * 
 * This hook provides real-time character stats synchronization including
 * HP, level, attributes, statuses, and perks.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeGame } from './useRealtimeGame';

interface Attributes {
  strength: number;
  agility: number;
  intelligence: number;
  charisma: number;
  endurance: number;
}

interface Ability {
  name: string;
  description: string;
  powerLevel: number;
  cooldown: number | null;
}

interface Status {
  name: string;
  description: string;
  duration: number;
  effect: string;
}

interface Perk {
  name: string;
  description: string;
  unlockedAt: number;
}

interface PowerSheet {
  level: number;
  hp: number;
  maxHp: number;
  attributes: Attributes;
  abilities: Ability[];
  weakness: string;
  statuses: Status[];
  perks: Perk[];
}

interface Character {
  id: string;
  gameId: string;
  userId: string;
  name: string;
  fusionIngredients: string;
  description: string;
  imageUrl: string;
  powerSheet: PowerSheet;
  createdAt: Date;
  updatedAt: Date;
}

interface StatUpdate {
  characterId: string;
  changes: {
    hp?: number;
    level?: number;
    attributes?: Partial<Attributes>;
    statuses?: Status[];
    newPerks?: Perk[];
  };
}

interface UseCharacterStatsOptions {
  gameId: string;
  characterId?: string; // Optional: subscribe to specific character
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseCharacterStatsReturn {
  characters: Map<string, Character>;
  getCharacter: (characterId: string) => Character | undefined;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  reconnect: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for subscribing to character stats updates
 * 
 * @param options - Configuration options
 * @returns Character stats map and connection status
 * 
 * @example
 * ```tsx
 * const { characters, getCharacter, isConnected } = useCharacterStats({
 *   gameId: 'game-123',
 *   onError: (error) => console.error('Character stats error:', error),
 * });
 * 
 * const myCharacter = getCharacter('char-456');
 * 
 * if (!myCharacter) return <div>Loading...</div>;
 * 
 * return (
 *   <div>
 *     <h2>{myCharacter.name}</h2>
 *     <p>HP: {myCharacter.powerSheet.hp}/{myCharacter.powerSheet.maxHp}</p>
 *     <p>Level: {myCharacter.powerSheet.level}</p>
 *   </div>
 * );
 * ```
 */
export function useCharacterStats(options: UseCharacterStatsOptions): UseCharacterStatsReturn {
  const { gameId, characterId, enabled = true, onError } = options;

  const [characters, setCharacters] = useState<Map<string, Character>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial character stats
  const fetchCharacterStats = useCallback(async () => {
    if (!gameId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // If specific character ID is provided, fetch only that character
      if (characterId) {
        const response = await fetch(`/api/characters/${characterId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch character: ${response.statusText}`);
        }

        const data = await response.json();
        
        setCharacters(prev => {
          const newMap = new Map(prev);
          newMap.set(data.id, {
            id: data.id,
            gameId: data.gameId,
            userId: data.userId,
            name: data.name,
            fusionIngredients: data.fusionIngredients,
            description: data.description,
            imageUrl: data.imageUrl,
            powerSheet: data.powerSheet,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          });
          return newMap;
        });
      } else {
        // Fetch all characters for the game
        const response = await fetch(`/api/games/${gameId}/characters`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch characters: ${response.statusText}`);
        }

        const data = await response.json();
        
        const newMap = new Map<string, Character>();
        data.characters?.forEach((char: any) => {
          newMap.set(char.id, {
            id: char.id,
            gameId: char.gameId,
            userId: char.userId,
            name: char.name,
            fusionIngredients: char.fusionIngredients,
            description: char.description,
            imageUrl: char.imageUrl,
            powerSheet: char.powerSheet,
            createdAt: new Date(char.createdAt),
            updatedAt: new Date(char.updatedAt),
          });
        });
        
        setCharacters(newMap);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, characterId, enabled, onError]);

  // Initial fetch
  useEffect(() => {
    fetchCharacterStats();
  }, [fetchCharacterStats]);

  // Handle character updated event
  const handleCharacterUpdated = useCallback((character: any) => {
    setCharacters(prev => {
      const newMap = new Map(prev);
      newMap.set(character.id, {
        id: character.id,
        gameId: character.gameId,
        userId: character.userId,
        name: character.name,
        fusionIngredients: character.fusionIngredients,
        description: character.description,
        imageUrl: character.imageUrl,
        powerSheet: character.powerSheet,
        createdAt: new Date(character.createdAt),
        updatedAt: new Date(character.updatedAt),
      });
      return newMap;
    });
  }, []);

  // Handle stats updated event
  const handleStatsUpdated = useCallback((update: StatUpdate) => {
    setCharacters(prev => {
      const character = prev.get(update.characterId);
      if (!character) return prev;

      const newMap = new Map(prev);
      const updatedCharacter = { ...character };
      const updatedPowerSheet = { ...character.powerSheet };

      // Apply stat changes
      if (update.changes.hp !== undefined) {
        updatedPowerSheet.hp = update.changes.hp;
      }
      if (update.changes.level !== undefined) {
        updatedPowerSheet.level = update.changes.level;
      }
      if (update.changes.attributes) {
        updatedPowerSheet.attributes = {
          ...updatedPowerSheet.attributes,
          ...update.changes.attributes,
        };
      }
      if (update.changes.statuses) {
        updatedPowerSheet.statuses = update.changes.statuses;
      }
      if (update.changes.newPerks) {
        updatedPowerSheet.perks = [
          ...updatedPowerSheet.perks,
          ...update.changes.newPerks,
        ];
      }

      updatedCharacter.powerSheet = updatedPowerSheet;
      updatedCharacter.updatedAt = new Date();
      
      newMap.set(update.characterId, updatedCharacter);
      return newMap;
    });
  }, []);

  // Subscribe to real-time updates
  const { isConnected, reconnect } = useRealtimeGame({
    gameId,
    enabled,
    onCharacterUpdated: handleCharacterUpdated,
    onStatsUpdated: handleStatsUpdated,
  });

  // Helper function to get a specific character
  const getCharacter = useCallback((charId: string) => {
    return characters.get(charId);
  }, [characters]);

  return {
    characters,
    getCharacter,
    isLoading,
    error,
    isConnected,
    reconnect,
    refetch: fetchCharacterStats,
  };
}

/**
 * Character Real-time Synchronization Hook
 * 
 * Subscribes to real-time character updates and keeps local state in sync.
 * 
 * Requirements:
 * - 3.3: Real-time character updates
 * - 6.1: Real-time update propagation
 */

import { useEffect, useState, useCallback } from 'react';
import { createRealtimeClient, subscribeToGame } from '@/lib/realtime/supabase';
import type { Character } from '@/types/game-enhancements';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseCharacterSyncOptions {
  gameId: string;
  onCharacterUpdated?: (character: Character) => void;
  enabled?: boolean;
}

interface UseCharacterSyncResult {
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for subscribing to real-time character updates
 * 
 * Automatically subscribes to character updates for a specific game
 * and calls the callback when characters are updated.
 * 
 * @example
 * const { isConnected } = useCharacterSync({
 *   gameId: 'game-123',
 *   onCharacterUpdated: (character) => {
 *     console.log('Character updated:', character);
 *     // Update local state
 *   },
 * });
 */
export function useCharacterSync({
  gameId,
  onCharacterUpdated,
  enabled = true,
}: UseCharacterSyncOptions): UseCharacterSyncResult {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !gameId) {
      return;
    }

    // Create Supabase client
    const client = createRealtimeClient();
    if (!client) {
      setError('Supabase client not configured');
      return;
    }

    // Subscribe to game channel
    const gameChannel = subscribeToGame(client, gameId, {
      onCharacterUpdated: (character) => {
        onCharacterUpdated?.(character as Character);
      },
    });

    setChannel(gameChannel);

    // Monitor connection state
    gameChannel.on('system', {}, (payload) => {
      if (payload.status === 'SUBSCRIBED') {
        setIsConnected(true);
        setError(null);
      } else if (payload.status === 'CHANNEL_ERROR') {
        setIsConnected(false);
        setError('Connection error');
      } else if (payload.status === 'TIMED_OUT') {
        setIsConnected(false);
        setError('Connection timed out');
      }
    });

    // Cleanup on unmount
    return () => {
      gameChannel.unsubscribe();
      setIsConnected(false);
    };
  }, [gameId, enabled, onCharacterUpdated]);

  return {
    isConnected,
    error,
  };
}

/**
 * Hook for managing a list of characters with real-time sync
 * 
 * Maintains a local list of characters and automatically updates them
 * when real-time events are received.
 * 
 * @example
 * const { characters, updateCharacter } = useCharacterList({
 *   gameId: 'game-123',
 *   initialCharacters: [],
 * });
 */
export function useCharacterList({
  gameId,
  initialCharacters = [],
}: {
  gameId: string;
  initialCharacters?: Character[];
}) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters);

  const updateCharacter = useCallback((updatedCharacter: Character) => {
    setCharacters((prev) => {
      const index = prev.findIndex((c) => c.id === updatedCharacter.id);
      
      if (index === -1) {
        // Character not in list, add it
        return [...prev, updatedCharacter];
      }
      
      // Update existing character
      const newCharacters = [...prev];
      newCharacters[index] = updatedCharacter;
      return newCharacters;
    });
  }, []);

  const { isConnected, error } = useCharacterSync({
    gameId,
    onCharacterUpdated: updateCharacter,
  });

  return {
    characters,
    setCharacters,
    updateCharacter,
    isConnected,
    error,
  };
}

/**
 * Hook for managing a single character with real-time sync
 * 
 * Maintains a single character state and automatically updates it
 * when real-time events are received.
 * 
 * @example
 * const { character, setCharacter } = useCharacterState({
 *   gameId: 'game-123',
 *   characterId: 'char-123',
 *   initialCharacter: null,
 * });
 */
export function useCharacterState({
  gameId,
  characterId,
  initialCharacter = null,
}: {
  gameId: string;
  characterId: string;
  initialCharacter?: Character | null;
}) {
  const [character, setCharacter] = useState<Character | null>(initialCharacter);

  const handleCharacterUpdate = useCallback((updatedCharacter: Character) => {
    // Only update if it's the character we're tracking
    if (updatedCharacter.id === characterId) {
      setCharacter(updatedCharacter);
    }
  }, [characterId]);

  const { isConnected, error } = useCharacterSync({
    gameId,
    onCharacterUpdated: handleCharacterUpdate,
  });

  return {
    character,
    setCharacter,
    isConnected,
    error,
  };
}

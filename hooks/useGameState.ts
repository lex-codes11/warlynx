/**
 * React hook for subscribing to game state updates
 * 
 * This hook provides real-time game state synchronization including
 * game status, roster changes, and turn order updates.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeGame } from './useRealtimeGame';

interface GameState {
  id: string;
  name: string;
  hostId: string;
  status: 'lobby' | 'active' | 'completed';
  maxPlayers: number;
  difficultyCurve: 'easy' | 'medium' | 'hard' | 'brutal';
  toneTags: string[];
  houseRules: string | null;
  turnOrder: string[];
  currentTurnIndex: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface Player {
  id: string;
  userId: string;
  role: 'host' | 'player';
  characterId: string | null;
  joinedAt: Date;
}

interface UseGameStateOptions {
  gameId: string;
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseGameStateReturn {
  gameState: GameState | null;
  players: Player[];
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  reconnect: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for subscribing to game state updates
 * 
 * @param options - Configuration options
 * @returns Game state, players, and connection status
 * 
 * @example
 * ```tsx
 * const { gameState, players, isConnected } = useGameState({
 *   gameId: 'game-123',
 *   onError: (error) => console.error('Game state error:', error),
 * });
 * 
 * if (!gameState) return <div>Loading...</div>;
 * 
 * return (
 *   <div>
 *     <h1>{gameState.name}</h1>
 *     <p>Status: {gameState.status}</p>
 *     <p>Players: {players.length}/{gameState.maxPlayers}</p>
 *   </div>
 * );
 * ```
 */
export function useGameState(options: UseGameStateOptions): UseGameStateReturn {
  const { gameId, enabled = true, onError } = options;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial game state
  const fetchGameState = useCallback(async () => {
    if (!gameId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/games/${gameId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch game state: ${response.statusText}`);
      }

      const data = await response.json();
      
      setGameState({
        id: data.id,
        name: data.name,
        hostId: data.hostId,
        status: data.status,
        maxPlayers: data.maxPlayers,
        difficultyCurve: data.difficultyCurve,
        toneTags: data.toneTags,
        houseRules: data.houseRules,
        turnOrder: data.turnOrder,
        currentTurnIndex: data.currentTurnIndex,
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
      });

      if (data.players) {
        setPlayers(data.players.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          role: p.role,
          characterId: p.characterId,
          joinedAt: new Date(p.joinedAt),
        })));
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, enabled, onError]);

  // Initial fetch
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  // Handle game updates from real-time
  const handleGameUpdated = useCallback((data: any) => {
    setGameState(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        ...data,
        startedAt: data.startedAt ? new Date(data.startedAt) : prev.startedAt,
        completedAt: data.completedAt ? new Date(data.completedAt) : prev.completedAt,
      };
    });
  }, []);

  // Handle player joined
  const handlePlayerJoined = useCallback((player: any) => {
    setPlayers(prev => {
      // Check if player already exists
      if (prev.some(p => p.id === player.id)) {
        return prev;
      }
      
      return [...prev, {
        id: player.id,
        userId: player.userId,
        role: player.role,
        characterId: player.characterId,
        joinedAt: new Date(player.joinedAt),
      }];
    });
  }, []);

  // Handle player left
  const handlePlayerLeft = useCallback((playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
  }, []);

  // Subscribe to real-time updates
  const { isConnected, reconnect } = useRealtimeGame({
    gameId,
    enabled,
    onGameUpdated: handleGameUpdated,
    onPlayerJoined: handlePlayerJoined,
    onPlayerLeft: handlePlayerLeft,
  });

  return {
    gameState,
    players,
    isLoading,
    error,
    isConnected,
    reconnect,
    refetch: fetchGameState,
  };
}

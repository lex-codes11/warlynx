/**
 * React hook for subscribing to turn state updates
 * 
 * This hook provides real-time turn state synchronization including
 * current turn, active player, and turn phase updates.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeGame } from './useRealtimeGame';

interface Turn {
  id: string;
  gameId: string;
  turnIndex: number;
  activePlayerId: string;
  phase: 'waiting' | 'choosing' | 'resolving' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
}

interface Choice {
  label: 'A' | 'B' | 'C' | 'D';
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

interface TurnResponse {
  success: boolean;
  narrative: string;
  choices: Choice[];
  statUpdates: any[];
  events: any[];
  validationError: string | null;
}

interface UseTurnStateOptions {
  gameId: string;
  userId?: string; // Current user ID to determine if it's their turn
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseTurnStateReturn {
  currentTurn: Turn | null;
  isMyTurn: boolean;
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  reconnect: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for subscribing to turn state updates
 * 
 * @param options - Configuration options
 * @returns Current turn state and connection status
 * 
 * @example
 * ```tsx
 * const { currentTurn, isMyTurn, isConnected } = useTurnState({
 *   gameId: 'game-123',
 *   userId: 'user-456',
 *   onError: (error) => console.error('Turn state error:', error),
 * });
 * 
 * if (!currentTurn) return <div>Loading...</div>;
 * 
 * return (
 *   <div>
 *     <h2>Turn {currentTurn.turnIndex}</h2>
 *     {isMyTurn ? (
 *       <p>It's your turn!</p>
 *     ) : (
 *       <p>Waiting for other player...</p>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useTurnState(options: UseTurnStateOptions): UseTurnStateReturn {
  const { gameId, userId, enabled = true, onError } = options;

  const [currentTurn, setCurrentTurn] = useState<Turn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch initial turn state
  const fetchTurnState = useCallback(async () => {
    if (!gameId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/games/${gameId}/current-turn`);
      
      if (!response.ok) {
        // If no turn exists yet (game not started), this is not an error
        if (response.status === 404) {
          setCurrentTurn(null);
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch turn state: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.turn) {
        setCurrentTurn({
          id: data.turn.id,
          gameId: data.turn.gameId,
          turnIndex: data.turn.turnIndex,
          activePlayerId: data.turn.activePlayerId,
          phase: data.turn.phase,
          startedAt: new Date(data.turn.startedAt),
          completedAt: data.turn.completedAt ? new Date(data.turn.completedAt) : null,
        });
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
    fetchTurnState();
  }, [fetchTurnState]);

  // Handle turn started event
  const handleTurnStarted = useCallback((turn: any) => {
    setCurrentTurn({
      id: turn.id,
      gameId: turn.gameId,
      turnIndex: turn.turnIndex,
      activePlayerId: turn.activePlayerId,
      phase: turn.phase,
      startedAt: new Date(turn.startedAt),
      completedAt: turn.completedAt ? new Date(turn.completedAt) : null,
    });
  }, []);

  // Handle turn resolved event
  const handleTurnResolved = useCallback((response: TurnResponse) => {
    // Refetch turn state to get the updated turn
    fetchTurnState();
  }, [fetchTurnState]);

  // Subscribe to real-time updates
  const { isConnected, reconnect } = useRealtimeGame({
    gameId,
    enabled,
    onTurnStarted: handleTurnStarted,
    onTurnResolved: handleTurnResolved,
  });

  // Determine if it's the current user's turn
  const isMyTurn = currentTurn?.activePlayerId === userId;

  return {
    currentTurn,
    isMyTurn,
    isLoading,
    error,
    isConnected,
    reconnect,
    refetch: fetchTurnState,
  };
}

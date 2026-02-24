/**
 * React hook for managing real-time game state synchronization
 * 
 * This hook provides a simple interface for subscribing to game updates
 * and managing connection state.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  createRealtimeClient,
  subscribeToGame,
  unsubscribeFromGame,
  getChannelState,
  ConnectionState,
} from '@/lib/realtime/supabase';

interface UseRealtimeGameOptions {
  gameId: string;
  onGameUpdated?: (data: any) => void;
  onPlayerJoined?: (player: any) => void;
  onPlayerLeft?: (playerId: string) => void;
  onTurnStarted?: (turn: any) => void;
  onTurnResolved?: (response: any) => void;
  onCharacterUpdated?: (character: any) => void;
  onStatsUpdated?: (update: any) => void;
  enabled?: boolean; // Allow conditional subscription
}

interface UseRealtimeGameReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Hook for subscribing to real-time game updates
 * 
 * @param options - Configuration options
 * @returns Connection state and control functions
 * 
 * @example
 * ```tsx
 * const { connectionState, isConnected } = useRealtimeGame({
 *   gameId: 'game-123',
 *   onGameUpdated: (data) => {
 *     console.log('Game updated:', data);
 *   },
 *   onPlayerJoined: (player) => {
 *     console.log('Player joined:', player);
 *   },
 * });
 * ```
 */
export function useRealtimeGame(options: UseRealtimeGameOptions): UseRealtimeGameReturn {
  const {
    gameId,
    onGameUpdated,
    onPlayerJoined,
    onPlayerLeft,
    onTurnStarted,
    onTurnResolved,
    onCharacterUpdated,
    onStatsUpdated,
    enabled = true,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const clientRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Initialize Supabase client
  useEffect(() => {
    if (!enabled) return;

    const client = createRealtimeClient();
    if (!client) {
      console.error('Failed to create Supabase Realtime client');
      setConnectionState('error');
      return;
    }

    clientRef.current = client;

    return () => {
      clientRef.current = null;
    };
  }, [enabled]);

  // Subscribe to game updates
  useEffect(() => {
    if (!enabled || !clientRef.current || !gameId) return;

    setConnectionState('connecting');

    const channel = subscribeToGame(clientRef.current, gameId, {
      onGameUpdated,
      onPlayerJoined,
      onPlayerLeft,
      onTurnStarted,
      onTurnResolved,
      onCharacterUpdated,
      onStatsUpdated,
    });

    channelRef.current = channel;

    // Monitor connection state
    const stateInterval = setInterval(() => {
      if (channelRef.current) {
        const state = getChannelState(channelRef.current);
        setConnectionState(state);
      }
    }, 1000);

    return () => {
      clearInterval(stateInterval);
      if (channelRef.current) {
        unsubscribeFromGame(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    enabled,
    gameId,
    onGameUpdated,
    onPlayerJoined,
    onPlayerLeft,
    onTurnStarted,
    onTurnResolved,
    onCharacterUpdated,
    onStatsUpdated,
  ]);

  // Reconnect function
  const reconnect = useCallback(() => {
    if (channelRef.current) {
      unsubscribeFromGame(channelRef.current);
      channelRef.current = null;
    }

    if (clientRef.current && gameId) {
      setConnectionState('connecting');
      const channel = subscribeToGame(clientRef.current, gameId, {
        onGameUpdated,
        onPlayerJoined,
        onPlayerLeft,
        onTurnStarted,
        onTurnResolved,
        onCharacterUpdated,
        onStatsUpdated,
      });
      channelRef.current = channel;
    }
  }, [
    gameId,
    onGameUpdated,
    onPlayerJoined,
    onPlayerLeft,
    onTurnStarted,
    onTurnResolved,
    onCharacterUpdated,
    onStatsUpdated,
  ]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      unsubscribeFromGame(channelRef.current);
      channelRef.current = null;
      setConnectionState('disconnected');
    }
  }, []);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    reconnect,
    disconnect,
  };
}

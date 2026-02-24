/**
 * Supabase Realtime Configuration
 * 
 * This module sets up Supabase Realtime for real-time game state synchronization.
 * It provides utilities for creating Supabase clients and managing real-time subscriptions.
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Create a Supabase client for real-time operations
 * Uses environment variables for configuration
 */
export function createRealtimeClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase Realtime not configured. Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10, // Rate limit for real-time events
      },
    },
  });
}

/**
 * Game-related real-time event types
 */
export interface GameUpdatedEvent {
  type: 'game:updated';
  gameId: string;
  data: any;
}

export interface PlayerJoinedEvent {
  type: 'player:joined';
  gameId: string;
  player: any;
}

export interface PlayerLeftEvent {
  type: 'player:left';
  gameId: string;
  playerId: string;
}

export interface TurnStartedEvent {
  type: 'turn:started';
  gameId: string;
  turn: any;
}

export interface TurnResolvedEvent {
  type: 'turn:resolved';
  gameId: string;
  response: any;
}

export interface CharacterUpdatedEvent {
  type: 'character:updated';
  gameId: string;
  character: any;
}

export interface StatsUpdatedEvent {
  type: 'stats:updated';
  gameId: string;
  update: any;
}

export interface TypingStatusEvent {
  type: 'typing:status';
  gameId: string;
  userId: string;
  isTyping: boolean;
}

export type RealtimeGameEvent =
  | GameUpdatedEvent
  | PlayerJoinedEvent
  | PlayerLeftEvent
  | TurnStartedEvent
  | TurnResolvedEvent
  | CharacterUpdatedEvent
  | StatsUpdatedEvent
  | TypingStatusEvent;

/**
 * Subscribe to a game room for real-time updates
 * 
 * @param client - Supabase client instance
 * @param gameId - Game ID to subscribe to
 * @param callbacks - Event callbacks
 * @returns RealtimeChannel instance for managing the subscription
 */
export function subscribeToGame(
  client: SupabaseClient,
  gameId: string,
  callbacks: {
    onGameUpdated?: (data: any) => void;
    onPlayerJoined?: (player: any) => void;
    onPlayerLeft?: (playerId: string) => void;
    onTurnStarted?: (turn: any) => void;
    onTurnResolved?: (response: any) => void;
    onCharacterUpdated?: (character: any) => void;
    onStatsUpdated?: (update: any) => void;
    onTypingStatus?: (userId: string, isTyping: boolean) => void;
  }
): RealtimeChannel {
  const channel = client.channel(`game:${gameId}`, {
    config: {
      broadcast: { self: false }, // Don't receive own broadcasts
    },
  });

  // Subscribe to broadcast events
  channel
    .on('broadcast', { event: 'game:updated' }, (payload) => {
      callbacks.onGameUpdated?.(payload.payload);
    })
    .on('broadcast', { event: 'player:joined' }, (payload) => {
      callbacks.onPlayerJoined?.(payload.payload);
    })
    .on('broadcast', { event: 'player:left' }, (payload) => {
      callbacks.onPlayerLeft?.(payload.payload);
    })
    .on('broadcast', { event: 'turn:started' }, (payload) => {
      callbacks.onTurnStarted?.(payload.payload);
    })
    .on('broadcast', { event: 'turn:resolved' }, (payload) => {
      callbacks.onTurnResolved?.(payload.payload);
    })
    .on('broadcast', { event: 'character:updated' }, (payload) => {
      callbacks.onCharacterUpdated?.(payload.payload);
    })
    .on('broadcast', { event: 'stats:updated' }, (payload) => {
      callbacks.onStatsUpdated?.(payload.payload);
    })
    .on('broadcast', { event: 'typing:status' }, (payload) => {
      callbacks.onTypingStatus?.(payload.payload.userId, payload.payload.isTyping);
    })
    .subscribe();

  return channel;
}

/**
 * Broadcast a game event to all subscribers
 * 
 * @param client - Supabase client instance
 * @param gameId - Game ID to broadcast to
 * @param event - Event type
 * @param payload - Event payload
 */
export async function broadcastGameEvent(
  client: SupabaseClient,
  gameId: string,
  event: RealtimeGameEvent['type'],
  payload: any
): Promise<void> {
  const channel = client.channel(`game:${gameId}`);
  
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
}

/**
 * Unsubscribe from a game room
 * 
 * @param channel - RealtimeChannel instance to unsubscribe
 */
export async function unsubscribeFromGame(channel: RealtimeChannel): Promise<void> {
  await channel.unsubscribe();
}

/**
 * Connection state types
 */
export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Get the current connection state of a channel
 * 
 * @param channel - RealtimeChannel instance
 * @returns Current connection state
 */
export function getChannelState(channel: RealtimeChannel): ConnectionState {
  const state = channel.state;
  
  switch (state) {
    case 'joined':
      return 'connected';
    case 'joining':
      return 'connecting';
    case 'leaving':
    case 'closed':
      return 'disconnected';
    default:
      return 'error';
  }
}

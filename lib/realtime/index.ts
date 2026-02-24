/**
 * Real-time module exports
 * 
 * Provides access to real-time subscription management, broadcasting,
 * and Supabase Realtime utilities.
 */

// Subscription Manager (recommended for game enhancements)
export {
  RealtimeSubscriptionManager,
  createSubscriptionManager,
  type SessionCallbacks,
  type PlayerPresence,
  type ConnectionState,
  type SubscriptionConfig,
} from './subscription-manager';

// Legacy Supabase utilities
export {
  createRealtimeClient,
  subscribeToGame,
  unsubscribeFromGame,
  getChannelState,
  broadcastGameEvent,
  type RealtimeGameEvent,
  type GameUpdatedEvent,
  type PlayerJoinedEvent,
  type PlayerLeftEvent,
  type TurnStartedEvent,
  type TurnResolvedEvent,
  type CharacterUpdatedEvent,
  type StatsUpdatedEvent,
  type TypingStatusEvent,
} from './supabase';

// Server-side broadcast utilities
export {
  broadcastGameUpdate,
  broadcastPlayerJoined,
  broadcastPlayerLeft,
  broadcastTurnStarted,
  broadcastTurnResolved,
  broadcastCharacterUpdate,
  broadcastStatsUpdate,
  broadcastEvent,
} from './broadcast';

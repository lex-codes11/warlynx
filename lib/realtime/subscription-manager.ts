/**
 * RealtimeSubscriptionManager Service
 * 
 * Manages real-time subscriptions for game sessions with support for:
 * - Session-specific channels
 * - Game state updates
 * - Typing indicators with debounce
 * - Presence tracking for player join/leave
 * - Connection error handling and automatic reconnection
 * 
 * Requirements: 6.1, 6.2, 6.3, 11.1, 11.4
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { GameEnhancementEvent } from '@/types/game-enhancements';

/**
 * Session callbacks for real-time events
 */
export interface SessionCallbacks {
  onPlayerJoined?: (player: PlayerPresence) => void;
  onPlayerLeft?: (playerId: string) => void;
  onGameStateUpdate?: (state: any) => void;
  onPlayerTyping?: (playerId: string, isTyping: boolean) => void;
  onCharacterUpdated?: (character: any) => void;
  onStatsUpdated?: (characterId: string, stats: any) => void;
  onTurnChanged?: (currentPlayerId: string, turnIndex: number) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/**
 * Player presence information
 */
export interface PlayerPresence {
  userId: string;
  userName: string;
  characterId?: string;
  joinedAt: string;
}

/**
 * Connection state types
 */
export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'error';

/**
 * Subscription configuration
 */
export interface SubscriptionConfig {
  sessionId: string;
  callbacks: SessionCallbacks;
  autoReconnect?: boolean;
  reconnectDelay?: number; // milliseconds
  maxReconnectAttempts?: number;
}

/**
 * Typing debounce tracker
 */
interface TypingDebounce {
  timeoutId: NodeJS.Timeout | null;
  isTyping: boolean;
}

/**
 * RealtimeSubscriptionManager class
 * Manages real-time subscriptions for game sessions
 */
export class RealtimeSubscriptionManager {
  private client: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private sessionId: string | null = null;
  private callbacks: SessionCallbacks = {};
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private autoReconnect = true;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private typingDebounces: Map<string, TypingDebounce> = new Map();
  private readonly TYPING_DEBOUNCE_MS = 2000;

  /**
   * Initialize the Supabase client
   */
  private initializeClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
      );
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    return this.client;
  }

  /**
   * Update connection state and notify callback
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.callbacks.onConnectionStateChange?.(state);
    }
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnect(): Promise<void> {
    if (!this.autoReconnect || !this.sessionId) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState('error');
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.updateConnectionState('reconnecting');

    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimeoutId = setTimeout(async () => {
      try {
        await this.unsubscribe();
        await this.subscribeToSession({
          sessionId: this.sessionId!,
          callbacks: this.callbacks,
          autoReconnect: this.autoReconnect,
          reconnectDelay: this.reconnectDelay,
          maxReconnectAttempts: this.maxReconnectAttempts,
        });
      } catch (error) {
        console.error('Reconnection failed:', error);
        await this.handleReconnect();
      }
    }, delay);
  }

  /**
   * Subscribe to a game session for real-time updates
   * 
   * @param config - Subscription configuration
   * @returns Promise that resolves when subscription is established
   */
  async subscribeToSession(config: SubscriptionConfig): Promise<void> {
    const {
      sessionId,
      callbacks,
      autoReconnect = true,
      reconnectDelay = 1000,
      maxReconnectAttempts = 5,
    } = config;

    // Store configuration
    this.sessionId = sessionId;
    this.callbacks = callbacks;
    this.autoReconnect = autoReconnect;
    this.reconnectDelay = reconnectDelay;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectAttempts = 0;

    // Initialize client
    const client = this.initializeClient();
    this.updateConnectionState('connecting');

    // Create session-specific channel
    const channelName = `session:${sessionId}`;
    this.channel = client.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
      },
    });

    // Set up presence tracking for player join/leave
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState();
        // Presence sync - all current users
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            callbacks.onPlayerJoined?.(presence as PlayerPresence);
          });
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        newPresences.forEach((presence: any) => {
          callbacks.onPlayerJoined?.(presence as PlayerPresence);
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          callbacks.onPlayerLeft?.(presence.userId);
        });
      });

    // Set up broadcast event listeners
    this.channel
      .on('broadcast', { event: 'game:state:update' }, ({ payload }) => {
        callbacks.onGameStateUpdate?.(payload);
      })
      .on('broadcast', { event: 'typing:status' }, ({ payload }) => {
        const { userId, isTyping } = payload;
        callbacks.onPlayerTyping?.(userId, isTyping);
      })
      .on('broadcast', { event: 'character:updated' }, ({ payload }) => {
        callbacks.onCharacterUpdated?.(payload);
      })
      .on('broadcast', { event: 'stats:updated' }, ({ payload }) => {
        const { characterId, stats } = payload;
        callbacks.onStatsUpdated?.(characterId, stats);
      })
      .on('broadcast', { event: 'turn:changed' }, ({ payload }) => {
        const { currentPlayerId, turnIndex } = payload;
        callbacks.onTurnChanged?.(currentPlayerId, turnIndex);
      });

    // Subscribe to the channel
    this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        this.updateConnectionState('connected');
        this.reconnectAttempts = 0; // Reset on successful connection
      } else if (status === 'CHANNEL_ERROR') {
        this.updateConnectionState('error');
        await this.handleReconnect();
      } else if (status === 'TIMED_OUT') {
        this.updateConnectionState('error');
        await this.handleReconnect();
      } else if (status === 'CLOSED') {
        this.updateConnectionState('disconnected');
        await this.handleReconnect();
      }
    });
  }

  /**
   * Track presence for the current user
   * 
   * @param presence - User presence information
   */
  async trackPresence(presence: PlayerPresence): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to a session');
    }

    await this.channel.track(presence);
  }

  /**
   * Untrack presence for the current user
   */
  async untrackPresence(): Promise<void> {
    if (!this.channel) {
      return;
    }

    await this.channel.untrack();
  }

  /**
   * Broadcast a game action/state update
   * 
   * @param action - Game action or state to broadcast
   */
  async broadcastAction(action: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to a session');
    }

    await this.channel.send({
      type: 'broadcast',
      event: 'game:state:update',
      payload: action,
    });
  }

  /**
   * Broadcast typing status with debounce logic
   * Automatically stops typing indicator after 2 seconds of inactivity
   * 
   * @param userId - User ID who is typing
   * @param isTyping - Whether the user is currently typing
   */
  async broadcastTypingStatus(userId: string, isTyping: boolean): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to a session');
    }

    // Get or create debounce tracker for this user
    let debounce = this.typingDebounces.get(userId);
    if (!debounce) {
      debounce = { timeoutId: null, isTyping: false };
      this.typingDebounces.set(userId, debounce);
    }

    // Clear existing timeout
    if (debounce.timeoutId) {
      clearTimeout(debounce.timeoutId);
      debounce.timeoutId = null;
    }

    if (isTyping) {
      // Only broadcast if state changed
      if (!debounce.isTyping) {
        debounce.isTyping = true;
        await this.channel.send({
          type: 'broadcast',
          event: 'typing:status',
          payload: { userId, isTyping: true },
        });
      }

      // Set timeout to auto-stop typing after 2 seconds
      debounce.timeoutId = setTimeout(async () => {
        debounce!.isTyping = false;
        await this.channel!.send({
          type: 'broadcast',
          event: 'typing:status',
          payload: { userId, isTyping: false },
        });
        this.typingDebounces.delete(userId);
      }, this.TYPING_DEBOUNCE_MS);
    } else {
      // User stopped typing
      debounce.isTyping = false;
      await this.channel.send({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId, isTyping: false },
      });
      this.typingDebounces.delete(userId);
    }
  }

  /**
   * Broadcast character update
   * 
   * @param character - Updated character data
   */
  async broadcastCharacterUpdate(character: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to a session');
    }

    await this.channel.send({
      type: 'broadcast',
      event: 'character:updated',
      payload: character,
    });
  }

  /**
   * Broadcast stats update
   * 
   * @param characterId - Character ID
   * @param stats - Updated stats
   */
  async broadcastStatsUpdate(characterId: string, stats: any): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to a session');
    }

    await this.channel.send({
      type: 'broadcast',
      event: 'stats:updated',
      payload: { characterId, stats },
    });
  }

  /**
   * Broadcast turn change
   * 
   * @param currentPlayerId - Current player ID
   * @param turnIndex - Current turn index
   */
  async broadcastTurnChange(currentPlayerId: string, turnIndex: number): Promise<void> {
    if (!this.channel) {
      throw new Error('Not subscribed to a session');
    }

    await this.channel.send({
      type: 'broadcast',
      event: 'turn:changed',
      payload: { currentPlayerId, turnIndex },
    });
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    await this.handleReconnect();
  }

  /**
   * Unsubscribe from the current session
   */
  async unsubscribe(): Promise<void> {
    // Clear reconnect timeout
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    // Clear all typing debounces
    this.typingDebounces.forEach((debounce) => {
      if (debounce.timeoutId) {
        clearTimeout(debounce.timeoutId);
      }
    });
    this.typingDebounces.clear();

    // Unsubscribe from channel
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.updateConnectionState('disconnected');
    this.sessionId = null;
    this.callbacks = {};
  }
}

/**
 * Create a new RealtimeSubscriptionManager instance
 */
export function createSubscriptionManager(): RealtimeSubscriptionManager {
  return new RealtimeSubscriptionManager();
}

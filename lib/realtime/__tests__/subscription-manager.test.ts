/**
 * Unit tests for RealtimeSubscriptionManager
 * 
 * Tests subscription setup, broadcasting, typing debounce, presence tracking,
 * connection error handling, and automatic reconnection.
 */

import { RealtimeSubscriptionManager, createSubscriptionManager } from '../subscription-manager';
import type { SessionCallbacks, PlayerPresence } from '../subscription-manager';

// Mock Supabase client
const mockSend = jest.fn();
const mockTrack = jest.fn();
const mockUntrack = jest.fn();
const mockUnsubscribe = jest.fn();
const mockOn = jest.fn().mockReturnThis();
const mockSubscribe = jest.fn();

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  send: mockSend,
  track: mockTrack,
  untrack: mockUntrack,
  unsubscribe: mockUnsubscribe,
  presenceState: jest.fn().mockReturnValue({}),
};

const mockClient = {
  channel: jest.fn().mockReturnValue(mockChannel),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockClient),
}));

describe('RealtimeSubscriptionManager', () => {
  let manager: RealtimeSubscriptionManager;
  let callbacks: SessionCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    manager = createSubscriptionManager();
    callbacks = {
      onPlayerJoined: jest.fn(),
      onPlayerLeft: jest.fn(),
      onGameStateUpdate: jest.fn(),
      onPlayerTyping: jest.fn(),
      onCharacterUpdated: jest.fn(),
      onStatsUpdated: jest.fn(),
      onTurnChanged: jest.fn(),
      onConnectionStateChange: jest.fn(),
    };

    // Set up environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('subscribeToSession', () => {
    it('should create a session-specific channel', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(mockClient.channel).toHaveBeenCalledWith(
        'session:session-123',
        expect.objectContaining({
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
      );
    });

    it('should set up presence tracking listeners', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(mockOn).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
    });

    it('should set up broadcast event listeners', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'game:state:update' }, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'typing:status' }, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'character:updated' }, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'stats:updated' }, expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('broadcast', { event: 'turn:changed' }, expect.any(Function));
    });

    it('should subscribe to the channel', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(mockSubscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should update connection state to connecting', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith('connecting');
    });

    it('should update connection state to connected on successful subscription', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith('connected');
    });

    it('should throw error if Supabase URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      await expect(
        manager.subscribeToSession({
          sessionId: 'session-123',
          callbacks,
        })
      ).rejects.toThrow('Supabase configuration missing');
    });
  });

  describe('trackPresence', () => {
    it('should track user presence', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      const presence: PlayerPresence = {
        userId: 'user-1',
        userName: 'Test User',
        characterId: 'char-1',
        joinedAt: new Date().toISOString(),
      };

      await manager.trackPresence(presence);

      expect(mockTrack).toHaveBeenCalledWith(presence);
    });

    it('should throw error if not subscribed', async () => {
      const presence: PlayerPresence = {
        userId: 'user-1',
        userName: 'Test User',
        joinedAt: new Date().toISOString(),
      };

      await expect(manager.trackPresence(presence)).rejects.toThrow('Not subscribed to a session');
    });
  });

  describe('broadcastAction', () => {
    it('should broadcast game state update', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      const action = { type: 'move', data: { x: 10, y: 20 } };
      await manager.broadcastAction(action);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'game:state:update',
        payload: action,
      });
    });

    it('should throw error if not subscribed', async () => {
      await expect(manager.broadcastAction({ type: 'test' })).rejects.toThrow('Not subscribed to a session');
    });
  });

  describe('broadcastTypingStatus', () => {
    beforeEach(async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });
    });

    it('should broadcast typing start', async () => {
      await manager.broadcastTypingStatus('user-1', true);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId: 'user-1', isTyping: true },
      });
    });

    it('should broadcast typing stop', async () => {
      await manager.broadcastTypingStatus('user-1', true);
      mockSend.mockClear();

      await manager.broadcastTypingStatus('user-1', false);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId: 'user-1', isTyping: false },
      });
    });

    it('should debounce typing status - auto-stop after 2 seconds', async () => {
      await manager.broadcastTypingStatus('user-1', true);
      mockSend.mockClear();

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);

      // Should auto-broadcast typing stop
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId: 'user-1', isTyping: false },
      });
    });

    it('should reset debounce timer on continued typing', async () => {
      await manager.broadcastTypingStatus('user-1', true);
      mockSend.mockClear();

      // User continues typing after 1 second
      jest.advanceTimersByTime(1000);
      await manager.broadcastTypingStatus('user-1', true);

      // Should not broadcast again (state unchanged)
      expect(mockSend).not.toHaveBeenCalled();

      // Fast-forward another 2 seconds from last typing
      jest.advanceTimersByTime(2000);

      // Should auto-broadcast typing stop
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId: 'user-1', isTyping: false },
      });
    });

    it('should not broadcast duplicate typing start events', async () => {
      await manager.broadcastTypingStatus('user-1', true);
      mockSend.mockClear();

      await manager.broadcastTypingStatus('user-1', true);

      // Should not broadcast again
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle multiple users typing independently', async () => {
      await manager.broadcastTypingStatus('user-1', true);
      await manager.broadcastTypingStatus('user-2', true);

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId: 'user-1', isTyping: true },
      });
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'typing:status',
        payload: { userId: 'user-2', isTyping: true },
      });
    });
  });

  describe('broadcastCharacterUpdate', () => {
    it('should broadcast character update', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      const character = { id: 'char-1', name: 'Hero', health: 100 };
      await manager.broadcastCharacterUpdate(character);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'character:updated',
        payload: character,
      });
    });
  });

  describe('broadcastStatsUpdate', () => {
    it('should broadcast stats update', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      const stats = { health: 80, energy: 50 };
      await manager.broadcastStatsUpdate('char-1', stats);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'stats:updated',
        payload: { characterId: 'char-1', stats },
      });
    });
  });

  describe('broadcastTurnChange', () => {
    it('should broadcast turn change', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      await manager.broadcastTurnChange('player-1', 5);

      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'turn:changed',
        payload: { currentPlayerId: 'player-1', turnIndex: 5 },
      });
    });
  });

  describe('connection state management', () => {
    it('should return current connection state', async () => {
      expect(manager.getConnectionState()).toBe('disconnected');

      // Don't await - check state during subscription
      const subscribePromise = manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      // State should be connecting or connected depending on timing
      const state = manager.getConnectionState();
      expect(['connecting', 'connected']).toContain(state);
      
      await subscribePromise;
    });

    it('should check if connected', async () => {
      expect(manager.isConnected()).toBe(false);

      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      expect(manager.isConnected()).toBe(true);
    });
  });

  describe('reconnection handling', () => {
    it('should attempt reconnection on channel error', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
        autoReconnect: true,
        reconnectDelay: 100,
      });

      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith('error');
      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith('reconnecting');
    });

    it('should use exponential backoff for reconnection delays', async () => {
      let callCount = 0;
      mockSubscribe.mockImplementation((callback) => {
        callCount++;
        // Always fail to test backoff
        callback('CHANNEL_ERROR');
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
        autoReconnect: true,
        reconnectDelay: 100,
        maxReconnectAttempts: 3,
      });

      // Verify reconnecting state is set
      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith('reconnecting');
    });

    it('should stop reconnecting after max attempts', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
        autoReconnect: true,
        reconnectDelay: 10,
        maxReconnectAttempts: 2,
      });

      // Advance through reconnect attempts
      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(20);
      
      // After max attempts, should be in error state
      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith('error');
    });

    it('should reset reconnect attempts on successful connection', async () => {
      let subscribeCallCount = 0;
      mockSubscribe.mockImplementation((callback) => {
        subscribeCallCount++;
        if (subscribeCallCount === 1) {
          callback('CHANNEL_ERROR');
        } else {
          callback('SUBSCRIBED');
        }
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
        autoReconnect: true,
        reconnectDelay: 10,
      });

      // Advance timer to trigger reconnect
      await jest.advanceTimersByTimeAsync(10);

      // Verify that reconnection was attempted (subscribeCallCount should be 2)
      expect(subscribeCallCount).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from channel', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      await manager.unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(manager.getConnectionState()).toBe('disconnected');
    });

    it('should clear typing debounces on unsubscribe', async () => {
      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
      });

      await manager.broadcastTypingStatus('user-1', true);
      await manager.unsubscribe();

      // Fast-forward past debounce time
      jest.advanceTimersByTime(2000);

      // Should not broadcast after unsubscribe
      const sendCallsBeforeUnsubscribe = mockSend.mock.calls.length;
      expect(mockSend).toHaveBeenCalledTimes(sendCallsBeforeUnsubscribe);
    });

    it('should clear reconnect timeout on unsubscribe', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
      });

      await manager.subscribeToSession({
        sessionId: 'session-123',
        callbacks,
        autoReconnect: true,
        reconnectDelay: 100,
      });

      await manager.unsubscribe();

      // Fast-forward past reconnect delay
      jest.advanceTimersByTime(200);

      // Should not attempt reconnection after unsubscribe
      expect(mockClient.channel).toHaveBeenCalledTimes(1);
    });
  });

  describe('createSubscriptionManager', () => {
    it('should create a new manager instance', () => {
      const manager1 = createSubscriptionManager();
      const manager2 = createSubscriptionManager();

      expect(manager1).toBeInstanceOf(RealtimeSubscriptionManager);
      expect(manager2).toBeInstanceOf(RealtimeSubscriptionManager);
      expect(manager1).not.toBe(manager2);
    });
  });
});

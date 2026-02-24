/**
 * Unit tests for Supabase Realtime configuration
 */

import { createRealtimeClient, subscribeToGame, getChannelState } from '../supabase';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Supabase Realtime', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createRealtimeClient', () => {
    it('should create a Supabase client with valid environment variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const mockClient = {} as any;
      mockCreateClient.mockReturnValue(mockClient);

      const client = createRealtimeClient();

      expect(client).toBe(mockClient);
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        })
      );
    });

    it('should return null when SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      const client = createRealtimeClient();

      expect(client).toBeNull();
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should return null when SUPABASE_ANON_KEY is missing', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const client = createRealtimeClient();

      expect(client).toBeNull();
      expect(mockCreateClient).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToGame', () => {
    it('should create a channel and subscribe to events', () => {
      const mockSubscribe = jest.fn().mockReturnThis();
      const mockOn = jest.fn().mockReturnThis();
      const mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe,
      };

      const mockClient = {
        channel: jest.fn().mockReturnValue(mockChannel),
      } as any;

      const callbacks = {
        onGameUpdated: jest.fn(),
        onPlayerJoined: jest.fn(),
        onTurnStarted: jest.fn(),
      };

      const channel = subscribeToGame(mockClient, 'game-123', callbacks);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123', {
        config: {
          broadcast: { self: false },
        },
      });

      expect(mockOn).toHaveBeenCalledWith(
        'broadcast',
        { event: 'game:updated' },
        expect.any(Function)
      );
      expect(mockOn).toHaveBeenCalledWith(
        'broadcast',
        { event: 'player:joined' },
        expect.any(Function)
      );
      expect(mockOn).toHaveBeenCalledWith(
        'broadcast',
        { event: 'turn:started' },
        expect.any(Function)
      );

      expect(mockSubscribe).toHaveBeenCalled();
      expect(channel).toBe(mockChannel);
    });

    it('should call callbacks when events are received', () => {
      const mockSubscribe = jest.fn().mockReturnThis();
      let eventHandlers: Record<string, Function> = {};
      
      const mockOn = jest.fn().mockImplementation((type, filter, handler) => {
        eventHandlers[filter.event] = handler;
        return mockChannel;
      });

      const mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe,
      };

      const mockClient = {
        channel: jest.fn().mockReturnValue(mockChannel),
      } as any;

      const callbacks = {
        onGameUpdated: jest.fn(),
        onPlayerJoined: jest.fn(),
      };

      subscribeToGame(mockClient, 'game-123', callbacks);

      // Simulate receiving events
      eventHandlers['game:updated']({ payload: { status: 'active' } });
      eventHandlers['player:joined']({ payload: { id: 'player-1' } });

      expect(callbacks.onGameUpdated).toHaveBeenCalledWith({ status: 'active' });
      expect(callbacks.onPlayerJoined).toHaveBeenCalledWith({ id: 'player-1' });
    });
  });

  describe('getChannelState', () => {
    it('should return "connected" for joined state', () => {
      const mockChannel = { state: 'joined' } as any;
      expect(getChannelState(mockChannel)).toBe('connected');
    });

    it('should return "connecting" for joining state', () => {
      const mockChannel = { state: 'joining' } as any;
      expect(getChannelState(mockChannel)).toBe('connecting');
    });

    it('should return "disconnected" for closed state', () => {
      const mockChannel = { state: 'closed' } as any;
      expect(getChannelState(mockChannel)).toBe('disconnected');
    });

    it('should return "disconnected" for leaving state', () => {
      const mockChannel = { state: 'leaving' } as any;
      expect(getChannelState(mockChannel)).toBe('disconnected');
    });

    it('should return "error" for unknown state', () => {
      const mockChannel = { state: 'unknown' } as any;
      expect(getChannelState(mockChannel)).toBe('error');
    });
  });
});

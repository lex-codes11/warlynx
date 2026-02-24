/**
 * Unit tests for server-side broadcast utilities
 */

import {
  broadcastGameUpdate,
  broadcastPlayerJoined,
  broadcastPlayerLeft,
  broadcastTurnStarted,
  broadcastTurnResolved,
  broadcastCharacterUpdate,
  broadcastStatsUpdate,
  broadcastEvent,
} from '../broadcast';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('Broadcast utilities', () => {
  const originalEnv = process.env;
  let mockSend: jest.Mock;
  let mockUnsubscribe: jest.Mock;
  let mockChannel: any;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

    mockSend = jest.fn().mockResolvedValue(undefined);
    mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
    mockChannel = {
      send: mockSend,
      unsubscribe: mockUnsubscribe,
    };
    mockClient = {
      channel: jest.fn().mockReturnValue(mockChannel),
    };

    mockCreateClient.mockReturnValue(mockClient);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('broadcastGameUpdate', () => {
    it('should broadcast game update event', async () => {
      const gameData = { status: 'active', turnIndex: 1 };

      await broadcastGameUpdate('game-123', gameData);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'game:updated',
        payload: gameData,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastPlayerJoined', () => {
    it('should broadcast player joined event', async () => {
      const player = { id: 'player-1', name: 'Test Player' };

      await broadcastPlayerJoined('game-123', player);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'player:joined',
        payload: player,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastPlayerLeft', () => {
    it('should broadcast player left event', async () => {
      await broadcastPlayerLeft('game-123', 'player-1');

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'player:left',
        payload: 'player-1',
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastTurnStarted', () => {
    it('should broadcast turn started event', async () => {
      const turn = { turnIndex: 1, activePlayerId: 'player-1' };

      await broadcastTurnStarted('game-123', turn);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'turn:started',
        payload: turn,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastTurnResolved', () => {
    it('should broadcast turn resolved event', async () => {
      const response = { narrative: 'Test narrative', choices: [] };

      await broadcastTurnResolved('game-123', response);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'turn:resolved',
        payload: response,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastCharacterUpdate', () => {
    it('should broadcast character updated event', async () => {
      const character = { id: 'char-1', hp: 100 };

      await broadcastCharacterUpdate('game-123', character);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'character:updated',
        payload: character,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastStatsUpdate', () => {
    it('should broadcast stats updated event', async () => {
      const update = { characterId: 'char-1', changes: { hp: -10 } };

      await broadcastStatsUpdate('game-123', update);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'stats:updated',
        payload: update,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('broadcastEvent', () => {
    it('should broadcast any event type', async () => {
      const payload = { test: 'data' };

      await broadcastEvent('game-123', 'game:updated', payload);

      expect(mockClient.channel).toHaveBeenCalledWith('game:game-123');
      expect(mockSend).toHaveBeenCalledWith({
        type: 'broadcast',
        event: 'game:updated',
        payload,
      });
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw error when SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      await expect(broadcastGameUpdate('game-123', {})).rejects.toThrow(
        'Supabase configuration missing'
      );
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      await expect(broadcastGameUpdate('game-123', {})).rejects.toThrow(
        'Supabase configuration missing'
      );
    });
  });
});

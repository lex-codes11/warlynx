/**
 * Unit tests for Game Start API Route
 * Tests: Requirements 5.3, 5.4, 5.5, 13.1
 * @jest-environment node
 */

import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { startGame } from '@/lib/game-manager';
import * as broadcast from '@/lib/realtime/broadcast';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/game-manager');
jest.mock('@/lib/realtime/broadcast');
jest.mock('@/lib/auth-options', () => ({
  authOptions: {}
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockStartGame = startGame as jest.MockedFunction<typeof startGame>;

describe('POST /api/games/[gameId]/start', () => {
  const mockGameId = 'game-123';
  const mockHostId = 'user-host';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(mockStartGame).not.toHaveBeenCalled();
    });
  });
  
  describe('Successful game start', () => {
    it('should start game and return game data with turn order', async () => {
      const mockSession = {
        user: { id: mockHostId, email: 'host@example.com', displayName: 'Host' }
      };
      
      const mockGameData = {
        id: mockGameId,
        name: 'Test Game',
        status: 'active',
        turnOrder: ['user-1', 'user-2', 'user-3'],
        currentTurnIndex: 0,
        startedAt: new Date('2024-01-01'),
        host: {
          id: mockHostId,
          displayName: 'Host',
          avatar: null
        },
        players: [
          {
            id: 'player-1',
            role: 'host',
            user: { id: 'user-1', displayName: 'Player 1', avatar: null },
            character: { id: 'char-1', name: 'Character 1', imageUrl: 'http://example.com/char1.png' }
          },
          {
            id: 'player-2',
            role: 'player',
            user: { id: 'user-2', displayName: 'Player 2', avatar: null },
            character: { id: 'char-2', name: 'Character 2', imageUrl: 'http://example.com/char2.png' }
          }
        ]
      };
      
      mockGetServerSession.mockResolvedValue(mockSession);
      mockStartGame.mockResolvedValue(mockGameData as any);
      (broadcast.broadcastGameUpdate as jest.Mock).mockResolvedValue(undefined);
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.game.id).toBe(mockGameId);
      expect(data.data.game.status).toBe('active');
      expect(data.data.game.turnOrder).toEqual(['user-1', 'user-2', 'user-3']);
      expect(data.data.game.currentTurnIndex).toBe(0);
      expect(data.data.game.startedAt).toBeDefined();
      
      expect(mockStartGame).toHaveBeenCalledWith({
        gameId: mockGameId,
        hostId: mockHostId
      });
      
      // Verify broadcast was called
      expect(broadcast.broadcastGameUpdate).toHaveBeenCalledWith(mockGameId, {
        id: mockGameId,
        status: 'active',
        turnOrder: ['user-1', 'user-2', 'user-3'],
        currentTurnIndex: 0,
        startedAt: mockGameData.startedAt,
      });
    });
  });
  
  describe('Error handling', () => {
    const mockSession = {
      user: { id: mockHostId, email: 'host@example.com', displayName: 'Host' }
    };
    
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });
    
    it('should return 404 if game not found', async () => {
      mockStartGame.mockRejectedValue(new Error('GAME_NOT_FOUND'));
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_NOT_FOUND');
    });
    
    it('should return 403 if user is not the host', async () => {
      mockStartGame.mockRejectedValue(new Error('UNAUTHORIZED_NOT_HOST'));
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED_NOT_HOST');
      expect(data.error.message).toContain('Only the host can start');
    });
    
    it('should return 400 if game already started', async () => {
      mockStartGame.mockRejectedValue(new Error('GAME_ALREADY_STARTED'));
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_ALREADY_STARTED');
    });
    
    it('should return 400 if not all players have characters', async () => {
      mockStartGame.mockRejectedValue(new Error('INCOMPLETE_CHARACTER_CREATION'));
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INCOMPLETE_CHARACTER_CREATION');
      expect(data.error.message).toContain('All players must complete character creation');
    });
    
    it('should return 500 for unexpected errors', async () => {
      mockStartGame.mockRejectedValue(new Error('Unexpected database error'));
      
      const request = new Request('http://localhost:3000/api/games/game-123/start', {
        method: 'POST'
      });
      
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.retryable).toBe(true);
    });
  });
});

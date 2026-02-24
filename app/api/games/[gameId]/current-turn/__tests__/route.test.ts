/**
 * Unit tests for Current Turn API Route
 * Tests GET /api/games/[gameId]/current-turn
 * @jest-environment node
 */

import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { getActivePlayer, getTurnOrderWithDetails } from '@/lib/turn-manager';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/turn-manager');
jest.mock('@/lib/auth-options', () => ({
  authOptions: {}
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
    },
    gamePlayer: {
      findFirst: jest.fn(),
    },
    turn: {
      findFirst: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetActivePlayer = getActivePlayer as jest.MockedFunction<typeof getActivePlayer>;
const mockGetTurnOrderWithDetails = getTurnOrderWithDetails as jest.MockedFunction<typeof getTurnOrderWithDetails>;

describe('GET /api/games/[gameId]/current-turn', () => {
  const mockGameId = 'game-123';
  const mockUserId = 'user-123';
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
      displayName: 'Test User',
    },
    expires: '2024-12-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 if session has no user', async () => {
      mockGetServerSession.mockResolvedValue({ expires: '2024-12-31' } as any);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Game Validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it('should return 404 if game does not exist', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should return 403 if user is not a player in the game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'active',
        currentTurnIndex: 0,
      });
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Game Status Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-123',
        gameId: mockGameId,
        userId: mockUserId,
      });
    });

    it('should return appropriate message when game is in lobby', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'lobby',
        currentTurnIndex: 0,
      });

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gameStatus).toBe('lobby');
      expect(data.data.currentTurn).toBeNull();
      expect(data.data.activePlayer).toBeNull();
      expect(data.data.message).toBe('Game has not started yet');
    });

    it('should return appropriate message when game is completed', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'completed',
        currentTurnIndex: 5,
      });

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gameStatus).toBe('completed');
      expect(data.data.currentTurn).toBeNull();
      expect(data.data.activePlayer).toBeNull();
      expect(data.data.message).toBe('Game has ended');
    });
  });

  describe('Active Game Turn Information', () => {
    const mockActivePlayer = {
      id: 'player-123',
      userId: 'user-123',
      user: {
        id: 'user-123',
        displayName: 'Active Player',
        avatar: 'https://example.com/avatar.jpg',
      },
      character: {
        id: 'char-123',
        name: 'Test Character',
        imageUrl: 'https://example.com/character.jpg',
        powerSheet: {
          level: 1,
          hp: 100,
          maxHp: 100,
          attributes: {
            strength: 50,
            agility: 50,
            intelligence: 50,
            charisma: 50,
            endurance: 50,
          },
          abilities: [],
          weakness: 'Test weakness',
          statuses: [],
          perks: [],
        },
      },
    };

    const mockTurnOrderDetails = {
      turnOrder: [
        {
          index: 0,
          playerId: 'user-123',
          player: mockActivePlayer,
          isAlive: true,
          isActive: true,
        },
        {
          index: 1,
          playerId: 'user-456',
          player: {
            id: 'player-456',
            userId: 'user-456',
            user: {
              id: 'user-456',
              displayName: 'Player 2',
              avatar: null,
            },
            character: {
              id: 'char-456',
              name: 'Character 2',
              imageUrl: 'https://example.com/char2.jpg',
              powerSheet: { hp: 80, maxHp: 100 },
            },
          },
          isAlive: true,
          isActive: false,
        },
      ],
      currentTurnIndex: 0,
      activePlayerId: 'user-123',
    };

    const mockCurrentTurn = {
      id: 'turn-123',
      gameId: mockGameId,
      turnIndex: 0,
      activePlayerId: 'user-123',
      phase: 'choosing',
      startedAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: null,
    };

    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-123',
        gameId: mockGameId,
        userId: mockUserId,
      });
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'active',
        currentTurnIndex: 0,
      });
    });

    it('should return current turn information for active game', async () => {
      mockGetActivePlayer.mockResolvedValue(mockActivePlayer as any);
      mockGetTurnOrderWithDetails.mockResolvedValue(mockTurnOrderDetails as any);
      (prisma.turn.findFirst as jest.Mock).mockResolvedValue(mockCurrentTurn);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.gameStatus).toBe('active');
      expect(data.data.currentTurn).toEqual({
        id: mockCurrentTurn.id,
        turnIndex: mockCurrentTurn.turnIndex,
        phase: mockCurrentTurn.phase,
        startedAt: mockCurrentTurn.startedAt.toISOString(),
        completedAt: mockCurrentTurn.completedAt,
      });
      expect(data.data.activePlayer).toEqual({
        id: mockActivePlayer.id,
        userId: mockActivePlayer.userId,
        user: mockActivePlayer.user,
        character: {
          id: mockActivePlayer.character.id,
          name: mockActivePlayer.character.name,
          imageUrl: mockActivePlayer.character.imageUrl,
          powerSheet: mockActivePlayer.character.powerSheet,
        },
      });
      expect(data.data.turnOrder).toEqual(mockTurnOrderDetails);
    });

    it('should handle case when no turn record exists yet', async () => {
      mockGetActivePlayer.mockResolvedValue(mockActivePlayer as any);
      mockGetTurnOrderWithDetails.mockResolvedValue(mockTurnOrderDetails as any);
      (prisma.turn.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.currentTurn).toBeNull();
      expect(data.data.activePlayer).toBeDefined();
      expect(data.data.turnOrder).toBeDefined();
    });

    it('should handle case when active player has no character', async () => {
      const playerWithoutCharacter = {
        ...mockActivePlayer,
        character: null,
      };
      
      mockGetActivePlayer.mockResolvedValue(playerWithoutCharacter as any);
      mockGetTurnOrderWithDetails.mockResolvedValue(mockTurnOrderDetails as any);
      (prisma.turn.findFirst as jest.Mock).mockResolvedValue(mockCurrentTurn);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activePlayer.character).toBeNull();
    });

    it('should handle case when no active player exists', async () => {
      mockGetActivePlayer.mockResolvedValue(null);
      mockGetTurnOrderWithDetails.mockResolvedValue(mockTurnOrderDetails as any);
      (prisma.turn.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activePlayer).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-123',
        gameId: mockGameId,
        userId: mockUserId,
      });
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'active',
        currentTurnIndex: 0,
      });
    });

    it('should handle GAME_NOT_FOUND error from turn manager', async () => {
      mockGetActivePlayer.mockRejectedValue(new Error('GAME_NOT_FOUND'));

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should handle unexpected errors with 500 status', async () => {
      mockGetActivePlayer.mockRejectedValue(new Error('Unexpected database error'));

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.retryable).toBe(true);
    });

    it('should handle database connection errors', async () => {
      (prisma.game.findUnique as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-123',
        gameId: mockGameId,
        userId: mockUserId,
      });
    });

    it('should handle game with empty turn order', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'active',
        currentTurnIndex: 0,
      });
      
      mockGetActivePlayer.mockResolvedValue(null);
      mockGetTurnOrderWithDetails.mockResolvedValue({
        turnOrder: [],
        currentTurnIndex: 0,
        activePlayerId: null,
      } as any);
      (prisma.turn.findFirst as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.activePlayer).toBeNull();
      expect(data.data.turnOrder.turnOrder).toEqual([]);
    });

    it('should handle multiple turn records and return most recent', async () => {
      const olderTurn = {
        id: 'turn-old',
        gameId: mockGameId,
        turnIndex: 0,
        activePlayerId: 'user-123',
        phase: 'completed',
        startedAt: new Date('2024-01-01T00:00:00Z'),
        completedAt: new Date('2024-01-01T00:05:00Z'),
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: mockGameId,
        status: 'active',
        currentTurnIndex: 0,
      });
      
      mockGetActivePlayer.mockResolvedValue({
        id: 'player-123',
        userId: 'user-123',
        user: { id: 'user-123', displayName: 'Test', avatar: null },
        character: null,
      } as any);
      
      mockGetTurnOrderWithDetails.mockResolvedValue({
        turnOrder: [],
        currentTurnIndex: 0,
        activePlayerId: 'user-123',
      } as any);
      
      (prisma.turn.findFirst as jest.Mock).mockResolvedValue(olderTurn);

      const request = new Request('http://localhost:3000/api/games/game-123/current-turn');
      const response = await GET(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.turn.findFirst).toHaveBeenCalledWith({
        where: {
          gameId: mockGameId,
          turnIndex: 0,
        },
        orderBy: {
          startedAt: 'desc'
        }
      });
    });
  });
});

/**
 * Unit tests for game join API route
 * Tests POST /api/games/[gameId]/join endpoint
 * @jest-environment node
 */

import { POST } from '../route';
import { getServerSession } from 'next-auth';
import * as gameManager from '@/lib/game-manager';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/game-manager');
jest.mock('@/lib/auth-options', () => ({
  authOptions: {}
}));

describe('POST /api/games/[gameId]/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/games/game-123/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 if game does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });

    (gameManager.joinGame as jest.Mock).mockRejectedValue(
      new Error('GAME_NOT_FOUND')
    );

    const request = new Request('http://localhost:3000/api/games/invalid-game/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'invalid-game' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('GAME_NOT_FOUND');
  });

  it('should return 400 if game has already started', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });

    (gameManager.joinGame as jest.Mock).mockRejectedValue(
      new Error('GAME_ALREADY_STARTED')
    );

    const request = new Request('http://localhost:3000/api/games/game-123/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('GAME_ALREADY_STARTED');
    expect(data.error.message).toContain('already started');
  });

  it('should return 400 if game is at max capacity', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });

    (gameManager.joinGame as jest.Mock).mockRejectedValue(
      new Error('GAME_FULL')
    );

    const request = new Request('http://localhost:3000/api/games/game-123/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('GAME_FULL');
    expect(data.error.message).toContain('maximum player capacity');
  });

  it('should successfully join a game', async () => {
    const mockSession = {
      user: { id: 'user-456', email: 'player@example.com' }
    };

    const mockJoinResult = {
      game: {
        id: 'game-123',
        name: 'Test Game',
        inviteCode: 'ABC123',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime', 'marvel'],
        houseRules: null,
        status: 'lobby',
        createdAt: new Date(),
        host: {
          id: 'user-123',
          displayName: 'Host User',
          avatar: null,
        },
        players: [
          {
            id: 'player-123',
            userId: 'user-123',
            role: 'host',
            user: { id: 'user-123', displayName: 'Host User', avatar: null }
          }
        ]
      },
      player: {
        id: 'player-456',
        role: 'player',
        joinedAt: new Date(),
        user: {
          id: 'user-456',
          displayName: 'Player User',
          avatar: null,
        }
      },
      alreadyJoined: false
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.joinGame as jest.Mock).mockResolvedValue(mockJoinResult);

    const request = new Request('http://localhost:3000/api/games/game-123/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.game.id).toBe('game-123');
    expect(data.data.player.id).toBe('player-456');
    expect(data.data.player.role).toBe('player');
    expect(data.data.alreadyJoined).toBe(false);
    expect(data.data.game.currentPlayerCount).toBe(2);
  });

  it('should return 200 if user already joined the game', async () => {
    const mockSession = {
      user: { id: 'user-456', email: 'player@example.com' }
    };

    const mockJoinResult = {
      game: {
        id: 'game-123',
        name: 'Test Game',
        inviteCode: 'ABC123',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
        houseRules: null,
        status: 'lobby',
        createdAt: new Date(),
        host: {
          id: 'user-123',
          displayName: 'Host User',
          avatar: null,
        },
        players: [
          {
            id: 'player-123',
            userId: 'user-123',
            role: 'host',
            user: { id: 'user-123', displayName: 'Host User', avatar: null }
          },
          {
            id: 'player-456',
            userId: 'user-456',
            role: 'player',
            user: { id: 'user-456', displayName: 'Player User', avatar: null }
          }
        ]
      },
      player: {
        id: 'player-456',
        role: 'player',
        joinedAt: new Date(),
        user: {
          id: 'user-456',
          displayName: 'Player User',
          avatar: null,
        }
      },
      alreadyJoined: true
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.joinGame as jest.Mock).mockResolvedValue(mockJoinResult);

    const request = new Request('http://localhost:3000/api/games/game-123/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.alreadyJoined).toBe(true);
    expect(data.data.game.currentPlayerCount).toBe(2);
  });

  it('should handle generic errors', async () => {
    const mockSession = {
      user: { id: 'user-456', email: 'player@example.com' }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.joinGame as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new Request('http://localhost:3000/api/games/game-123/join', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('should call joinGame with correct parameters', async () => {
    const mockSession = {
      user: { id: 'user-789', email: 'newplayer@example.com' }
    };

    const mockJoinResult = {
      game: {
        id: 'game-456',
        name: 'Another Game',
        inviteCode: 'XYZ789',
        maxPlayers: 6,
        difficultyCurve: 'hard',
        toneTags: ['pokemon'],
        houseRules: 'Be nice',
        status: 'lobby',
        createdAt: new Date(),
        host: {
          id: 'user-100',
          displayName: 'Game Master',
          avatar: 'avatar.jpg',
        },
        players: []
      },
      player: {
        id: 'player-789',
        role: 'player',
        joinedAt: new Date(),
        user: {
          id: 'user-789',
          displayName: 'New Player',
          avatar: null,
        }
      },
      alreadyJoined: false
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.joinGame as jest.Mock).mockResolvedValue(mockJoinResult);

    const request = new Request('http://localhost:3000/api/games/game-456/join', {
      method: 'POST',
    });

    await POST(request as any, { params: { gameId: 'game-456' } });

    expect(gameManager.joinGame).toHaveBeenCalledWith({
      gameId: 'game-456',
      userId: 'user-789'
    });
  });
});

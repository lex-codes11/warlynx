/**
 * Unit tests for game leave API route
 * Tests POST /api/games/[gameId]/leave endpoint
 * @jest-environment node
 */

import { POST } from '../route';
import { getServerSession } from 'next-auth';
import * as gameManager from '@/lib/game-manager';
import * as broadcast from '@/lib/realtime/broadcast';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/game-manager');
jest.mock('@/lib/realtime/broadcast');
jest.mock('@/lib/auth-options', () => ({
  authOptions: {}
}));

describe('POST /api/games/[gameId]/leave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/games/game-123/leave', {
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

    (gameManager.leaveGame as jest.Mock).mockRejectedValue(
      new Error('GAME_NOT_FOUND')
    );

    const request = new Request('http://localhost:3000/api/games/invalid-game/leave', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'invalid-game' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('GAME_NOT_FOUND');
  });

  it('should return 400 if player is not in the game', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });

    (gameManager.leaveGame as jest.Mock).mockRejectedValue(
      new Error('PLAYER_NOT_IN_GAME')
    );

    const request = new Request('http://localhost:3000/api/games/game-123/leave', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('PLAYER_NOT_IN_GAME');
  });

  it('should return 400 if game has already started', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });

    (gameManager.leaveGame as jest.Mock).mockRejectedValue(
      new Error('CANNOT_LEAVE_ACTIVE_GAME')
    );

    const request = new Request('http://localhost:3000/api/games/game-123/leave', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('CANNOT_LEAVE_ACTIVE_GAME');
  });

  it('should successfully leave a game', async () => {
    const mockSession = {
      user: { id: 'user-456', email: 'player@example.com' }
    };

    const mockLeaveResult = {
      game: {
        id: 'game-123',
        name: 'Test Game',
        status: 'lobby',
        players: [
          {
            id: 'player-123',
            userId: 'user-123',
            role: 'host',
            user: { id: 'user-123', displayName: 'Host User', avatar: null }
          }
        ],
        host: {
          id: 'user-123',
          displayName: 'Host User',
          avatar: null,
        }
      },
      removedPlayerId: 'user-456'
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.leaveGame as jest.Mock).mockResolvedValue(mockLeaveResult);
    (broadcast.broadcastPlayerLeft as jest.Mock).mockResolvedValue(undefined);
    (broadcast.broadcastGameUpdate as jest.Mock).mockResolvedValue(undefined);

    const request = new Request('http://localhost:3000/api/games/game-123/leave', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.gameId).toBe('game-123');
    expect(data.data.leftAt).toBeDefined();
    
    // Verify broadcasts were called
    expect(broadcast.broadcastPlayerLeft).toHaveBeenCalledWith('game-123', 'user-456');
    expect(broadcast.broadcastGameUpdate).toHaveBeenCalledWith('game-123', {
      id: 'game-123',
      status: 'lobby',
      currentPlayerCount: 1,
    });
  });

  it('should handle generic errors', async () => {
    const mockSession = {
      user: { id: 'user-456', email: 'player@example.com' }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.leaveGame as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new Request('http://localhost:3000/api/games/game-123/leave', {
      method: 'POST',
    });

    const response = await POST(request as any, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('should call leaveGame with correct parameters', async () => {
    const mockSession = {
      user: { id: 'user-789', email: 'player@example.com' }
    };

    const mockLeaveResult = {
      game: {
        id: 'game-456',
        name: 'Another Game',
        status: 'lobby',
        players: [],
        host: {
          id: 'user-100',
          displayName: 'Game Master',
          avatar: 'avatar.jpg',
        }
      },
      removedPlayerId: 'user-789'
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.leaveGame as jest.Mock).mockResolvedValue(mockLeaveResult);
    (broadcast.broadcastPlayerLeft as jest.Mock).mockResolvedValue(undefined);
    (broadcast.broadcastGameUpdate as jest.Mock).mockResolvedValue(undefined);

    const request = new Request('http://localhost:3000/api/games/game-456/leave', {
      method: 'POST',
    });

    await POST(request as any, { params: { gameId: 'game-456' } });

    expect(gameManager.leaveGame).toHaveBeenCalledWith({
      gameId: 'game-456',
      userId: 'user-789'
    });
  });
});

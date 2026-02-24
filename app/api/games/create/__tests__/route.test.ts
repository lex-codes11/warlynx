/**
 * Unit tests for game creation API route
 * Tests POST /api/games/create endpoint
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

describe('POST /api/games/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/games/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Game',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 if validation fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' }
    });

    (gameManager.validateGameParams as jest.Mock).mockReturnValue({
      valid: false,
      errors: ['Game name is required']
    });

    const request = new Request('http://localhost:3000/api/games/create', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.details).toContain('Game name is required');
  });

  it('should create game successfully with valid parameters', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' }
    };

    const mockGameResult = {
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
          displayName: 'Test User',
          avatar: null,
        }
      },
      hostPlayer: {
        id: 'player-123',
        role: 'host',
        user: {
          id: 'user-123',
          displayName: 'Test User',
          avatar: null,
        }
      }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.validateGameParams as jest.Mock).mockReturnValue({
      valid: true,
      errors: []
    });
    (gameManager.createGame as jest.Mock).mockResolvedValue(mockGameResult);
    (gameManager.generateInviteLink as jest.Mock).mockReturnValue(
      'http://localhost:3000/game/join/ABC123'
    );

    const request = {
      json: async () => ({
        name: 'Test Game',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime', 'marvel'],
      }),
      nextUrl: {
        origin: 'http://localhost:3000'
      }
    };

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.game.name).toBe('Test Game');
    expect(data.data.game.inviteCode).toBe('ABC123');
    expect(data.data.game.inviteLink).toBe('http://localhost:3000/game/join/ABC123');
    expect(data.data.hostPlayer.role).toBe('host');
  });

  it('should handle optional houseRules parameter', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' }
    };

    const mockGameResult = {
      game: {
        id: 'game-123',
        name: 'Test Game',
        inviteCode: 'ABC123',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
        houseRules: 'No meta-gaming',
        status: 'lobby',
        createdAt: new Date(),
        host: {
          id: 'user-123',
          displayName: 'Test User',
          avatar: null,
        }
      },
      hostPlayer: {
        id: 'player-123',
        role: 'host',
        user: {
          id: 'user-123',
          displayName: 'Test User',
          avatar: null,
        }
      }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.validateGameParams as jest.Mock).mockReturnValue({
      valid: true,
      errors: []
    });
    (gameManager.createGame as jest.Mock).mockResolvedValue(mockGameResult);
    (gameManager.generateInviteLink as jest.Mock).mockReturnValue(
      'http://localhost:3000/game/join/ABC123'
    );

    const request = {
      json: async () => ({
        name: 'Test Game',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
        houseRules: 'No meta-gaming'
      }),
      nextUrl: {
        origin: 'http://localhost:3000'
      }
    };

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.game.houseRules).toBe('No meta-gaming');
  });

  it('should handle invite code generation failure', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.validateGameParams as jest.Mock).mockReturnValue({
      valid: true,
      errors: []
    });
    (gameManager.createGame as jest.Mock).mockRejectedValue(
      new Error('Failed to generate unique invite code')
    );

    const request = new Request('http://localhost:3000/api/games/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Game',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INVITE_CODE_GENERATION_FAILED');
  });

  it('should handle generic errors', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.validateGameParams as jest.Mock).mockReturnValue({
      valid: true,
      errors: []
    });
    (gameManager.createGame as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new Request('http://localhost:3000/api/games/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Game',
        maxPlayers: 4,
        difficultyCurve: 'medium',
        toneTags: ['anime'],
      })
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('should parse maxPlayers as integer', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' }
    };

    const mockGameResult = {
      game: {
        id: 'game-123',
        name: 'Test Game',
        inviteCode: 'ABC123',
        maxPlayers: 6,
        difficultyCurve: 'hard',
        toneTags: ['pokemon'],
        houseRules: null,
        status: 'lobby',
        createdAt: new Date(),
        host: {
          id: 'user-123',
          displayName: 'Test User',
          avatar: null,
        }
      },
      hostPlayer: {
        id: 'player-123',
        role: 'host',
        user: {
          id: 'user-123',
          displayName: 'Test User',
          avatar: null,
        }
      }
    };

    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (gameManager.validateGameParams as jest.Mock).mockReturnValue({
      valid: true,
      errors: []
    });
    (gameManager.createGame as jest.Mock).mockResolvedValue(mockGameResult);
    (gameManager.generateInviteLink as jest.Mock).mockReturnValue(
      'http://localhost:3000/game/join/ABC123'
    );

    const request = {
      json: async () => ({
        name: 'Test Game',
        maxPlayers: '6', // String instead of number
        difficultyCurve: 'hard',
        toneTags: ['pokemon'],
      }),
      nextUrl: {
        origin: 'http://localhost:3000'
      }
    };

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(gameManager.createGame).toHaveBeenCalledWith(
      expect.objectContaining({
        maxPlayers: 6 // Should be parsed as integer
      })
    );
  });
});

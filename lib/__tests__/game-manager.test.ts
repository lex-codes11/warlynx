/**
 * Unit tests for game manager utilities
 * Tests game creation, invite code generation, and validation
 */

import { 
  generateInviteCode, 
  generateUniqueInviteCode, 
  createGame, 
  generateInviteLink,
  validateGameParams,
  joinGame,
  findGameByInviteCode,
  startGame,
  type CreateGameParams,
  type JoinGameParams,
  type StartGameParams
} from '../game-manager';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    gamePlayer: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}));

describe('generateInviteCode', () => {
  it('should generate a 6-character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it('should only contain uppercase letters and numbers', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it('should not contain ambiguous characters (0, O, I, 1)', () => {
    // Generate multiple codes to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('should generate different codes on multiple calls', () => {
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      codes.add(generateInviteCode());
    }
    // With 6 characters from 32-char alphabet, collisions are rare
    // We expect at least 45 unique codes out of 50
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe('generateUniqueInviteCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a code when no collision occurs', async () => {
    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);
    
    const code = await generateUniqueInviteCode();
    
    expect(code).toHaveLength(6);
    expect(prisma.game.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: code },
      select: { id: true }
    });
  });

  it('should retry when collision occurs and eventually succeed', async () => {
    // First call returns existing game (collision), second call returns null (success)
    (prisma.game.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'existing-game-id' } as any)
      .mockResolvedValueOnce(null);
    
    const code = await generateUniqueInviteCode();
    
    expect(code).toHaveLength(6);
    expect(prisma.game.findUnique).toHaveBeenCalledTimes(2);
  });

  it('should throw error after max attempts', async () => {
    // Always return existing game (collision)
    (prisma.game.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-game-id' } as any);
    
    await expect(generateUniqueInviteCode()).rejects.toThrow(
      'Failed to generate unique invite code after multiple attempts'
    );
    
    expect(prisma.game.findUnique).toHaveBeenCalledTimes(10);
  });
});

describe('createGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a game with all required fields', async () => {
    const mockGame = {
      id: 'game-123',
      name: 'Test Game',
      hostId: 'user-123',
      inviteCode: 'ABC123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime', 'marvel'],
      houseRules: 'No meta-gaming',
      status: 'lobby',
      turnOrder: [],
      currentTurnIndex: 0,
      createdAt: new Date(),
      host: {
        id: 'user-123',
        displayName: 'Test User',
        avatar: null,
      }
    };

    const mockHostPlayer = {
      id: 'player-123',
      gameId: 'game-123',
      userId: 'user-123',
      role: 'host',
      user: {
        id: 'user-123',
        displayName: 'Test User',
        avatar: null,
      }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return callback({
        game: {
          create: jest.fn().mockResolvedValue(mockGame)
        },
        gamePlayer: {
          create: jest.fn().mockResolvedValue(mockHostPlayer)
        }
      });
    });

    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime', 'marvel'],
      houseRules: 'No meta-gaming'
    };

    const result = await createGame(params);

    expect(result.game.name).toBe('Test Game');
    expect(result.game.maxPlayers).toBe(4);
    expect(result.hostPlayer.role).toBe('host');
  });

  it('should create game without optional houseRules', async () => {
    const mockGame = {
      id: 'game-123',
      name: 'Test Game',
      hostId: 'user-123',
      inviteCode: 'ABC123',
      maxPlayers: 4,
      difficultyCurve: 'easy',
      toneTags: ['pokemon'],
      houseRules: null,
      status: 'lobby',
      turnOrder: [],
      currentTurnIndex: 0,
      createdAt: new Date(),
      host: {
        id: 'user-123',
        displayName: 'Test User',
        avatar: null,
      }
    };

    const mockHostPlayer = {
      id: 'player-123',
      gameId: 'game-123',
      userId: 'user-123',
      role: 'host',
      user: {
        id: 'user-123',
        displayName: 'Test User',
        avatar: null,
      }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return callback({
        game: {
          create: jest.fn().mockResolvedValue(mockGame)
        },
        gamePlayer: {
          create: jest.fn().mockResolvedValue(mockHostPlayer)
        }
      });
    });

    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'easy',
      toneTags: ['pokemon'],
    };

    const result = await createGame(params);

    expect(result.game.houseRules).toBeNull();
  });
});

describe('generateInviteLink', () => {
  it('should generate correct invite link format', () => {
    const link = generateInviteLink('ABC123', 'https://example.com');
    expect(link).toBe('https://example.com/game/join/ABC123');
  });

  it('should handle base URL without trailing slash', () => {
    const link = generateInviteLink('XYZ789', 'https://example.com');
    expect(link).toBe('https://example.com/game/join/XYZ789');
  });

  it('should handle base URL with trailing slash', () => {
    const link = generateInviteLink('XYZ789', 'https://example.com/');
    expect(link).toBe('https://example.com//game/join/XYZ789');
  });
});

describe('validateGameParams', () => {
  it('should validate correct parameters', () => {
    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime', 'marvel'],
      houseRules: 'No meta-gaming'
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty game name', () => {
    const params: CreateGameParams = {
      name: '',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime'],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Game name is required');
  });

  it('should reject game name over 100 characters', () => {
    const params: CreateGameParams = {
      name: 'a'.repeat(101),
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime'],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Game name must be 100 characters or less');
  });

  it('should reject maxPlayers below 2', () => {
    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 1,
      difficultyCurve: 'medium',
      toneTags: ['anime'],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Max players must be between 2 and 10');
  });

  it('should reject maxPlayers above 10', () => {
    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 11,
      difficultyCurve: 'medium',
      toneTags: ['anime'],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Max players must be between 2 and 10');
  });

  it('should reject invalid difficulty curve', () => {
    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'invalid' as any,
      toneTags: ['anime'],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid difficulty curve');
  });

  it('should reject empty tone tags', () => {
    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: [],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one tone tag is required');
  });

  it('should reject house rules over 500 characters', () => {
    const params: CreateGameParams = {
      name: 'Test Game',
      hostId: 'user-123',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime'],
      houseRules: 'a'.repeat(501)
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('House rules must be 500 characters or less');
  });

  it('should accept all valid difficulty curves', () => {
    const difficulties: Array<'easy' | 'medium' | 'hard' | 'brutal'> = ['easy', 'medium', 'hard', 'brutal'];
    
    difficulties.forEach(difficulty => {
      const params: CreateGameParams = {
        name: 'Test Game',
        hostId: 'user-123',
        maxPlayers: 4,
        difficultyCurve: difficulty,
        toneTags: ['anime'],
      };

      const result = validateGameParams(params);
      expect(result.valid).toBe(true);
    });
  });

  it('should accumulate multiple validation errors', () => {
    const params: CreateGameParams = {
      name: '',
      hostId: '',
      maxPlayers: 1,
      difficultyCurve: 'invalid' as any,
      toneTags: [],
    };

    const result = validateGameParams(params);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('joinGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully add a new player to a game', async () => {
    const mockGame = {
      id: 'game-123',
      name: 'Test Game',
      inviteCode: 'ABC123',
      maxPlayers: 4,
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
    };

    const mockNewPlayer = {
      id: 'player-456',
      gameId: 'game-123',
      userId: 'user-456',
      role: 'player',
      user: {
        id: 'user-456',
        displayName: 'New Player',
        avatar: null,
      }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    (prisma.gamePlayer.create as jest.Mock).mockResolvedValue(mockNewPlayer);

    const params: JoinGameParams = {
      gameId: 'game-123',
      userId: 'user-456'
    };

    const result = await joinGame(params);

    expect(result.game.id).toBe('game-123');
    expect(result.player.id).toBe('player-456');
    expect(result.player.role).toBe('player');
    expect(result.alreadyJoined).toBe(false);
    expect(prisma.gamePlayer.create).toHaveBeenCalledWith({
      data: {
        gameId: 'game-123',
        userId: 'user-456',
        role: 'player',
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          }
        }
      }
    });
  });

  it('should throw GAME_NOT_FOUND if game does not exist', async () => {
    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

    const params: JoinGameParams = {
      gameId: 'invalid-game',
      userId: 'user-456'
    };

    await expect(joinGame(params)).rejects.toThrow('GAME_NOT_FOUND');
  });

  it('should throw GAME_ALREADY_STARTED if game status is not lobby', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'active',
      players: [],
      maxPlayers: 4,
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const params: JoinGameParams = {
      gameId: 'game-123',
      userId: 'user-456'
    };

    await expect(joinGame(params)).rejects.toThrow('GAME_ALREADY_STARTED');
  });

  it('should throw GAME_FULL if game is at max capacity', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'lobby',
      maxPlayers: 2,
      players: [
        { id: 'player-1', userId: 'user-1' },
        { id: 'player-2', userId: 'user-2' }
      ]
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const params: JoinGameParams = {
      gameId: 'game-123',
      userId: 'user-456'
    };

    await expect(joinGame(params)).rejects.toThrow('GAME_FULL');
  });

  it('should return existing player if user already joined', async () => {
    const existingPlayer = {
      id: 'player-456',
      userId: 'user-456',
      role: 'player',
      user: {
        id: 'user-456',
        displayName: 'Existing Player',
        avatar: null,
      }
    };

    const mockGame = {
      id: 'game-123',
      name: 'Test Game',
      status: 'lobby',
      maxPlayers: 4,
      players: [
        {
          id: 'player-123',
          userId: 'user-123',
          role: 'host',
          user: { id: 'user-123', displayName: 'Host User', avatar: null }
        },
        existingPlayer
      ],
      host: {
        id: 'user-123',
        displayName: 'Host User',
        avatar: null,
      }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const params: JoinGameParams = {
      gameId: 'game-123',
      userId: 'user-456'
    };

    const result = await joinGame(params);

    expect(result.game.id).toBe('game-123');
    expect(result.player.id).toBe('player-456');
    expect(result.alreadyJoined).toBe(true);
    expect(prisma.gamePlayer.create).not.toHaveBeenCalled();
  });

  it('should allow joining when game has space', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'lobby',
      maxPlayers: 4,
      players: [
        { id: 'player-1', userId: 'user-1' },
        { id: 'player-2', userId: 'user-2' }
      ],
      host: {
        id: 'user-1',
        displayName: 'Host',
        avatar: null,
      }
    };

    const mockNewPlayer = {
      id: 'player-3',
      gameId: 'game-123',
      userId: 'user-3',
      role: 'player',
      user: {
        id: 'user-3',
        displayName: 'Player 3',
        avatar: null,
      }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    (prisma.gamePlayer.create as jest.Mock).mockResolvedValue(mockNewPlayer);

    const params: JoinGameParams = {
      gameId: 'game-123',
      userId: 'user-3'
    };

    const result = await joinGame(params);

    expect(result.alreadyJoined).toBe(false);
    expect(result.player.userId).toBe('user-3');
  });
});

describe('findGameByInviteCode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should find game by valid invite code', async () => {
    const mockGame = {
      id: 'game-123',
      name: 'Test Game',
      inviteCode: 'ABC123',
      maxPlayers: 4,
      status: 'lobby',
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
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const result = await findGameByInviteCode('ABC123');

    expect(result).toBeDefined();
    expect(result?.id).toBe('game-123');
    expect(result?.inviteCode).toBe('ABC123');
    expect(prisma.game.findUnique).toHaveBeenCalledWith({
      where: { inviteCode: 'ABC123' },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          }
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatar: true,
              }
            }
          }
        }
      }
    });
  });

  it('should return null for invalid invite code', async () => {
    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await findGameByInviteCode('INVALID');

    expect(result).toBeNull();
  });
});

describe('startGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully start a game with all players having characters', async () => {
    const mockGame = {
      id: 'game-123',
      name: 'Test Game',
      hostId: 'user-host',
      status: 'lobby',
      host: {
        id: 'user-host',
        displayName: 'Host User',
        avatar: null,
      },
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          role: 'host',
          characterId: 'char-1',
          user: { id: 'user-1', displayName: 'Player 1', avatar: null },
          character: { id: 'char-1', name: 'Character 1', imageUrl: 'http://example.com/char1.png' }
        },
        {
          id: 'player-2',
          userId: 'user-2',
          role: 'player',
          characterId: 'char-2',
          user: { id: 'user-2', displayName: 'Player 2', avatar: null },
          character: { id: 'char-2', name: 'Character 2', imageUrl: 'http://example.com/char2.png' }
        },
        {
          id: 'player-3',
          userId: 'user-3',
          role: 'player',
          characterId: 'char-3',
          user: { id: 'user-3', displayName: 'Player 3', avatar: null },
          character: { id: 'char-3', name: 'Character 3', imageUrl: 'http://example.com/char3.png' }
        }
      ]
    };

    const mockUpdatedGame = {
      ...mockGame,
      status: 'active',
      turnOrder: ['user-1', 'user-2', 'user-3'],
      currentTurnIndex: 0,
      startedAt: new Date('2024-01-01'),
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-host'
    };

    const result = await startGame(params);

    expect(result.status).toBe('active');
    expect(result.turnOrder).toEqual(['user-1', 'user-2', 'user-3']);
    expect(result.currentTurnIndex).toBe(0);
    expect(result.startedAt).toBeDefined();
    
    expect(prisma.game.update).toHaveBeenCalledWith({
      where: { id: 'game-123' },
      data: {
        status: 'active',
        turnOrder: ['user-1', 'user-2', 'user-3'],
        currentTurnIndex: 0,
        startedAt: expect.any(Date),
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          }
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatar: true,
              }
            },
            character: true
          }
        }
      }
    });
  });

  it('should throw GAME_NOT_FOUND if game does not exist', async () => {
    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

    const params: StartGameParams = {
      gameId: 'invalid-game',
      hostId: 'user-host'
    };

    await expect(startGame(params)).rejects.toThrow('GAME_NOT_FOUND');
  });

  it('should throw UNAUTHORIZED_NOT_HOST if user is not the host', async () => {
    const mockGame = {
      id: 'game-123',
      hostId: 'user-host',
      status: 'lobby',
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          characterId: 'char-1',
          character: { id: 'char-1' }
        }
      ]
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-not-host'
    };

    await expect(startGame(params)).rejects.toThrow('UNAUTHORIZED_NOT_HOST');
  });

  it('should throw GAME_ALREADY_STARTED if game status is not lobby', async () => {
    const mockGame = {
      id: 'game-123',
      hostId: 'user-host',
      status: 'active',
      players: []
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-host'
    };

    await expect(startGame(params)).rejects.toThrow('GAME_ALREADY_STARTED');
  });

  it('should throw INCOMPLETE_CHARACTER_CREATION if any player lacks a character', async () => {
    const mockGame = {
      id: 'game-123',
      hostId: 'user-host',
      status: 'lobby',
      host: {
        id: 'user-host',
        displayName: 'Host User',
        avatar: null,
      },
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          characterId: 'char-1',
          character: { id: 'char-1' }
        },
        {
          id: 'player-2',
          userId: 'user-2',
          characterId: null,
          character: null
        }
      ]
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-host'
    };

    await expect(startGame(params)).rejects.toThrow('INCOMPLETE_CHARACTER_CREATION');
  });

  it('should establish turn order from all players', async () => {
    const mockGame = {
      id: 'game-123',
      hostId: 'user-host',
      status: 'lobby',
      host: {
        id: 'user-host',
        displayName: 'Host User',
        avatar: null,
      },
      players: [
        {
          id: 'player-1',
          userId: 'user-alpha',
          characterId: 'char-1',
          character: { id: 'char-1' }
        },
        {
          id: 'player-2',
          userId: 'user-beta',
          characterId: 'char-2',
          character: { id: 'char-2' }
        },
        {
          id: 'player-3',
          userId: 'user-gamma',
          characterId: 'char-3',
          character: { id: 'char-3' }
        }
      ]
    };

    const mockUpdatedGame = {
      ...mockGame,
      status: 'active',
      turnOrder: ['user-alpha', 'user-beta', 'user-gamma'],
      currentTurnIndex: 0,
      startedAt: new Date(),
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-host'
    };

    const result = await startGame(params);

    expect(result.turnOrder).toEqual(['user-alpha', 'user-beta', 'user-gamma']);
    expect(result.turnOrder.length).toBe(3);
  });

  it('should set currentTurnIndex to 0 when starting', async () => {
    const mockGame = {
      id: 'game-123',
      hostId: 'user-host',
      status: 'lobby',
      host: {
        id: 'user-host',
        displayName: 'Host User',
        avatar: null,
      },
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          characterId: 'char-1',
          character: { id: 'char-1' }
        }
      ]
    };

    const mockUpdatedGame = {
      ...mockGame,
      status: 'active',
      turnOrder: ['user-1'],
      currentTurnIndex: 0,
      startedAt: new Date(),
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-host'
    };

    const result = await startGame(params);

    expect(result.currentTurnIndex).toBe(0);
  });

  it('should set startedAt timestamp when starting', async () => {
    const mockGame = {
      id: 'game-123',
      hostId: 'user-host',
      status: 'lobby',
      host: {
        id: 'user-host',
        displayName: 'Host User',
        avatar: null,
      },
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          characterId: 'char-1',
          character: { id: 'char-1' }
        }
      ]
    };

    const startTime = new Date('2024-01-15T10:00:00Z');
    const mockUpdatedGame = {
      ...mockGame,
      status: 'active',
      turnOrder: ['user-1'],
      currentTurnIndex: 0,
      startedAt: startTime,
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame);

    const params: StartGameParams = {
      gameId: 'game-123',
      hostId: 'user-host'
    };

    const result = await startGame(params);

    expect(result.startedAt).toBeDefined();
    expect(result.startedAt).toBeInstanceOf(Date);
  });
});

describe('leaveGame', () => {
  const { leaveGame } = require('../game-manager');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully remove a player from a game', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'lobby',
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          role: 'host',
          user: { id: 'user-1', displayName: 'Host', avatar: null }
        },
        {
          id: 'player-2',
          userId: 'user-2',
          role: 'player',
          user: { id: 'user-2', displayName: 'Player', avatar: null }
        }
      ],
      host: { id: 'user-1', displayName: 'Host', avatar: null }
    };

    const mockUpdatedGame = {
      id: 'game-123',
      status: 'lobby',
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          role: 'host',
          user: { id: 'user-1', displayName: 'Host', avatar: null }
        }
      ],
      host: { id: 'user-1', displayName: 'Host', avatar: null }
    };

    (prisma.game.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockGame)
      .mockResolvedValueOnce(mockUpdatedGame);
    (prisma.gamePlayer.delete as jest.Mock).mockResolvedValue({ id: 'player-2' });

    const result = await leaveGame({
      gameId: 'game-123',
      userId: 'user-2'
    });

    expect(result.game.id).toBe('game-123');
    expect(result.game.players).toHaveLength(1);
    expect(result.removedPlayerId).toBe('user-2');
    expect(prisma.gamePlayer.delete).toHaveBeenCalledWith({
      where: { id: 'player-2' }
    });
  });

  it('should throw GAME_NOT_FOUND if game does not exist', async () => {
    (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(leaveGame({
      gameId: 'invalid-game',
      userId: 'user-1'
    })).rejects.toThrow('GAME_NOT_FOUND');
  });

  it('should throw PLAYER_NOT_IN_GAME if player is not in the game', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'lobby',
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          role: 'host',
          user: { id: 'user-1', displayName: 'Host', avatar: null }
        }
      ],
      host: { id: 'user-1', displayName: 'Host', avatar: null }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    await expect(leaveGame({
      gameId: 'game-123',
      userId: 'user-999'
    })).rejects.toThrow('PLAYER_NOT_IN_GAME');
  });

  it('should throw CANNOT_LEAVE_ACTIVE_GAME if game has already started', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'active',
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          role: 'host',
          user: { id: 'user-1', displayName: 'Host', avatar: null }
        },
        {
          id: 'player-2',
          userId: 'user-2',
          role: 'player',
          user: { id: 'user-2', displayName: 'Player', avatar: null }
        }
      ],
      host: { id: 'user-1', displayName: 'Host', avatar: null }
    };

    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

    await expect(leaveGame({
      gameId: 'game-123',
      userId: 'user-2'
    })).rejects.toThrow('CANNOT_LEAVE_ACTIVE_GAME');
  });

  it('should allow host to leave the game', async () => {
    const mockGame = {
      id: 'game-123',
      status: 'lobby',
      players: [
        {
          id: 'player-1',
          userId: 'user-1',
          role: 'host',
          user: { id: 'user-1', displayName: 'Host', avatar: null }
        },
        {
          id: 'player-2',
          userId: 'user-2',
          role: 'player',
          user: { id: 'user-2', displayName: 'Player', avatar: null }
        }
      ],
      host: { id: 'user-1', displayName: 'Host', avatar: null }
    };

    const mockUpdatedGame = {
      id: 'game-123',
      status: 'lobby',
      players: [
        {
          id: 'player-2',
          userId: 'user-2',
          role: 'player',
          user: { id: 'user-2', displayName: 'Player', avatar: null }
        }
      ],
      host: { id: 'user-1', displayName: 'Host', avatar: null }
    };

    (prisma.game.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockGame)
      .mockResolvedValueOnce(mockUpdatedGame);
    (prisma.gamePlayer.delete as jest.Mock).mockResolvedValue({ id: 'player-1' });

    const result = await leaveGame({
      gameId: 'game-123',
      userId: 'user-1'
    });

    expect(result.removedPlayerId).toBe('user-1');
    expect(prisma.gamePlayer.delete).toHaveBeenCalledWith({
      where: { id: 'player-1' }
    });
  });
});

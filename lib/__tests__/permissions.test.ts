/**
 * Unit tests for permission validation utilities
 * Tests host-only, active-player-only, and general game state permissions
 */

import {
  isGameHost,
  isActivePlayer,
  isPlayerInGame,
  canStartGame,
  canEndGame,
  canSubmitAction,
  canModifyGameSettings,
  canViewGame,
  canCreateCharacter,
  canJoinGame,
  canLeaveGame,
  enforcePermission,
  checkAllPermissions,
  PermissionErrors,
} from '../permissions';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
    },
    gamePlayer: {
      findFirst: jest.fn(),
    },
  },
}));

describe('Permission Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGameHost', () => {
    it('should allow host to perform host actions', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        hostId: 'user-1',
      } as any);

      const result = await isGameHost('game-1', 'user-1');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny non-host users', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        hostId: 'user-1',
      } as any);

      const result = await isGameHost('game-1', 'user-2');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_HOST);
      expect(result.reason).toContain('host');
    });

    it('should deny when game not found', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isGameHost('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.GAME_NOT_FOUND);
    });
  });

  describe('isActivePlayer', () => {
    it('should allow active player to perform turn actions', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        turnOrder: ['user-1', 'user-2', 'user-3'],
        currentTurnIndex: 1,
      } as any);

      const result = await isActivePlayer('game-1', 'user-2');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny non-active players', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        turnOrder: ['user-1', 'user-2', 'user-3'],
        currentTurnIndex: 1,
      } as any);

      const result = await isActivePlayer('game-1', 'user-3');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_ACTIVE_PLAYER);
      expect(result.reason).toContain('active player');
    });

    it('should deny when game is not active', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
        turnOrder: ['user-1', 'user-2'],
        currentTurnIndex: 0,
      } as any);

      const result = await isActivePlayer('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('not active');
    });

    it('should deny when turn order is empty', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        turnOrder: [],
        currentTurnIndex: 0,
      } as any);

      const result = await isActivePlayer('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('empty');
    });

    it('should deny when game not found', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await isActivePlayer('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.GAME_NOT_FOUND);
    });
  });

  describe('isPlayerInGame', () => {
    it('should allow players in the game', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      const result = await isPlayerInGame('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny users not in the game', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await isPlayerInGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.PLAYER_NOT_IN_GAME);
    });
  });

  describe('canStartGame', () => {
    it('should allow host to start game when all players have characters', async () => {
      (prisma.game.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'game-1',
          hostId: 'user-1',
        } as any)
        .mockResolvedValueOnce({
          id: 'game-1',
          status: 'lobby',
          players: [
            { characterId: 'char-1' },
            { characterId: 'char-2' },
          ],
        } as any);

      const result = await canStartGame('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-host from starting game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        hostId: 'user-1',
      } as any);

      const result = await canStartGame('game-1', 'user-2');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_HOST);
    });

    it('should deny starting game when players lack characters', async () => {
      (prisma.game.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'game-1',
          hostId: 'user-1',
        } as any)
        .mockResolvedValueOnce({
          id: 'game-1',
          status: 'lobby',
          players: [
            { characterId: 'char-1' },
            { characterId: null },
          ],
        } as any);

      const result = await canStartGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('not created characters');
    });

    it('should deny starting game that has already started', async () => {
      (prisma.game.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'game-1',
          hostId: 'user-1',
        } as any)
        .mockResolvedValueOnce({
          id: 'game-1',
          status: 'active',
          players: [
            { characterId: 'char-1' },
            { characterId: 'char-2' },
          ],
        } as any);

      const result = await canStartGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('already started');
    });
  });

  describe('canEndGame', () => {
    it('should allow host to end game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        hostId: 'user-1',
      } as any);

      const result = await canEndGame('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-host from ending game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        hostId: 'user-1',
      } as any);

      const result = await canEndGame('game-1', 'user-2');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_HOST);
    });
  });

  describe('canSubmitAction', () => {
    it('should allow active player to submit action', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        turnOrder: ['user-1', 'user-2'],
        currentTurnIndex: 0,
      } as any);

      const result = await canSubmitAction('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-active player from submitting action', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        turnOrder: ['user-1', 'user-2'],
        currentTurnIndex: 0,
      } as any);

      const result = await canSubmitAction('game-1', 'user-2');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_ACTIVE_PLAYER);
    });
  });

  describe('canModifyGameSettings', () => {
    it('should allow host to modify settings in lobby', async () => {
      (prisma.game.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'game-1',
          hostId: 'user-1',
        } as any)
        .mockResolvedValueOnce({
          id: 'game-1',
          status: 'lobby',
        } as any);

      const result = await canModifyGameSettings('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-host from modifying settings', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        hostId: 'user-1',
      } as any);

      const result = await canModifyGameSettings('game-1', 'user-2');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_HOST);
    });

    it('should deny modifying settings after game started', async () => {
      (prisma.game.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'game-1',
          hostId: 'user-1',
        } as any)
        .mockResolvedValueOnce({
          id: 'game-1',
          status: 'active',
        } as any);

      const result = await canModifyGameSettings('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('after game has started');
    });
  });

  describe('canViewGame', () => {
    it('should allow players to view game', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      const result = await canViewGame('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-players from viewing game', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await canViewGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.PLAYER_NOT_IN_GAME);
    });
  });

  describe('canCreateCharacter', () => {
    it('should allow player to create character in lobby', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
        players: [{ characterId: null }],
      } as any);

      const result = await canCreateCharacter('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-player from creating character', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await canCreateCharacter('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.PLAYER_NOT_IN_GAME);
    });

    it('should deny creating character after game started', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        players: [{ characterId: null }],
      } as any);

      const result = await canCreateCharacter('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('after game has started');
    });

    it('should deny creating second character', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
        players: [{ characterId: 'char-1' }],
      } as any);

      const result = await canCreateCharacter('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('already has a character');
    });
  });

  describe('canJoinGame', () => {
    it('should allow joining game in lobby with space', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
        maxPlayers: 4,
        players: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      } as any);

      const result = await canJoinGame('game-1', 'user-3');

      expect(result.allowed).toBe(true);
    });

    it('should allow if user is already in game (idempotent)', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
        maxPlayers: 4,
        players: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      } as any);

      const result = await canJoinGame('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny joining game that has started', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
        maxPlayers: 4,
        players: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      } as any);

      const result = await canJoinGame('game-1', 'user-3');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('already started');
    });

    it('should deny joining full game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
        maxPlayers: 2,
        players: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      } as any);

      const result = await canJoinGame('game-1', 'user-3');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('full');
    });

    it('should deny when game not found', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await canJoinGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.GAME_NOT_FOUND);
    });
  });

  describe('canLeaveGame', () => {
    it('should allow player to leave game in lobby', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'lobby',
      } as any);

      const result = await canLeaveGame('game-1', 'user-1');

      expect(result.allowed).toBe(true);
    });

    it('should deny non-player from leaving', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await canLeaveGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.PLAYER_NOT_IN_GAME);
    });

    it('should deny leaving after game started', async () => {
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue({
        id: 'player-1',
        gameId: 'game-1',
        userId: 'user-1',
      } as any);

      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        id: 'game-1',
        status: 'active',
      } as any);

      const result = await canLeaveGame('game-1', 'user-1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.INVALID_GAME_STATE);
      expect(result.reason).toContain('after it has started');
    });
  });

  describe('enforcePermission', () => {
    it('should not throw for allowed permissions', () => {
      const result = { allowed: true };

      expect(() => enforcePermission(result)).not.toThrow();
    });

    it('should throw for denied permissions', () => {
      const result = {
        allowed: false,
        error: PermissionErrors.UNAUTHORIZED_NOT_HOST,
        reason: 'Not the host',
      };

      expect(() => enforcePermission(result)).toThrow(PermissionErrors.UNAUTHORIZED_NOT_HOST);
    });

    it('should throw generic error if no error code provided', () => {
      const result = {
        allowed: false,
        reason: 'Some reason',
      };

      expect(() => enforcePermission(result)).toThrow('PERMISSION_DENIED');
    });
  });

  describe('checkAllPermissions', () => {
    it('should return success when all checks pass', async () => {
      const checks = [
        Promise.resolve({ allowed: true }),
        Promise.resolve({ allowed: true }),
        Promise.resolve({ allowed: true }),
      ];

      const result = await checkAllPermissions(checks);

      expect(result.allowed).toBe(true);
    });

    it('should return first failure when any check fails', async () => {
      const checks = [
        Promise.resolve({ allowed: true }),
        Promise.resolve({
          allowed: false,
          error: PermissionErrors.UNAUTHORIZED_NOT_HOST,
          reason: 'Not host',
        }),
        Promise.resolve({ allowed: true }),
      ];

      const result = await checkAllPermissions(checks);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe(PermissionErrors.UNAUTHORIZED_NOT_HOST);
    });

    it('should handle empty checks array', async () => {
      const result = await checkAllPermissions([]);

      expect(result.allowed).toBe(true);
    });
  });
});

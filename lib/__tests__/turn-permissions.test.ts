/**
 * Turn Permission Enforcement Unit Tests
 * Tests permission validation for action submissions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  validateTurnPermission,
  requireTurnPermission,
  isTurnPermissionError,
  TurnPermissionError,
  PermissionErrorCode,
} from '../turn-permissions';
import { isActivePlayer } from '../turn-manager';

// Mock turn-manager
jest.mock('../turn-manager', () => ({
  isActivePlayer: jest.fn(),
}));

describe('Turn Permission Enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTurnPermission', () => {
    it('should allow action when user is the active player', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(true);

      const result = await validateTurnPermission('game1', 'user1');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
      expect(isActivePlayer).toHaveBeenCalledWith('game1', 'user1');
    });

    it('should reject action when user is not the active player', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(false);

      const result = await validateTurnPermission('game1', 'user2');

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(PermissionErrorCode.NOT_YOUR_TURN);
      expect(result.error?.message).toBe('You cannot submit actions when it is not your turn');
    });

    it('should handle errors from isActivePlayer gracefully', async () => {
      (isActivePlayer as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await validateTurnPermission('game1', 'user1');

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe(PermissionErrorCode.PLAYER_NOT_IN_GAME);
      expect(result.error?.message).toBe('Unable to verify player permissions');
    });

    it('should validate different game and user combinations', async () => {
      (isActivePlayer as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result1 = await validateTurnPermission('game1', 'user1');
      const result2 = await validateTurnPermission('game1', 'user2');
      const result3 = await validateTurnPermission('game2', 'user3');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(false);
      expect(result3.allowed).toBe(true);
    });
  });

  describe('requireTurnPermission', () => {
    it('should not throw when user has permission', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(true);

      await expect(requireTurnPermission('game1', 'user1')).resolves.not.toThrow();
    });

    it('should throw TurnPermissionError when user does not have permission', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(false);

      await expect(requireTurnPermission('game1', 'user2')).rejects.toThrow(TurnPermissionError);
    });

    it('should throw error with correct code and message', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(false);

      try {
        await requireTurnPermission('game1', 'user2');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TurnPermissionError);
        if (error instanceof TurnPermissionError) {
          expect(error.code).toBe(PermissionErrorCode.NOT_YOUR_TURN);
          expect(error.message).toBe('You cannot submit actions when it is not your turn');
        }
      }
    });

    it('should throw error when isActivePlayer fails', async () => {
      (isActivePlayer as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(requireTurnPermission('game1', 'user1')).rejects.toThrow(TurnPermissionError);
    });

    it('should throw error with PLAYER_NOT_IN_GAME code on internal errors', async () => {
      (isActivePlayer as jest.Mock).mockRejectedValue(new Error('Database error'));

      try {
        await requireTurnPermission('game1', 'user1');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(TurnPermissionError);
        if (error instanceof TurnPermissionError) {
          expect(error.code).toBe(PermissionErrorCode.PLAYER_NOT_IN_GAME);
        }
      }
    });
  });

  describe('isTurnPermissionError', () => {
    it('should return true for TurnPermissionError instances', () => {
      const error = new TurnPermissionError(
        PermissionErrorCode.NOT_YOUR_TURN,
        'Test error'
      );

      expect(isTurnPermissionError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error');

      expect(isTurnPermissionError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isTurnPermissionError('string')).toBe(false);
      expect(isTurnPermissionError(null)).toBe(false);
      expect(isTurnPermissionError(undefined)).toBe(false);
      expect(isTurnPermissionError({})).toBe(false);
      expect(isTurnPermissionError(123)).toBe(false);
    });

    it('should correctly identify TurnPermissionError with different codes', () => {
      const error1 = new TurnPermissionError(
        PermissionErrorCode.NOT_YOUR_TURN,
        'Not your turn'
      );
      const error2 = new TurnPermissionError(
        PermissionErrorCode.PLAYER_NOT_IN_GAME,
        'Player not in game'
      );

      expect(isTurnPermissionError(error1)).toBe(true);
      expect(isTurnPermissionError(error2)).toBe(true);
    });
  });

  describe('TurnPermissionError', () => {
    it('should create error with correct properties', () => {
      const error = new TurnPermissionError(
        PermissionErrorCode.NOT_YOUR_TURN,
        'Test message'
      );

      expect(error.name).toBe('TurnPermissionError');
      expect(error.code).toBe(PermissionErrorCode.NOT_YOUR_TURN);
      expect(error.message).toBe('Test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('should support all error codes', () => {
      const error1 = new TurnPermissionError(
        PermissionErrorCode.NOT_YOUR_TURN,
        'Message 1'
      );
      const error2 = new TurnPermissionError(
        PermissionErrorCode.GAME_NOT_ACTIVE,
        'Message 2'
      );
      const error3 = new TurnPermissionError(
        PermissionErrorCode.PLAYER_NOT_IN_GAME,
        'Message 3'
      );

      expect(error1.code).toBe(PermissionErrorCode.NOT_YOUR_TURN);
      expect(error2.code).toBe(PermissionErrorCode.GAME_NOT_ACTIVE);
      expect(error3.code).toBe(PermissionErrorCode.PLAYER_NOT_IN_GAME);
    });
  });

  describe('PermissionErrorCode', () => {
    it('should have all expected error codes', () => {
      expect(PermissionErrorCode.NOT_YOUR_TURN).toBe('NOT_YOUR_TURN');
      expect(PermissionErrorCode.GAME_NOT_ACTIVE).toBe('GAME_NOT_ACTIVE');
      expect(PermissionErrorCode.PLAYER_NOT_IN_GAME).toBe('PLAYER_NOT_IN_GAME');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string gameId', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(false);

      const result = await validateTurnPermission('', 'user1');

      expect(result.allowed).toBe(false);
      expect(isActivePlayer).toHaveBeenCalledWith('', 'user1');
    });

    it('should handle empty string userId', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(false);

      const result = await validateTurnPermission('game1', '');

      expect(result.allowed).toBe(false);
      expect(isActivePlayer).toHaveBeenCalledWith('game1', '');
    });

    it('should handle very long IDs', async () => {
      const longId = 'a'.repeat(1000);
      (isActivePlayer as jest.Mock).mockResolvedValue(true);

      const result = await validateTurnPermission(longId, longId);

      expect(result.allowed).toBe(true);
      expect(isActivePlayer).toHaveBeenCalledWith(longId, longId);
    });

    it('should handle special characters in IDs', async () => {
      const specialId = 'game-123_test@example.com';
      (isActivePlayer as jest.Mock).mockResolvedValue(true);

      const result = await validateTurnPermission(specialId, specialId);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Integration with isActivePlayer', () => {
    it('should correctly interpret isActivePlayer returning true', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(true);

      const result = await validateTurnPermission('game1', 'user1');

      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should correctly interpret isActivePlayer returning false', async () => {
      (isActivePlayer as jest.Mock).mockResolvedValue(false);

      const result = await validateTurnPermission('game1', 'user1');

      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(PermissionErrorCode.NOT_YOUR_TURN);
    });

    it('should handle isActivePlayer throwing specific errors', async () => {
      (isActivePlayer as jest.Mock).mockRejectedValue(new Error('GAME_NOT_FOUND'));

      const result = await validateTurnPermission('game1', 'user1');

      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe(PermissionErrorCode.PLAYER_NOT_IN_GAME);
    });
  });
});

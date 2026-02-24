/**
 * Turn Manager Unit Tests
 * Tests turn order tracking, active player designation, and turn advancement
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  getActivePlayer,
  isCharacterDead,
  getAlivePlayers,
  advanceTurn,
  isActivePlayer,
  validateTurnOrder,
  getTurnOrderWithDetails,
  type PowerSheet,
} from '../turn-manager';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gamePlayer: {
      findFirst: jest.fn(),
    },
  }
}));

// Import after mocking
import { prisma } from '../prisma';

describe('Turn Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCharacterDead', () => {
    it('should return true when HP is 0', () => {
      const powerSheet: PowerSheet = {
        level: 1,
        hp: 0,
        maxHp: 100,
        attributes: { strength: 50, agility: 50, intelligence: 50, charisma: 50, endurance: 50 },
        abilities: [],
        weakness: 'test',
        statuses: [],
        perks: [],
      };

      expect(isCharacterDead(powerSheet)).toBe(true);
    });

    it('should return true when HP is negative', () => {
      const powerSheet: PowerSheet = {
        level: 1,
        hp: -10,
        maxHp: 100,
        attributes: { strength: 50, agility: 50, intelligence: 50, charisma: 50, endurance: 50 },
        abilities: [],
        weakness: 'test',
        statuses: [],
        perks: [],
      };

      expect(isCharacterDead(powerSheet)).toBe(true);
    });

    it('should return false when HP is positive', () => {
      const powerSheet: PowerSheet = {
        level: 1,
        hp: 50,
        maxHp: 100,
        attributes: { strength: 50, agility: 50, intelligence: 50, charisma: 50, endurance: 50 },
        abilities: [],
        weakness: 'test',
        statuses: [],
        perks: [],
      };

      expect(isCharacterDead(powerSheet)).toBe(false);
    });
  });

  describe('getActivePlayer', () => {
    it('should return the current active player', async () => {
      const mockGame = {
        status: 'active',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
      };

      const mockPlayer = {
        id: 'player1',
        userId: 'user1',
        gameId: 'game1',
        role: 'host',
        user: {
          id: 'user1',
          displayName: 'Player 1',
          avatar: null,
        },
        character: {
          id: 'char1',
          name: 'Test Character',
          powerSheet: {
            hp: 100,
            maxHp: 100,
          },
        },
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(mockPlayer);

      const result = await getActivePlayer('game1');

      expect(result).toEqual(mockPlayer);
      expect(prisma.game.findUnique).toHaveBeenCalledWith({
        where: { id: 'game1' },
        select: {
          status: true,
          turnOrder: true,
          currentTurnIndex: true,
        }
      });
    });

    it('should return null for non-active game', async () => {
      const mockGame = {
        status: 'lobby',
        turnOrder: ['user1'],
        currentTurnIndex: 0,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await getActivePlayer('game1');

      expect(result).toBeNull();
    });

    it('should return null for game with empty turn order', async () => {
      const mockGame = {
        status: 'active',
        turnOrder: [],
        currentTurnIndex: 0,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await getActivePlayer('game1');

      expect(result).toBeNull();
    });

    it('should return null for non-existent game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getActivePlayer('game1');

      expect(result).toBeNull();
    });
  });

  describe('getAlivePlayers', () => {
    it('should return only players with HP > 0', async () => {
      const mockGame = {
        id: 'game1',
        players: [
          {
            id: 'player1',
            userId: 'user1',
            character: {
              id: 'char1',
              powerSheet: { hp: 100, maxHp: 100 },
            },
          },
          {
            id: 'player2',
            userId: 'user2',
            character: {
              id: 'char2',
              powerSheet: { hp: 0, maxHp: 100 },
            },
          },
          {
            id: 'player3',
            userId: 'user3',
            character: {
              id: 'char3',
              powerSheet: { hp: 50, maxHp: 100 },
            },
          },
        ],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await getAlivePlayers('game1');

      expect(result).toHaveLength(2);
      expect(result.map(p => p.userId)).toContain('user1');
      expect(result.map(p => p.userId)).toContain('user3');
      expect(result.map(p => p.userId)).not.toContain('user2');
    });

    it('should return empty array when all players are dead', async () => {
      const mockGame = {
        id: 'game1',
        players: [
          {
            id: 'player1',
            userId: 'user1',
            character: {
              id: 'char1',
              powerSheet: { hp: 0, maxHp: 100 },
            },
          },
          {
            id: 'player2',
            userId: 'user2',
            character: {
              id: 'char2',
              powerSheet: { hp: -5, maxHp: 100 },
            },
          },
        ],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);

      const result = await getAlivePlayers('game1');

      expect(result).toHaveLength(0);
    });

    it('should throw error for non-existent game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getAlivePlayers('non-existent-id')).rejects.toThrow('GAME_NOT_FOUND');
    });
  });

  describe('advanceTurn', () => {
    it('should advance to the next player in turn order', async () => {
      const mockGame = {
        id: 'game1',
        status: 'active',
        turnOrder: ['user1', 'user2', 'user3'],
        currentTurnIndex: 0,
        players: [
          {
            id: 'player1',
            userId: 'user1',
            user: { id: 'user1', displayName: 'Player 1', avatar: null },
            character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
          },
          {
            id: 'player2',
            userId: 'user2',
            user: { id: 'user2', displayName: 'Player 2', avatar: null },
            character: { id: 'char2', powerSheet: { hp: 100, maxHp: 100 } },
          },
          {
            id: 'player3',
            userId: 'user3',
            user: { id: 'user3', displayName: 'Player 3', avatar: null },
            character: { id: 'char3', powerSheet: { hp: 100, maxHp: 100 } },
          },
        ],
      };

      const mockUpdatedGame = {
        ...mockGame,
        currentTurnIndex: 1,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);
      (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame as any);

      const result = await advanceTurn('game1');

      expect(result.activePlayer.userId).toBe('user2');
      expect(result.game.currentTurnIndex).toBe(1);
    });

    it('should skip dead players when advancing turn', async () => {
      const mockGame = {
        id: 'game1',
        status: 'active',
        turnOrder: ['user1', 'user2', 'user3'],
        currentTurnIndex: 0,
        players: [
          {
            id: 'player1',
            userId: 'user1',
            user: { id: 'user1', displayName: 'Player 1', avatar: null },
            character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
          },
          {
            id: 'player2',
            userId: 'user2',
            user: { id: 'user2', displayName: 'Player 2', avatar: null },
            character: { id: 'char2', powerSheet: { hp: 0, maxHp: 100 } },
          },
          {
            id: 'player3',
            userId: 'user3',
            user: { id: 'user3', displayName: 'Player 3', avatar: null },
            character: { id: 'char3', powerSheet: { hp: 100, maxHp: 100 } },
          },
        ],
      };

      const mockUpdatedGame = {
        ...mockGame,
        currentTurnIndex: 2,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);
      (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame as any);

      const result = await advanceTurn('game1');

      expect(result.activePlayer.userId).toBe('user3');
      expect(result.game.currentTurnIndex).toBe(2);
    });

    it('should wrap around to the beginning of turn order', async () => {
      const mockGame = {
        id: 'game1',
        status: 'active',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 1,
        players: [
          {
            id: 'player1',
            userId: 'user1',
            user: { id: 'user1', displayName: 'Player 1', avatar: null },
            character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
          },
          {
            id: 'player2',
            userId: 'user2',
            user: { id: 'user2', displayName: 'Player 2', avatar: null },
            character: { id: 'char2', powerSheet: { hp: 100, maxHp: 100 } },
          },
        ],
      };

      const mockUpdatedGame = {
        ...mockGame,
        currentTurnIndex: 0,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);
      (prisma.game.update as jest.Mock).mockResolvedValue(mockUpdatedGame as any);

      const result = await advanceTurn('game1');

      expect(result.activePlayer.userId).toBe('user1');
      expect(result.game.currentTurnIndex).toBe(0);
    });

    it('should throw error when no alive players remain', async () => {
      const mockGame = {
        id: 'game1',
        status: 'active',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
        players: [
          {
            id: 'player1',
            userId: 'user1',
            character: { id: 'char1', powerSheet: { hp: 0, maxHp: 100 } },
          },
          {
            id: 'player2',
            userId: 'user2',
            character: { id: 'char2', powerSheet: { hp: 0, maxHp: 100 } },
          },
        ],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      await expect(advanceTurn('game1')).rejects.toThrow('NO_ALIVE_PLAYERS');
    });

    it('should throw error for non-active game', async () => {
      const mockGame = {
        id: 'game1',
        status: 'lobby',
        turnOrder: ['user1'],
        currentTurnIndex: 0,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      await expect(advanceTurn('game1')).rejects.toThrow('GAME_NOT_ACTIVE');
    });

    it('should throw error for non-existent game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(advanceTurn('game1')).rejects.toThrow('GAME_NOT_FOUND');
    });
  });

  describe('isActivePlayer', () => {
    it('should return true for the active player', async () => {
      const mockGame = {
        status: 'active',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
      };

      const mockPlayer = {
        id: 'player1',
        userId: 'user1',
        user: { id: 'user1', displayName: 'Player 1', avatar: null },
        character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(mockPlayer as any);

      const result = await isActivePlayer('game1', 'user1');

      expect(result).toBe(true);
    });

    it('should return false for non-active player', async () => {
      const mockGame = {
        status: 'active',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
      };

      const mockPlayer = {
        id: 'player1',
        userId: 'user1',
        user: { id: 'user1', displayName: 'Player 1', avatar: null },
        character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(mockPlayer as any);

      const result = await isActivePlayer('game1', 'user2');

      expect(result).toBe(false);
    });

    it('should return false for non-existent player', async () => {
      const mockGame = {
        status: 'active',
        turnOrder: ['user1'],
        currentTurnIndex: 0,
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);
      (prisma.gamePlayer.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await isActivePlayer('game1', 'non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('validateTurnOrder', () => {
    it('should validate correct turn order', async () => {
      const mockGame = {
        id: 'game1',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
        players: [
          { userId: 'user1' },
          { userId: 'user2' },
        ],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      const result = await validateTurnOrder('game1');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty turn order', async () => {
      const mockGame = {
        id: 'game1',
        turnOrder: [],
        currentTurnIndex: 0,
        players: [{ userId: 'user1' }],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      const result = await validateTurnOrder('game1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Turn order is empty');
    });

    it('should detect invalid turn index', async () => {
      const mockGame = {
        id: 'game1',
        turnOrder: ['user1'],
        currentTurnIndex: 5,
        players: [{ userId: 'user1' }],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      const result = await validateTurnOrder('game1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('out of bounds'))).toBe(true);
    });

    it('should detect player in turn order not in game', async () => {
      const mockGame = {
        id: 'game1',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
        players: [{ userId: 'user1' }],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      const result = await validateTurnOrder('game1');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('does not exist in game'))).toBe(true);
    });
  });

  describe('getTurnOrderWithDetails', () => {
    it('should return turn order with player details', async () => {
      const mockGame = {
        id: 'game1',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
        players: [
          {
            id: 'player1',
            userId: 'user1',
            user: { id: 'user1', displayName: 'Player 1', avatar: null },
            character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
          },
          {
            id: 'player2',
            userId: 'user2',
            user: { id: 'user2', displayName: 'Player 2', avatar: null },
            character: { id: 'char2', powerSheet: { hp: 50, maxHp: 100 } },
          },
        ],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      const result = await getTurnOrderWithDetails('game1');

      expect(result.turnOrder).toHaveLength(2);
      expect(result.currentTurnIndex).toBe(0);
      expect(result.activePlayerId).toBe('user1');
      expect(result.turnOrder[0].isActive).toBe(true);
      expect(result.turnOrder[0].isAlive).toBe(true);
      expect(result.turnOrder[1].isActive).toBe(false);
      expect(result.turnOrder[1].isAlive).toBe(true);
    });

    it('should mark dead players correctly', async () => {
      const mockGame = {
        id: 'game1',
        turnOrder: ['user1', 'user2'],
        currentTurnIndex: 0,
        players: [
          {
            id: 'player1',
            userId: 'user1',
            user: { id: 'user1', displayName: 'Player 1', avatar: null },
            character: { id: 'char1', powerSheet: { hp: 100, maxHp: 100 } },
          },
          {
            id: 'player2',
            userId: 'user2',
            user: { id: 'user2', displayName: 'Player 2', avatar: null },
            character: { id: 'char2', powerSheet: { hp: 0, maxHp: 100 } },
          },
        ],
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame as any);

      const result = await getTurnOrderWithDetails('game1');

      expect(result.turnOrder[0].isAlive).toBe(true);
      expect(result.turnOrder[1].isAlive).toBe(false);
    });

    it('should throw error for non-existent game', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getTurnOrderWithDetails('game1')).rejects.toThrow('GAME_NOT_FOUND');
    });
  });
});

/**
 * Unit tests for Stats Tracker
 */

import {
  getCharacterHistory,
  getSnapshotForTurn,
  compareSnapshots,
  getProgressionSummary,
  getGameHistory,
  getLatestSnapshot,
  StatsSnapshot,
} from '../stats-tracker';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    statsSnapshot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('Stats Tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCharacterHistory', () => {
    it('should retrieve character progression history', async () => {
      const mockSnapshots = [
        {
          id: 'snap-2',
          gameId: 'game-1',
          characterId: 'char-1',
          turnId: 'turn-2',
          level: 2,
          hp: 80,
          maxHp: 120,
          attributes: { strength: 60, agility: 50, intelligence: 40, charisma: 30, endurance: 55 },
          statuses: [],
          perks: [{ name: 'Perk 1', description: 'First perk', unlockedAt: 2 }],
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'snap-1',
          gameId: 'game-1',
          characterId: 'char-1',
          turnId: 'turn-1',
          level: 1,
          hp: 100,
          maxHp: 100,
          attributes: { strength: 50, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
          statuses: [],
          perks: [],
          createdAt: new Date('2024-01-01'),
        },
      ];

      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const history = await getCharacterHistory('char-1');

      expect(history).toHaveLength(2);
      expect(history[0].level).toBe(2);
      expect(history[1].level).toBe(1);
      expect(prisma.statsSnapshot.findMany).toHaveBeenCalledWith({
        where: { characterId: 'char-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect the limit parameter', async () => {
      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      await getCharacterHistory('char-1', 10);

      expect(prisma.statsSnapshot.findMany).toHaveBeenCalledWith({
        where: { characterId: 'char-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should return empty array when no snapshots exist', async () => {
      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const history = await getCharacterHistory('char-1');

      expect(history).toEqual([]);
    });
  });

  describe('getSnapshotForTurn', () => {
    it('should retrieve snapshot for specific turn', async () => {
      const mockSnapshot = {
        id: 'snap-1',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-1',
        level: 1,
        hp: 100,
        maxHp: 100,
        attributes: { strength: 50, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
        statuses: [],
        perks: [],
        createdAt: new Date('2024-01-01'),
      };

      (prisma.statsSnapshot.findFirst as jest.Mock).mockResolvedValue(mockSnapshot);

      const snapshot = await getSnapshotForTurn('char-1', 'turn-1');

      expect(snapshot).not.toBeNull();
      expect(snapshot?.turnId).toBe('turn-1');
      expect(prisma.statsSnapshot.findFirst).toHaveBeenCalledWith({
        where: {
          characterId: 'char-1',
          turnId: 'turn-1',
        },
      });
    });

    it('should return null when snapshot not found', async () => {
      (prisma.statsSnapshot.findFirst as jest.Mock).mockResolvedValue(null);

      const snapshot = await getSnapshotForTurn('char-1', 'turn-999');

      expect(snapshot).toBeNull();
    });
  });

  describe('compareSnapshots', () => {
    it('should calculate differences between snapshots', () => {
      const oldSnapshot: StatsSnapshot = {
        id: 'snap-1',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-1',
        level: 1,
        hp: 100,
        maxHp: 100,
        attributes: { strength: 50, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
        statuses: [{ name: 'Poisoned', description: 'Taking damage', duration: 2, effect: '-5 HP/turn' }],
        perks: [],
        createdAt: new Date('2024-01-01'),
      };

      const newSnapshot: StatsSnapshot = {
        id: 'snap-2',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-2',
        level: 2,
        hp: 110,
        maxHp: 120,
        attributes: { strength: 60, agility: 55, intelligence: 45, charisma: 35, endurance: 55 },
        statuses: [{ name: 'Blessed', description: 'Increased stats', duration: 3, effect: '+10% all' }],
        perks: [{ name: 'Perk 1', description: 'First perk', unlockedAt: 2 }],
        createdAt: new Date('2024-01-02'),
      };

      const diff = compareSnapshots(oldSnapshot, newSnapshot);

      expect(diff.level).toBe(1);
      expect(diff.hp).toBe(10);
      expect(diff.maxHp).toBe(20);
      expect(diff.attributes.strength).toBe(10);
      expect(diff.attributes.agility).toBe(5);
      expect(diff.attributes.intelligence).toBe(5);
      expect(diff.attributes.charisma).toBe(5);
      expect(diff.attributes.endurance).toBe(5);
      expect(diff.statusesAdded).toEqual(['Blessed']);
      expect(diff.statusesRemoved).toEqual(['Poisoned']);
      expect(diff.perksAdded).toEqual(['Perk 1']);
    });

    it('should handle no changes', () => {
      const snapshot: StatsSnapshot = {
        id: 'snap-1',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-1',
        level: 1,
        hp: 100,
        maxHp: 100,
        attributes: { strength: 50, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
        statuses: [],
        perks: [],
        createdAt: new Date('2024-01-01'),
      };

      const diff = compareSnapshots(snapshot, snapshot);

      expect(diff.level).toBe(0);
      expect(diff.hp).toBe(0);
      expect(diff.maxHp).toBe(0);
      expect(diff.attributes.strength).toBe(0);
      expect(diff.statusesAdded).toEqual([]);
      expect(diff.statusesRemoved).toEqual([]);
      expect(diff.perksAdded).toEqual([]);
    });

    it('should handle negative changes (damage, stat loss)', () => {
      const oldSnapshot: StatsSnapshot = {
        id: 'snap-1',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-1',
        level: 2,
        hp: 100,
        maxHp: 120,
        attributes: { strength: 60, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
        statuses: [],
        perks: [],
        createdAt: new Date('2024-01-01'),
      };

      const newSnapshot: StatsSnapshot = {
        id: 'snap-2',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-2',
        level: 2,
        hp: 50,
        maxHp: 120,
        attributes: { strength: 55, agility: 45, intelligence: 40, charisma: 30, endurance: 50 },
        statuses: [],
        perks: [],
        createdAt: new Date('2024-01-02'),
      };

      const diff = compareSnapshots(oldSnapshot, newSnapshot);

      expect(diff.hp).toBe(-50);
      expect(diff.attributes.strength).toBe(-5);
      expect(diff.attributes.agility).toBe(-5);
    });
  });

  describe('getProgressionSummary', () => {
    it('should return progression summary', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          gameId: 'game-1',
          characterId: 'char-1',
          turnId: 'turn-1',
          level: 1,
          hp: 100,
          maxHp: 100,
          attributes: { strength: 50, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
          statuses: [],
          perks: [],
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'snap-2',
          gameId: 'game-1',
          characterId: 'char-1',
          turnId: 'turn-2',
          level: 3,
          hp: 120,
          maxHp: 140,
          attributes: { strength: 60, agility: 55, intelligence: 45, charisma: 35, endurance: 55 },
          statuses: [],
          perks: [
            { name: 'Perk 1', description: 'First perk', unlockedAt: 2 },
            { name: 'Perk 2', description: 'Second perk', unlockedAt: 3 },
          ],
          createdAt: new Date('2024-01-02'),
        },
      ];

      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const summary = await getProgressionSummary('char-1');

      expect(summary.totalSnapshots).toBe(2);
      expect(summary.firstSnapshot?.level).toBe(1);
      expect(summary.latestSnapshot?.level).toBe(3);
      expect(summary.totalLevelsGained).toBe(2);
      expect(summary.totalPerksUnlocked).toBe(2);
    });

    it('should handle no snapshots', async () => {
      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const summary = await getProgressionSummary('char-1');

      expect(summary.totalSnapshots).toBe(0);
      expect(summary.firstSnapshot).toBeNull();
      expect(summary.latestSnapshot).toBeNull();
      expect(summary.totalLevelsGained).toBe(0);
      expect(summary.totalPerksUnlocked).toBe(0);
    });
  });

  describe('getGameHistory', () => {
    it('should return history grouped by character', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          gameId: 'game-1',
          characterId: 'char-1',
          turnId: 'turn-1',
          level: 1,
          hp: 100,
          maxHp: 100,
          attributes: { strength: 50, agility: 50, intelligence: 40, charisma: 30, endurance: 50 },
          statuses: [],
          perks: [],
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'snap-2',
          gameId: 'game-1',
          characterId: 'char-2',
          turnId: 'turn-1',
          level: 1,
          hp: 80,
          maxHp: 80,
          attributes: { strength: 40, agility: 60, intelligence: 50, charisma: 40, endurance: 40 },
          statuses: [],
          perks: [],
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'snap-3',
          gameId: 'game-1',
          characterId: 'char-1',
          turnId: 'turn-2',
          level: 2,
          hp: 110,
          maxHp: 120,
          attributes: { strength: 60, agility: 55, intelligence: 45, charisma: 35, endurance: 55 },
          statuses: [],
          perks: [{ name: 'Perk 1', description: 'First perk', unlockedAt: 2 }],
          createdAt: new Date('2024-01-02'),
        },
      ];

      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const history = await getGameHistory('game-1');

      expect(history.size).toBe(2);
      expect(history.get('char-1')).toHaveLength(2);
      expect(history.get('char-2')).toHaveLength(1);
      expect(history.get('char-1')?.[0].level).toBe(1);
      expect(history.get('char-1')?.[1].level).toBe(2);
    });

    it('should return empty map when no snapshots exist', async () => {
      (prisma.statsSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const history = await getGameHistory('game-1');

      expect(history.size).toBe(0);
    });
  });

  describe('getLatestSnapshot', () => {
    it('should retrieve most recent snapshot', async () => {
      const mockSnapshot = {
        id: 'snap-2',
        gameId: 'game-1',
        characterId: 'char-1',
        turnId: 'turn-2',
        level: 2,
        hp: 110,
        maxHp: 120,
        attributes: { strength: 60, agility: 55, intelligence: 45, charisma: 35, endurance: 55 },
        statuses: [],
        perks: [{ name: 'Perk 1', description: 'First perk', unlockedAt: 2 }],
        createdAt: new Date('2024-01-02'),
      };

      (prisma.statsSnapshot.findFirst as jest.Mock).mockResolvedValue(mockSnapshot);

      const snapshot = await getLatestSnapshot('char-1');

      expect(snapshot).not.toBeNull();
      expect(snapshot?.level).toBe(2);
      expect(prisma.statsSnapshot.findFirst).toHaveBeenCalledWith({
        where: { characterId: 'char-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return null when no snapshots exist', async () => {
      (prisma.statsSnapshot.findFirst as jest.Mock).mockResolvedValue(null);

      const snapshot = await getLatestSnapshot('char-1');

      expect(snapshot).toBeNull();
    });
  });
});

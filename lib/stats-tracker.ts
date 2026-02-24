/**
 * Stats Tracker
 * 
 * Provides utilities for tracking character stat progression over time by creating
 * snapshots after significant events and retrieving history.
 * 
 * Note: createStatsSnapshot() is already implemented in lib/ai/stat-updater.ts
 * and is called automatically after stat updates.
 * 
 * **Validates: Requirements 9.4**
 */

import { prisma } from './prisma';
import { PowerSheet } from './types';

export interface StatsSnapshot {
  id: string;
  gameId: string;
  characterId: string;
  turnId: string;
  level: number;
  hp: number;
  maxHp: number;
  attributes: PowerSheet['attributes'];
  statuses: any[];
  perks: any[];
  createdAt: Date;
}

export interface StatsDiff {
  level: number;
  hp: number;
  maxHp: number;
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
  statusesAdded: string[];
  statusesRemoved: string[];
  perksAdded: string[];
}

/**
 * Get character progression history
 * 
 * @param characterId - The character ID
 * @param limit - Maximum number of snapshots to retrieve (default: 50)
 * @returns Array of stats snapshots ordered by creation time (newest first)
 */
export async function getCharacterHistory(
  characterId: string,
  limit: number = 50
): Promise<StatsSnapshot[]> {
  const snapshots = await prisma.statsSnapshot.findMany({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return snapshots.map(snapshot => ({
    id: snapshot.id,
    gameId: snapshot.gameId,
    characterId: snapshot.characterId,
    turnId: snapshot.turnId,
    level: snapshot.level,
    hp: snapshot.hp,
    maxHp: snapshot.maxHp,
    attributes: snapshot.attributes as PowerSheet['attributes'],
    statuses: snapshot.statuses as any[],
    perks: snapshot.perks as any[],
    createdAt: snapshot.createdAt,
  }));
}

/**
 * Get stats snapshot for a specific turn
 * 
 * @param characterId - The character ID
 * @param turnId - The turn ID
 * @returns Stats snapshot for that turn, or null if not found
 */
export async function getSnapshotForTurn(
  characterId: string,
  turnId: string
): Promise<StatsSnapshot | null> {
  const snapshot = await prisma.statsSnapshot.findFirst({
    where: {
      characterId,
      turnId,
    },
  });

  if (!snapshot) {
    return null;
  }

  return {
    id: snapshot.id,
    gameId: snapshot.gameId,
    characterId: snapshot.characterId,
    turnId: snapshot.turnId,
    level: snapshot.level,
    hp: snapshot.hp,
    maxHp: snapshot.maxHp,
    attributes: snapshot.attributes as PowerSheet['attributes'],
    statuses: snapshot.statuses as any[],
    perks: snapshot.perks as any[],
    createdAt: snapshot.createdAt,
  };
}

/**
 * Compare two stats snapshots to calculate differences
 * 
 * @param oldSnapshot - The earlier snapshot
 * @param newSnapshot - The later snapshot
 * @returns Calculated differences between snapshots
 */
export function compareSnapshots(
  oldSnapshot: StatsSnapshot,
  newSnapshot: StatsSnapshot
): StatsDiff {
  // Calculate attribute differences
  const attributeDiffs = {
    strength: newSnapshot.attributes.strength - oldSnapshot.attributes.strength,
    agility: newSnapshot.attributes.agility - oldSnapshot.attributes.agility,
    intelligence: newSnapshot.attributes.intelligence - oldSnapshot.attributes.intelligence,
    charisma: newSnapshot.attributes.charisma - oldSnapshot.attributes.charisma,
    endurance: newSnapshot.attributes.endurance - oldSnapshot.attributes.endurance,
  };

  // Calculate status changes
  const oldStatusNames = new Set(oldSnapshot.statuses.map((s: any) => s.name));
  const newStatusNames = new Set(newSnapshot.statuses.map((s: any) => s.name));

  const statusesAdded = newSnapshot.statuses
    .filter((s: any) => !oldStatusNames.has(s.name))
    .map((s: any) => s.name);

  const statusesRemoved = oldSnapshot.statuses
    .filter((s: any) => !newStatusNames.has(s.name))
    .map((s: any) => s.name);

  // Calculate perk changes
  const oldPerkNames = new Set(oldSnapshot.perks.map((p: any) => p.name));
  const perksAdded = newSnapshot.perks
    .filter((p: any) => !oldPerkNames.has(p.name))
    .map((p: any) => p.name);

  return {
    level: newSnapshot.level - oldSnapshot.level,
    hp: newSnapshot.hp - oldSnapshot.hp,
    maxHp: newSnapshot.maxHp - oldSnapshot.maxHp,
    attributes: attributeDiffs,
    statusesAdded,
    statusesRemoved,
    perksAdded,
  };
}

/**
 * Get progression summary for a character
 * 
 * @param characterId - The character ID
 * @returns Summary of character progression including total changes
 */
export async function getProgressionSummary(characterId: string): Promise<{
  totalSnapshots: number;
  firstSnapshot: StatsSnapshot | null;
  latestSnapshot: StatsSnapshot | null;
  totalLevelsGained: number;
  totalPerksUnlocked: number;
}> {
  const snapshots = await prisma.statsSnapshot.findMany({
    where: { characterId },
    orderBy: { createdAt: 'asc' },
  });

  if (snapshots.length === 0) {
    return {
      totalSnapshots: 0,
      firstSnapshot: null,
      latestSnapshot: null,
      totalLevelsGained: 0,
      totalPerksUnlocked: 0,
    };
  }

  const first = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  const firstSnapshot: StatsSnapshot = {
    id: first.id,
    gameId: first.gameId,
    characterId: first.characterId,
    turnId: first.turnId,
    level: first.level,
    hp: first.hp,
    maxHp: first.maxHp,
    attributes: first.attributes as PowerSheet['attributes'],
    statuses: first.statuses as any[],
    perks: first.perks as any[],
    createdAt: first.createdAt,
  };

  const latestSnapshot: StatsSnapshot = {
    id: latest.id,
    gameId: latest.gameId,
    characterId: latest.characterId,
    turnId: latest.turnId,
    level: latest.level,
    hp: latest.hp,
    maxHp: latest.maxHp,
    attributes: latest.attributes as PowerSheet['attributes'],
    statuses: latest.statuses as any[],
    perks: latest.perks as any[],
    createdAt: latest.createdAt,
  };

  return {
    totalSnapshots: snapshots.length,
    firstSnapshot,
    latestSnapshot,
    totalLevelsGained: latest.level - first.level,
    totalPerksUnlocked: (latest.perks as any[]).length - (first.perks as any[]).length,
  };
}

/**
 * Get all snapshots for a game
 * 
 * @param gameId - The game ID
 * @returns Array of all stats snapshots for the game, grouped by character
 */
export async function getGameHistory(gameId: string): Promise<Map<string, StatsSnapshot[]>> {
  const snapshots = await prisma.statsSnapshot.findMany({
    where: { gameId },
    orderBy: { createdAt: 'asc' },
  });

  const historyByCharacter = new Map<string, StatsSnapshot[]>();

  for (const snapshot of snapshots) {
    const characterId = snapshot.characterId;
    
    if (!historyByCharacter.has(characterId)) {
      historyByCharacter.set(characterId, []);
    }

    historyByCharacter.get(characterId)!.push({
      id: snapshot.id,
      gameId: snapshot.gameId,
      characterId: snapshot.characterId,
      turnId: snapshot.turnId,
      level: snapshot.level,
      hp: snapshot.hp,
      maxHp: snapshot.maxHp,
      attributes: snapshot.attributes as PowerSheet['attributes'],
      statuses: snapshot.statuses as any[],
      perks: snapshot.perks as any[],
      createdAt: snapshot.createdAt,
    });
  }

  return historyByCharacter;
}

/**
 * Get the most recent snapshot for a character
 * 
 * @param characterId - The character ID
 * @returns Most recent stats snapshot, or null if none exist
 */
export async function getLatestSnapshot(characterId: string): Promise<StatsSnapshot | null> {
  const snapshot = await prisma.statsSnapshot.findFirst({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
  });

  if (!snapshot) {
    return null;
  }

  return {
    id: snapshot.id,
    gameId: snapshot.gameId,
    characterId: snapshot.characterId,
    turnId: snapshot.turnId,
    level: snapshot.level,
    hp: snapshot.hp,
    maxHp: snapshot.maxHp,
    attributes: snapshot.attributes as PowerSheet['attributes'],
    statuses: snapshot.statuses as any[],
    perks: snapshot.perks as any[],
    createdAt: snapshot.createdAt,
  };
}

/**
 * Turn Manager Utilities
 * Handles turn order tracking, active player designation, and turn advancement
 * Validates: Requirements 6.1, 6.5, 10.1, 10.3
 */

import { prisma } from './prisma';
import { broadcastEvent } from './realtime/broadcast';

/**
 * PowerSheet interface matching the JSON structure in Character.powerSheet
 */
export interface PowerSheet {
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
  abilities: Array<{
    name: string;
    description: string;
    powerLevel: number;
    cooldown: number | null;
  }>;
  weakness: string;
  statuses: Array<{
    name: string;
    description: string;
    duration: number;
    effect: string;
  }>;
  perks: Array<{
    name: string;
    description: string;
    unlockedAt: number;
  }>;
}

/**
 * Gets the current active player for a game
 * Returns null if game is not active or turn order is empty
 * Validates: Requirements 6.1
 */
export async function getActivePlayer(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      turnOrder: true,
      currentTurnIndex: true,
    }
  });

  if (!game || game.status !== 'active' || game.turnOrder.length === 0) {
    return null;
  }

  const activePlayerId = game.turnOrder[game.currentTurnIndex];
  
  // Fetch the active player with their character
  const player = await prisma.gamePlayer.findFirst({
    where: {
      gameId,
      userId: activePlayerId,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatar: true,
        }
      },
      character: true,
    }
  });

  return player;
}

/**
 * Checks if a character is dead (HP <= 0)
 * Validates: Requirements 6.5, 10.1
 */
export function isCharacterDead(powerSheet: PowerSheet): boolean {
  return powerSheet.hp <= 0;
}

/**
 * Marks a character as dead by setting HP to 0 if it's negative
 * This ensures consistent death state representation
 * Validates: Requirements 10.1
 */
export async function markCharacterDead(characterId: string): Promise<void> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { powerSheet: true },
  });

  if (!character) {
    throw new Error('CHARACTER_NOT_FOUND');
  }

  const powerSheet = character.powerSheet as unknown as PowerSheet;

  // Only update if HP is not already 0 (normalize negative HP to 0)
  if (powerSheet.hp !== 0 && powerSheet.hp <= 0) {
    powerSheet.hp = 0;
    
    await prisma.character.update({
      where: { id: characterId },
      data: {
        powerSheet: powerSheet as any,
      },
    });
  }
}

/**
 * Gets all alive players in turn order
 * Filters out players whose characters have HP <= 0
 * Validates: Requirements 6.5, 10.2
 */
export async function getAlivePlayers(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            }
          },
          character: true,
        }
      }
    }
  });

  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }

  // Filter players with alive characters
  const alivePlayers = game.players.filter(player => {
    if (!player.character) {
      return false;
    }
    const powerSheet = player.character.powerSheet as unknown as PowerSheet;
    return !isCharacterDead(powerSheet);
  });

  return alivePlayers;
}

/**
 * Checks if the game should end due to all players being dead
 * Validates: Requirements 10.3
 */
export async function shouldGameEnd(gameId: string): Promise<boolean> {
  const alivePlayers = await getAlivePlayers(gameId);
  return alivePlayers.length === 0;
}

/**
 * Advances to the next turn, skipping dead players
 * Returns the new active player
 * Broadcasts turn change via real-time engine
 * Validates: Requirements 6.5, 10.2, 10.3
 */
export async function advanceTurn(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            }
          },
          character: true,
        }
      }
    }
  });

  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }

  if (game.status !== 'active') {
    throw new Error('GAME_NOT_ACTIVE');
  }

  if (game.turnOrder.length === 0) {
    throw new Error('EMPTY_TURN_ORDER');
  }

  // Get alive players
  const alivePlayers = game.players.filter(player => {
    if (!player.character) {
      return false;
    }
    const powerSheet = player.character.powerSheet as unknown as PowerSheet;
    return !isCharacterDead(powerSheet);
  });

  if (alivePlayers.length === 0) {
    throw new Error('NO_ALIVE_PLAYERS');
  }

  // Find the next alive player in turn order
  let nextIndex = (game.currentTurnIndex + 1) % game.turnOrder.length;
  let attempts = 0;
  const maxAttempts = game.turnOrder.length;

  while (attempts < maxAttempts) {
    const nextPlayerId = game.turnOrder[nextIndex];
    const nextPlayer = alivePlayers.find(p => p.userId === nextPlayerId);

    if (nextPlayer) {
      // Found an alive player, update the game
      const updatedGame = await prisma.game.update({
        where: { id: gameId },
        data: {
          currentTurnIndex: nextIndex,
        },
        include: {
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  avatar: true,
                }
              },
              character: true,
            }
          }
        }
      });

      // Return the new active player
      const activePlayer = updatedGame.players.find(p => p.userId === nextPlayerId);

      // Broadcast turn change via real-time engine
      // Validates: Requirements 10.3
      await broadcastEvent(gameId, 'turn:changed', {
        currentPlayerId: nextPlayerId,
        turnIndex: nextIndex,
        activePlayer: {
          userId: activePlayer!.userId,
          displayName: activePlayer!.user.displayName,
          characterId: activePlayer!.character?.id,
          characterName: activePlayer!.character?.name,
        },
      });

      return {
        game: updatedGame,
        activePlayer: activePlayer!,
      };
    }

    // This player is dead, try the next one
    nextIndex = (nextIndex + 1) % game.turnOrder.length;
    attempts++;
  }

  // This should never happen if we have alive players, but handle it
  throw new Error('COULD_NOT_FIND_NEXT_PLAYER');
}

/**
 * Validates if a user is the active player for a game
 * Validates: Requirements 6.4, 13.2
 */
export async function isActivePlayer(gameId: string, userId: string): Promise<boolean> {
  const activePlayer = await getActivePlayer(gameId);
  
  if (!activePlayer) {
    return false;
  }

  return activePlayer.userId === userId;
}

/**
 * Validates the turn order for a game
 * Ensures all player IDs in turn order exist in the game
 */
export async function validateTurnOrder(gameId: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        select: {
          userId: true,
        }
      }
    }
  });

  if (!game) {
    errors.push('Game not found');
    return { valid: false, errors };
  }

  const playerIds = new Set(game.players.map(p => p.userId));

  // Check if turn order is empty
  if (game.turnOrder.length === 0) {
    errors.push('Turn order is empty');
  }

  // Check if all turn order IDs exist in players
  for (const playerId of game.turnOrder) {
    if (!playerIds.has(playerId)) {
      errors.push(`Player ${playerId} in turn order does not exist in game`);
    }
  }

  // Check if all players are in turn order
  for (const playerId of Array.from(playerIds)) {
    if (!game.turnOrder.includes(playerId)) {
      errors.push(`Player ${playerId} is not in turn order`);
    }
  }

  // Check if current turn index is valid
  if (game.currentTurnIndex < 0 || game.currentTurnIndex >= game.turnOrder.length) {
    errors.push(`Current turn index ${game.currentTurnIndex} is out of bounds`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gets the turn order with player details
 * Includes character status (alive/dead)
 */
export async function getTurnOrderWithDetails(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            }
          },
          character: true,
        }
      }
    }
  });

  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }

  // Map turn order to player details
  const turnOrderDetails = game.turnOrder.map((playerId, index) => {
    const player = game.players.find(p => p.userId === playerId);
    
    if (!player) {
      return {
        index,
        playerId,
        player: null,
        isAlive: false,
        isActive: index === game.currentTurnIndex,
      };
    }

    const isAlive = player.character 
      ? !isCharacterDead(player.character.powerSheet as unknown as PowerSheet)
      : false;

    return {
      index,
      playerId,
      player: {
        id: player.id,
        userId: player.userId,
        user: player.user,
        character: player.character,
      },
      isAlive,
      isActive: index === game.currentTurnIndex,
    };
  });

  return {
    turnOrder: turnOrderDetails,
    currentTurnIndex: game.currentTurnIndex,
    activePlayerId: game.turnOrder[game.currentTurnIndex],
  };
}

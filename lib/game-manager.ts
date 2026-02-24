/**
 * Game Manager Utilities
 * Handles game creation, invite code generation, and game lifecycle management
 */

import { prisma } from './prisma';

/**
 * Generates a unique, short invite code for a game
 * Format: 6 uppercase alphanumeric characters (e.g., "A3X9K2")
 * Validates: Requirements 2.2
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0, O, I, 1)
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Generates a unique invite code that doesn't exist in the database
 * Retries up to 10 times if collision occurs
 * Validates: Requirements 2.2 (uniqueness)
 */
export async function generateUniqueInviteCode(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateInviteCode();
    
    // Check if code already exists
    const existing = await prisma.game.findUnique({
      where: { inviteCode: code },
      select: { id: true }
    });
    
    if (!existing) {
      return code;
    }
  }
  
  // If we couldn't generate a unique code after max attempts, throw error
  throw new Error('Failed to generate unique invite code after multiple attempts');
}

/**
 * Game creation parameters
 */
export interface CreateGameParams {
  name: string;
  hostId: string;
  maxPlayers: number;
  difficultyCurve?: 'easy' | 'medium' | 'hard' | 'brutal';
  toneTags?: string[];
  houseRules?: string | null;
}

/**
 * Creates a new game session with unique invite code
 * Validates: Requirements 2.1, 2.2, 2.3
 */
export async function createGame(params: CreateGameParams) {
  const { 
    name, 
    hostId, 
    maxPlayers, 
    difficultyCurve = 'medium', 
    toneTags = [], 
    houseRules 
  } = params;
  
  // Generate unique invite code
  const inviteCode = await generateUniqueInviteCode();
  
  // Create game and host player in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the game
    const game = await tx.game.create({
      data: {
        name,
        hostId,
        inviteCode,
        maxPlayers,
        difficultyCurve,
        toneTags,
        houseRules,
        status: 'lobby',
        turnOrder: [],
        currentTurnIndex: 0,
      },
      include: {
        host: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          }
        }
      }
    });
    
    // Add host as a player with 'host' role
    const hostPlayer = await tx.gamePlayer.create({
      data: {
        gameId: game.id,
        userId: hostId,
        role: 'host',
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
    
    return { game, hostPlayer };
  });
  
  return result;
}

/**
 * Generates a shareable invite link for a game
 * Validates: Requirements 2.2
 */
export function generateInviteLink(inviteCode: string, baseUrl: string): string {
  return `${baseUrl}/game/join/${inviteCode}`;
}

/**
 * Validates game creation parameters
 */
export function validateGameParams(params: CreateGameParams): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!params.name || params.name.trim().length === 0) {
    errors.push('Game name is required');
  }
  
  if (params.name.length > 100) {
    errors.push('Game name must be 100 characters or less');
  }
  
  if (!params.hostId) {
    errors.push('Host ID is required');
  }
  
  if (params.maxPlayers < 2 || params.maxPlayers > 10) {
    errors.push('Max players must be between 2 and 10');
  }
  
  if (params.difficultyCurve && !['easy', 'medium', 'hard', 'brutal'].includes(params.difficultyCurve)) {
    errors.push('Invalid difficulty curve');
  }
  
  if (params.houseRules && params.houseRules.length > 500) {
    errors.push('House rules must be 500 characters or less');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Join game parameters
 */
export interface JoinGameParams {
  gameId: string;
  userId: string;
}

/**
 * Joins a player to an existing game session
 * Validates: Requirements 3.1, 3.4, 3.5
 */
export async function joinGame(params: JoinGameParams) {
  const { gameId, userId } = params;
  
  // Fetch the game with current players
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
          }
        }
      },
      host: {
        select: {
          id: true,
          displayName: true,
          avatar: true,
        }
      }
    }
  });
  
  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }
  
  // Validate: game must be in lobby status (not started)
  if (game.status !== 'lobby') {
    throw new Error('GAME_ALREADY_STARTED');
  }
  
  // Validate: game must not be at capacity
  if (game.players.length >= game.maxPlayers) {
    throw new Error('GAME_FULL');
  }
  
  // Check if user is already in the game
  const existingPlayer = game.players.find(p => p.userId === userId);
  if (existingPlayer) {
    // User is already in the game, return existing data
    return {
      game,
      player: existingPlayer,
      alreadyJoined: true
    };
  }
  
  // Add player to the game
  const newPlayer = await prisma.gamePlayer.create({
    data: {
      gameId,
      userId,
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
  
  return {
    game,
    player: newPlayer,
    alreadyJoined: false
  };
}

/**
 * Finds a game by invite code
 * Validates: Requirements 3.1
 */
export async function findGameByInviteCode(inviteCode: string) {
  const game = await prisma.game.findUnique({
    where: { inviteCode },
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
  
  return game;
}

/**
 * Start game parameters
 */
export interface StartGameParams {
  gameId: string;
  hostId: string;
}

/**
 * Starts a game session
 * - Validates host permissions
 * - Ensures all players have characters
 * - Locks roster and establishes turn order
 * Validates: Requirements 5.3, 5.4, 5.5, 13.1
 */
export async function startGame(params: StartGameParams) {
  const { gameId, hostId } = params;
  
  // Fetch the game with players and characters
  const game = await prisma.game.findUnique({
    where: { id: gameId },
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
  
  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }
  
  // Validate: only host can start the game (Requirement 13.1)
  if (game.hostId !== hostId) {
    throw new Error('UNAUTHORIZED_NOT_HOST');
  }
  
  // Validate: game must be in lobby status
  if (game.status !== 'lobby') {
    throw new Error('GAME_ALREADY_STARTED');
  }
  
  // Validate: all players must have characters (Requirement 5.5)
  const playersWithoutCharacters = game.players.filter(p => !p.characterId);
  if (playersWithoutCharacters.length > 0) {
    throw new Error('INCOMPLETE_CHARACTER_CREATION');
  }
  
  // Establish turn order from player IDs (Requirement 5.4)
  const turnOrder = game.players.map(p => p.userId);
  
  // Update game to active status with locked roster and turn order
  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'active',
      turnOrder,
      currentTurnIndex: 0,
      startedAt: new Date(),
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
  
  return updatedGame;
}

/**
 * Leave game parameters
 */
export interface LeaveGameParams {
  gameId: string;
  userId: string;
}

/**
 * Removes a player from a game session
 * Only allowed in lobby status (before game starts)
 * Validates: Requirements 11.3
 */
export async function leaveGame(params: LeaveGameParams) {
  const { gameId, userId } = params;
  
  // Fetch the game with current players
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
          }
        }
      },
      host: {
        select: {
          id: true,
          displayName: true,
          avatar: true,
        }
      }
    }
  });
  
  if (!game) {
    throw new Error('GAME_NOT_FOUND');
  }
  
  // Validate: player must be in the game
  const player = game.players.find(p => p.userId === userId);
  if (!player) {
    throw new Error('PLAYER_NOT_IN_GAME');
  }
  
  // Validate: can only leave games in lobby status
  if (game.status !== 'lobby') {
    throw new Error('CANNOT_LEAVE_ACTIVE_GAME');
  }
  
  // Remove player from the game
  await prisma.gamePlayer.delete({
    where: { id: player.id }
  });
  
  // Fetch updated game state
  const updatedGame = await prisma.game.findUnique({
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
          }
        }
      },
      host: {
        select: {
          id: true,
          displayName: true,
          avatar: true,
        }
      }
    }
  });
  
  return {
    game: updatedGame!,
    removedPlayerId: userId
  };
}

/**
 * Permission Validation Utilities
 * Centralized permission checks for game actions
 * Validates: Requirements 13.1, 13.3
 */

import { prisma } from './prisma';

/**
 * Permission error codes
 */
export const PermissionErrors = {
  UNAUTHORIZED_NOT_HOST: 'UNAUTHORIZED_NOT_HOST',
  UNAUTHORIZED_NOT_ACTIVE_PLAYER: 'UNAUTHORIZED_NOT_ACTIVE_PLAYER',
  UNAUTHORIZED_GAME_MODIFICATION: 'UNAUTHORIZED_GAME_MODIFICATION',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
  INVALID_GAME_STATE: 'INVALID_GAME_STATE',
} as const;

/**
 * Permission validation result
 */
export interface PermissionResult {
  allowed: boolean;
  error?: string;
  reason?: string;
}

/**
 * Validates if a user is the host of a game
 * Validates: Requirements 13.1
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result indicating if user is the host
 */
export async function isGameHost(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      hostId: true,
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  if (game.hostId !== userId) {
    return {
      allowed: false,
      error: PermissionErrors.UNAUTHORIZED_NOT_HOST,
      reason: 'Only the game host can perform this action',
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user is the active player in a game
 * Validates: Requirements 13.2
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result indicating if user is the active player
 */
export async function isActivePlayer(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      turnOrder: true,
      currentTurnIndex: true,
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  if (game.status !== 'active') {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Game is not active',
    };
  }

  if (game.turnOrder.length === 0) {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Turn order is empty',
    };
  }

  const activePlayerId = game.turnOrder[game.currentTurnIndex];

  if (activePlayerId !== userId) {
    return {
      allowed: false,
      error: PermissionErrors.UNAUTHORIZED_NOT_ACTIVE_PLAYER,
      reason: 'Only the active player can perform this action',
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user is a player in a game
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result indicating if user is in the game
 */
export async function isPlayerInGame(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  const player = await prisma.gamePlayer.findFirst({
    where: {
      gameId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!player) {
    return {
      allowed: false,
      error: PermissionErrors.PLAYER_NOT_IN_GAME,
      reason: 'User is not a player in this game',
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user can start a game
 * Requirements: Must be host, game must be in lobby status, all players must have characters
 * Validates: Requirements 13.1, 5.3, 5.5
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result with detailed validation
 */
export async function canStartGame(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  // First check if user is the host
  const hostCheck = await isGameHost(gameId, userId);
  if (!hostCheck.allowed) {
    return hostCheck;
  }

  // Check game state and player readiness
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      players: {
        select: {
          characterId: true,
        },
      },
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  if (game.status !== 'lobby') {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Game has already started',
    };
  }

  const playersWithoutCharacters = game.players.filter(p => !p.characterId);
  if (playersWithoutCharacters.length > 0) {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: `${playersWithoutCharacters.length} player(s) have not created characters`,
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user can end a game
 * Requirements: Must be host
 * Validates: Requirements 13.1
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canEndGame(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  return isGameHost(gameId, userId);
}

/**
 * Validates if a user can submit an action during their turn
 * Requirements: Must be active player, game must be active
 * Validates: Requirements 13.2, 6.4
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canSubmitAction(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  return isActivePlayer(gameId, userId);
}

/**
 * Validates if a user can modify game settings
 * Requirements: Must be host, game must be in lobby status
 * Validates: Requirements 13.1, 13.3
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canModifyGameSettings(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  // First check if user is the host
  const hostCheck = await isGameHost(gameId, userId);
  if (!hostCheck.allowed) {
    return hostCheck;
  }

  // Check if game is in lobby status
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  if (game.status !== 'lobby') {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Cannot modify settings after game has started',
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user can view game state
 * Requirements: Must be a player in the game
 * Validates: Requirements 13.3
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canViewGame(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  return isPlayerInGame(gameId, userId);
}

/**
 * Validates if a user can create a character for a game
 * Requirements: Must be a player in the game, game must be in lobby status, must not already have a character
 * Validates: Requirements 13.3, 4.1
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canCreateCharacter(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  // Check if user is in the game
  const playerCheck = await isPlayerInGame(gameId, userId);
  if (!playerCheck.allowed) {
    return playerCheck;
  }

  // Check game status and existing character
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      players: {
        where: {
          userId,
        },
        select: {
          characterId: true,
        },
      },
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  if (game.status !== 'lobby') {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Cannot create character after game has started',
    };
  }

  const player = game.players[0];
  if (player && player.characterId) {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Player already has a character for this game',
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user can join a game
 * Requirements: Game must be in lobby status, game must not be full
 * Validates: Requirements 13.3, 3.4, 3.5
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canJoinGame(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
      maxPlayers: true,
      players: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  // Check if user is already in the game
  const isAlreadyInGame = game.players.some(p => p.userId === userId);
  if (isAlreadyInGame) {
    return { allowed: true }; // Already in game is allowed (idempotent)
  }

  if (game.status !== 'lobby') {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Cannot join game that has already started',
    };
  }

  if (game.players.length >= game.maxPlayers) {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Game is full',
    };
  }

  return { allowed: true };
}

/**
 * Validates if a user can leave a game
 * Requirements: Must be a player in the game, game must be in lobby status
 * Validates: Requirements 13.3
 * 
 * @param gameId - The game ID to check
 * @param userId - The user ID to validate
 * @returns Permission result
 */
export async function canLeaveGame(
  gameId: string,
  userId: string
): Promise<PermissionResult> {
  // Check if user is in the game
  const playerCheck = await isPlayerInGame(gameId, userId);
  if (!playerCheck.allowed) {
    return playerCheck;
  }

  // Check game status
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      status: true,
    },
  });

  if (!game) {
    return {
      allowed: false,
      error: PermissionErrors.GAME_NOT_FOUND,
      reason: 'Game not found',
    };
  }

  if (game.status !== 'lobby') {
    return {
      allowed: false,
      error: PermissionErrors.INVALID_GAME_STATE,
      reason: 'Cannot leave game after it has started',
    };
  }

  return { allowed: true };
}

/**
 * Helper function to throw an error if permission check fails
 * Useful for API routes that need to enforce permissions
 * 
 * @param result - The permission result to check
 * @throws Error with the permission error code if not allowed
 */
export function enforcePermission(result: PermissionResult): void {
  if (!result.allowed) {
    throw new Error(result.error || 'PERMISSION_DENIED');
  }
}

/**
 * Batch permission check for multiple validations
 * Returns the first failed permission or success if all pass
 * 
 * @param checks - Array of permission check promises
 * @returns Combined permission result
 */
export async function checkAllPermissions(
  checks: Promise<PermissionResult>[]
): Promise<PermissionResult> {
  const results = await Promise.all(checks);
  
  for (const result of results) {
    if (!result.allowed) {
      return result;
    }
  }
  
  return { allowed: true };
}

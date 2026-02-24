/**
 * Turn Permission Enforcement
 * Validates that only the active player can submit actions during their turn
 * Validates: Requirements 6.4, 13.2
 */

import { isActivePlayer } from './turn-manager';

/**
 * Error codes for permission violations
 */
export const PermissionErrorCode = {
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  GAME_NOT_ACTIVE: 'GAME_NOT_ACTIVE',
  PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
} as const;

export type PermissionErrorCode = typeof PermissionErrorCode[keyof typeof PermissionErrorCode];

/**
 * Permission validation error
 */
export class TurnPermissionError extends Error {
  constructor(
    public code: PermissionErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'TurnPermissionError';
  }
}

/**
 * Result of permission validation
 */
export interface PermissionValidationResult {
  allowed: boolean;
  error?: {
    code: PermissionErrorCode;
    message: string;
  };
}

/**
 * Validates if a user has permission to submit an action for a game
 * Returns a result object indicating if the action is allowed
 * Validates: Requirements 6.4, 13.2
 */
export async function validateTurnPermission(
  gameId: string,
  userId: string
): Promise<PermissionValidationResult> {
  try {
    const isActive = await isActivePlayer(gameId, userId);

    if (!isActive) {
      return {
        allowed: false,
        error: {
          code: PermissionErrorCode.NOT_YOUR_TURN,
          message: 'You cannot submit actions when it is not your turn',
        },
      };
    }

    return { allowed: true };
  } catch (error) {
    // Handle any errors from isActivePlayer
    return {
      allowed: false,
      error: {
        code: PermissionErrorCode.PLAYER_NOT_IN_GAME,
        message: 'Unable to verify player permissions',
      },
    };
  }
}

/**
 * Validates turn permission and throws an error if not allowed
 * Use this in API routes where you want to fail fast on permission violations
 * Validates: Requirements 6.4, 13.2
 */
export async function requireTurnPermission(
  gameId: string,
  userId: string
): Promise<void> {
  const result = await validateTurnPermission(gameId, userId);

  if (!result.allowed && result.error) {
    throw new TurnPermissionError(result.error.code, result.error.message);
  }
}

/**
 * Checks if an error is a turn permission error
 */
export function isTurnPermissionError(error: unknown): error is TurnPermissionError {
  return error instanceof TurnPermissionError;
}

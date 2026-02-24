/**
 * Turn Processing API Route
 * POST /api/game/[gameId]/turn
 * 
 * Main turn processing endpoint that:
 * - Validates permissions (active player only)
 * - Processes action through DM
 * - Updates game state
 * - Broadcasts updates
 * - Stores turn and events
 * 
 * Validates: Requirements 6.3, 7.6, 13.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isActivePlayer, advanceTurn, getActivePlayer, markCharacterDead } from '@/lib/turn-manager';
import { generateTurnNarrative } from '@/lib/ai/dungeon-master';
import { processStatUpdates } from '@/lib/ai/stat-updater';
import { validateAction, generateRefusalMessage } from '@/lib/ai/action-validator';
import {
  broadcastTurnResolved,
  broadcastStatsUpdate,
  broadcastCharacterUpdate,
  broadcastGameUpdate,
} from '@/lib/realtime/broadcast';
import {
  checkRateLimit,
  RATE_LIMITS,
  formatRateLimitError,
  getRateLimitHeaders,
} from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';
import { PowerSheet, Perk } from '@/lib/types';

interface TurnRequestBody {
  action: 'A' | 'B' | 'C' | 'D' | string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to submit actions',
            retryable: false,
          },
        },
        { status: 401 }
      );
    }

    const { gameId } = params;
    const userId = session.user.id;

    // **Validates: Requirement 13.4** - Check rate limit for turn processing
    const rateLimitKey = `turn-processing:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.TURN_PROCESSING);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        formatRateLimitError(rateLimit, 'turn processing'),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // Parse request body
    const body = (await request.json()) as TurnRequestBody;
    const { action } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Action is required',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Verify game exists and is active
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        currentTurnIndex: true,
        turnOrder: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GAME_NOT_FOUND',
            message: 'Game not found',
            retryable: false,
          },
        },
        { status: 404 }
      );
    }

    if (game.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GAME_NOT_ACTIVE',
            message: 'Game is not active',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Validate permissions: only active player can submit actions
    const isActive = await isActivePlayer(gameId, userId);

    if (!isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_YOUR_TURN',
            message: 'It is not your turn',
            retryable: false,
          },
        },
        { status: 403 }
      );
    }

    // Get active player with character
    const activePlayer = await getActivePlayer(gameId);

    if (!activePlayer || !activePlayer.character) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PLAYER_NOT_FOUND',
            message: 'Active player or character not found',
            retryable: false,
          },
        },
        { status: 404 }
      );
    }

    // Check if character is dead
    const powerSheet = activePlayer.character.powerSheet as unknown as PowerSheet;
    if (powerSheet.hp <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHARACTER_DEAD',
            message: 'Your character is dead and cannot take actions',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // If action is custom (not A, B, C, or D), validate it first
    const isStandardChoice = ['A', 'B', 'C', 'D'].includes(action.toUpperCase());
    
    if (!isStandardChoice) {
      const validationResult = validateAction(
        action,
        powerSheet,
        activePlayer.character.name
      );

      if (!validationResult.valid) {
        // Return validation error with refusal message
        const refusalMessage = generateRefusalMessage(
          validationResult,
          activePlayer.character.name
        );

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: refusalMessage,
              details: {
                reason: validationResult.reason,
                suggestedAlternatives: validationResult.suggestedAlternatives,
              },
              retryable: true,
            },
          },
          { status: 400 }
        );
      }
    }

    // Create turn record
    const turn = await prisma.turn.create({
      data: {
        gameId,
        turnIndex: game.currentTurnIndex,
        activePlayerId: userId,
        phase: 'resolving',
      },
    });

    // Process action through DM
    const dmResponse = await generateTurnNarrative(
      gameId,
      isStandardChoice ? undefined : action
    );

    if (!dmResponse.success) {
      // Update turn to failed state
      await prisma.turn.update({
        where: { id: turn.id },
        data: {
          phase: 'completed',
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DM_GENERATION_FAILED',
            message: dmResponse.error || 'Failed to generate turn narrative',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // If DM returned a validation error, return it
    if (dmResponse.validationError) {
      await prisma.turn.update({
        where: { id: turn.id },
        data: {
          phase: 'completed',
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: dmResponse.validationError,
            retryable: true,
          },
        },
        { status: 400 }
      );
    }

    // Store action event
    await prisma.gameEvent.create({
      data: {
        gameId,
        turnId: turn.id,
        characterId: activePlayer.character.id,
        type: 'action',
        content: `${activePlayer.character.name} chose: ${action}`,
        metadata: {
          action,
          playerId: userId,
        },
      },
    });

    // Store narrative event
    await prisma.gameEvent.create({
      data: {
        gameId,
        turnId: turn.id,
        characterId: null,
        type: 'narrative',
        content: dmResponse.narrative,
        metadata: {
          choices: dmResponse.choices,
        } as any,
      },
    });

    // Process stat updates
    const updatedPowerSheets = await processStatUpdates(
      dmResponse.statUpdates,
      gameId,
      turn.id
    );

    // Store stat change events and check for deaths
    for (const [characterId, updatedPowerSheet] of Array.from(updatedPowerSheets.entries())) {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: {
          name: true,
          powerSheet: true,
        },
      });

      if (!character) continue;

      const oldPowerSheet = character.powerSheet as unknown as PowerSheet;

      // Create stat change event
      await prisma.gameEvent.create({
        data: {
          gameId,
          turnId: turn.id,
          characterId,
          type: 'stat_change',
          content: `${character.name}'s stats updated`,
          metadata: {
            changes: dmResponse.statUpdates.find(u => u.characterId === characterId)?.changes,
          } as any,
        },
      });

      // Check for death (HP went from positive to zero or negative)
      if (oldPowerSheet.hp > 0 && updatedPowerSheet.hp <= 0) {
        // Mark character as dead (normalize HP to 0)
        await markCharacterDead(characterId);
        
        // Create death event
        await prisma.gameEvent.create({
          data: {
            gameId,
            turnId: turn.id,
            characterId,
            type: 'death',
            content: `${character.name} has died!`,
            metadata: {
              finalHp: 0,
            } as any,
          },
        });
      }

      // Check for level up
      if (updatedPowerSheet.level > oldPowerSheet.level) {
        await prisma.gameEvent.create({
          data: {
            gameId,
            turnId: turn.id,
            characterId,
            type: 'level_up',
            content: `${character.name} leveled up to level ${updatedPowerSheet.level}!`,
            metadata: {
              newLevel: updatedPowerSheet.level,
              newPerks: updatedPowerSheet.perks.filter(
                (p: Perk) => p.unlockedAt === updatedPowerSheet.level
              ),
            } as any,
          },
        });
      }

      // Broadcast character update
      await broadcastCharacterUpdate(gameId, {
        id: characterId,
        powerSheet: updatedPowerSheet,
      });

      // Broadcast stats update
      await broadcastStatsUpdate(gameId, {
        characterId,
        powerSheet: updatedPowerSheet,
      });
    }

    // Advance to next turn
    const { game: updatedGame, activePlayer: nextActivePlayer } = await advanceTurn(gameId);

    // Update turn record to completed
    await prisma.turn.update({
      where: { id: turn.id },
      data: {
        phase: 'completed',
        completedAt: new Date(),
      },
    });

    // Broadcast game update with new turn state
    await broadcastGameUpdate(gameId, {
      currentTurnIndex: updatedGame.currentTurnIndex,
      activePlayerId: nextActivePlayer.userId,
    });

    // Broadcast turn resolved event
    await broadcastTurnResolved(gameId, {
      turnId: turn.id,
      narrative: dmResponse.narrative,
      choices: dmResponse.choices,
      statUpdates: dmResponse.statUpdates,
      nextActivePlayer: {
        userId: nextActivePlayer.userId,
        displayName: nextActivePlayer.user.displayName,
        character: nextActivePlayer.character
          ? {
              id: nextActivePlayer.character.id,
              name: nextActivePlayer.character.name,
            }
          : null,
      },
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          turnId: turn.id,
          narrative: dmResponse.narrative,
          choices: dmResponse.choices,
          statUpdates: dmResponse.statUpdates,
          nextActivePlayer: {
            userId: nextActivePlayer.userId,
            displayName: nextActivePlayer.user.displayName,
            character: nextActivePlayer.character
              ? {
                  id: nextActivePlayer.character.id,
                  name: nextActivePlayer.character.name,
                  imageUrl: nextActivePlayer.character.imageUrl,
                }
              : null,
          },
        },
      },
      { 
        status: 200,
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    console.error('Turn processing error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'GAME_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GAME_NOT_FOUND',
              message: 'Game not found',
              retryable: false,
            },
          },
          { status: 404 }
        );
      }

      if (error.message === 'NO_ALIVE_PLAYERS') {
        // Game over - all players are dead
        await prisma.game.update({
          where: { id: params.gameId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GAME_OVER',
              message: 'All players are dead. Game over.',
              retryable: false,
            },
          },
          { status: 400 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while processing the turn',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}

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
      // Log detailed info for debugging
      const activePlayerId = game.turnOrder[game.currentTurnIndex];
      console.log(`Turn validation failed:`, {
        requestingUserId: userId,
        activePlayerId,
        currentTurnIndex: game.currentTurnIndex,
        turnOrder: game.turnOrder,
      });

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

    // A-D choices are always allowed - no validation needed
    // Custom actions are passed to the DM for narrative validation
    const isStandardChoice = ['A', 'B', 'C', 'D'].includes(action.toUpperCase());

    // Check if a turn already exists for this turn index
    const existingTurn = await prisma.turn.findFirst({
      where: {
        gameId,
        turnIndex: game.currentTurnIndex,
      },
    });

    if (existingTurn) {
      // If turn is stuck in resolving for more than 30 seconds, allow retry
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      if (existingTurn.phase === 'resolving' && existingTurn.startedAt < thirtySecondsAgo) {
        // Delete stuck turn and allow retry
        console.log(`Cleaning up stuck turn ${existingTurn.id} from ${existingTurn.startedAt}`);
        await prisma.turn.delete({
          where: { id: existingTurn.id },
        });
        console.log('Stuck turn cleaned up, proceeding with new turn');
      } else if (existingTurn.phase === 'resolving') {
        // Turn is recent, still processing
        const secondsAgo = Math.floor((Date.now() - existingTurn.startedAt.getTime()) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TURN_ALREADY_PROCESSING',
              message: `A turn is already being processed (started ${secondsAgo}s ago). Please wait.`,
              retryable: true,
            },
          },
          { status: 409 }
        );
      } else if (existingTurn.phase === 'completed') {
        // Turn completed but game state shows this turn index - database inconsistency
        // This happens when turn completed but game.currentTurnIndex wasn't updated
        console.log(`Turn ${existingTurn.turnIndex} already completed but game still at this index`);
        console.log(`Deleting completed turn to allow new submission`);
        
        // Delete the completed turn to allow a new one
        await prisma.turn.delete({
          where: { id: existingTurn.id },
        });
        
        console.log('Completed turn deleted, proceeding with new turn');
      } else {
        // Turn exists but not in resolving or completed state - shouldn't happen
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TURN_ALREADY_EXISTS',
              message: 'A turn already exists for this turn index',
              retryable: false,
            },
          },
          { status: 409 }
        );
      }
    }

    // Create turn record with unique constraint check
    let turn;
    try {
      turn = await prisma.turn.create({
        data: {
          gameId,
          turnIndex: game.currentTurnIndex,
          activePlayerId: userId,
          phase: 'resolving',
        },
      });
    } catch (error: any) {
      // Handle unique constraint violation (race condition)
      if (error.code === 'P2002') {
        console.log('Race condition detected: another turn was created simultaneously');
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TURN_ALREADY_PROCESSING',
              message: 'Another player is processing this turn. Please wait.',
              retryable: true,
            },
          },
          { status: 409 }
        );
      }
      throw error;
    }

    try {
      // Process action through DM
      const dmResponse = await generateTurnNarrative(
        gameId,
        isStandardChoice ? undefined : action
      );

      console.log('DM Response received:', {
        success: dmResponse.success,
        narrativeLength: dmResponse.narrative?.length || 0,
        choicesCount: dmResponse.choices?.length || 0,
        statUpdatesCount: dmResponse.statUpdates?.length || 0,
        error: dmResponse.error || null,
        statUpdates: dmResponse.statUpdates?.map(u => ({
          characterId: u.characterId,
          changes: u.changes,
        })),
      });

      if (!dmResponse.success) {
        // Update turn to failed state
        await prisma.turn.update({
          where: { id: turn.id },
          data: {
            phase: 'completed',
            completedAt: new Date(),
          },
        });

        console.error('DM generation failed:', dmResponse.error);

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

      // Store action event - this shows what choice the player made
      await prisma.gameEvent.create({
        data: {
          gameId,
          turnId: turn.id,
          characterId: activePlayer.character.id,
          type: 'action',
          content: isStandardChoice 
            ? `${activePlayer.character.name} chose option ${action}`
            : `${activePlayer.character.name}: ${action}`,
          metadata: {
            action,
            playerId: userId,
          },
        },
      });

      // Store narrative event - this shows what actually happened
      await prisma.gameEvent.create({
        data: {
          gameId,
          turnId: turn.id,
          characterId: activePlayer.character.id, // Changed from null to show player's character
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

    console.log(`Stat updates processed:`, {
      requestedUpdates: dmResponse.statUpdates.map(u => ({
        characterId: u.characterId,
        changes: u.changes,
      })),
      successfulUpdates: Array.from(updatedPowerSheets.keys()),
    });

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

      // Calculate HP change for better messaging
      const hpChange = updatedPowerSheet.hp - oldPowerSheet.hp;
      const levelChange = updatedPowerSheet.level - oldPowerSheet.level;
      const statChanges = dmResponse.statUpdates.find(u => u.characterId === characterId)?.changes;
      
      // Create detailed stat change message
      const changes: string[] = [];
      
      if (hpChange < 0) {
        changes.push(`💔 Took ${Math.abs(hpChange)} damage (${updatedPowerSheet.hp}/${updatedPowerSheet.maxHp} HP)`);
      } else if (hpChange > 0) {
        changes.push(`💚 Healed ${hpChange} HP (${updatedPowerSheet.hp}/${updatedPowerSheet.maxHp} HP)`);
      }
      
      if (levelChange > 0) {
        changes.push(`⬆️ Level UP! Now level ${updatedPowerSheet.level}`);
      }
      
      // Check for attribute changes
      if (statChanges?.attributes) {
        const attrChanges = Object.entries(statChanges.attributes)
          .map(([attr, value]) => `${attr} ${value > 0 ? '+' : ''}${value}`)
          .join(', ');
        if (attrChanges) {
          changes.push(`📊 ${attrChanges}`);
        }
      }
      
      // Check for new statuses
      if (statChanges?.statuses && statChanges.statuses.length > 0) {
        const statusNames = statChanges.statuses.map((s: any) => s.name).join(', ');
        changes.push(`✨ Status: ${statusNames}`);
      }
      
      // Check for new perks
      if (statChanges?.newPerks && statChanges.newPerks.length > 0) {
        const perkNames = statChanges.newPerks.map((p: any) => p.name).join(', ');
        changes.push(`🎁 New Perk: ${perkNames}`);
      }
      
      const statChangeContent = changes.length > 0 
        ? `${character.name}: ${changes.join(' | ')}`
        : `${character.name}'s stats updated`;

      // Create stat change event
      await prisma.gameEvent.create({
        data: {
          gameId,
          turnId: turn.id,
          characterId,
          type: 'stat_change',
          content: statChangeContent,
          metadata: {
            changes: statChanges,
            hpChange,
            oldHp: oldPowerSheet.hp,
            newHp: updatedPowerSheet.hp,
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

    console.log(`Turn advanced:`, {
      gameId,
      previousTurnIndex: game.currentTurnIndex,
      newTurnIndex: updatedGame.currentTurnIndex,
      previousActivePlayer: userId,
      newActivePlayer: nextActivePlayer.userId,
      newActivePlayerName: nextActivePlayer.user.displayName,
    });

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
    } catch (turnError) {
      // If anything fails during turn processing, clean up the turn record
      console.error('Turn processing failed, cleaning up:', turnError);
      
      try {
        await prisma.turn.update({
          where: { id: turn.id },
          data: {
            phase: 'completed',
            completedAt: new Date(),
          },
        });
      } catch (cleanupError) {
        console.error('Failed to cleanup turn:', cleanupError);
      }
      
      throw turnError; // Re-throw to be caught by outer catch
    }
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

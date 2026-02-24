/**
 * Game Leave API Route
 * POST /api/games/[gameId]/leave
 * Allows authenticated users to leave a game session
 * Validates: Requirements 11.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { leaveGame, type LeaveGameParams } from '@/lib/game-manager';
import { broadcastPlayerLeft, broadcastGameUpdate } from '@/lib/realtime/broadcast';

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
            message: 'You must be logged in to leave a game',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { gameId } = params;
    
    // Prepare leave parameters
    const leaveParams: LeaveGameParams = {
      gameId,
      userId: session.user.id
    };
    
    // Leave the game
    const { game, removedPlayerId } = await leaveGame(leaveParams);
    
    // Broadcast player left event to all remaining players
    await broadcastPlayerLeft(gameId, removedPlayerId);
    
    // Broadcast updated game state with new player count
    await broadcastGameUpdate(gameId, {
      id: game.id,
      status: game.status,
      currentPlayerCount: game.players.length,
    });
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          gameId: game.id,
          leftAt: new Date(),
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Game leave error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === 'GAME_NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GAME_NOT_FOUND',
              message: 'Game not found',
              retryable: false
            }
          },
          { status: 404 }
        );
      }
      
      if (error.message === 'PLAYER_NOT_IN_GAME') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PLAYER_NOT_IN_GAME',
              message: 'You are not a member of this game',
              retryable: false
            }
          },
          { status: 400 }
        );
      }
      
      if (error.message === 'CANNOT_LEAVE_ACTIVE_GAME') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'CANNOT_LEAVE_ACTIVE_GAME',
              message: 'Cannot leave a game that has already started',
              retryable: false
            }
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
          message: 'An error occurred while leaving the game',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

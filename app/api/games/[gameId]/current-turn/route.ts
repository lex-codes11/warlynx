/**
 * Current Turn API Route
 * GET /api/games/[gameId]/current-turn
 * Returns the current turn state and active player information
 * Validates: Requirements 6.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getActivePlayer, getTurnOrderWithDetails } from '@/lib/turn-manager';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
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
            message: 'You must be logged in to view turn information',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { gameId } = params;
    
    // Verify the game exists
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        currentTurnIndex: true,
      }
    });
    
    if (!game) {
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
    
    // Verify the user is a player in this game
    const player = await prisma.gamePlayer.findFirst({
      where: {
        gameId,
        userId: session.user.id,
      }
    });
    
    if (!player) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a player in this game',
            retryable: false
          }
        },
        { status: 403 }
      );
    }
    
    // If game is not active, return appropriate response
    if (game.status !== 'active') {
      return NextResponse.json(
        {
          success: true,
          data: {
            gameStatus: game.status,
            currentTurn: null,
            activePlayer: null,
            turnOrder: null,
            message: game.status === 'lobby' 
              ? 'Game has not started yet' 
              : 'Game has ended'
          }
        },
        { status: 200 }
      );
    }
    
    // Get the active player
    const activePlayer = await getActivePlayer(gameId);
    
    // Get turn order with details
    const turnOrderDetails = await getTurnOrderWithDetails(gameId);
    
    // Get the current turn record if it exists
    const currentTurn = await prisma.turn.findFirst({
      where: {
        gameId,
        turnIndex: game.currentTurnIndex,
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          gameStatus: game.status,
          currentTurn: currentTurn ? {
            id: currentTurn.id,
            turnIndex: currentTurn.turnIndex,
            phase: currentTurn.phase,
            startedAt: currentTurn.startedAt,
            completedAt: currentTurn.completedAt,
          } : null,
          activePlayer: activePlayer ? {
            id: activePlayer.id,
            userId: activePlayer.userId,
            user: activePlayer.user,
            character: activePlayer.character ? {
              id: activePlayer.character.id,
              name: activePlayer.character.name,
              imageUrl: activePlayer.character.imageUrl,
              powerSheet: activePlayer.character.powerSheet,
            } : null,
          } : null,
          turnOrder: turnOrderDetails,
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get current turn error:', error);
    
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
    }
    
    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching turn information',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

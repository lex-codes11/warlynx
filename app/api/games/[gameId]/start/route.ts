/**
 * Game Start API Route
 * POST /api/games/[gameId]/start
 * Allows the host to start a game session
 * Validates: Requirements 5.3, 5.4, 5.5, 13.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { startGame, type StartGameParams } from '@/lib/game-manager';
import { broadcastGameUpdate } from '@/lib/realtime/broadcast';

export async function POST(
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
            message: 'You must be logged in to start a game',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { gameId } = params;
    
    // Prepare start parameters
    const startParams: StartGameParams = {
      gameId,
      hostId: session.user.id
    };
    
    // Start the game
    const game = await startGame(startParams);
    
    // Broadcast game started event to all players
    await broadcastGameUpdate(gameId, {
      id: game.id,
      status: game.status,
      turnOrder: game.turnOrder,
      currentTurnIndex: game.currentTurnIndex,
      startedAt: game.startedAt,
    });
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          game: {
            id: game.id,
            name: game.name,
            status: game.status,
            turnOrder: game.turnOrder,
            currentTurnIndex: game.currentTurnIndex,
            startedAt: game.startedAt,
            host: game.host,
            players: game.players.map(p => ({
              id: p.id,
              role: p.role,
              user: p.user,
              character: p.character ? {
                id: p.character.id,
                name: p.character.name,
                imageUrl: p.character.imageUrl
              } : null
            }))
          }
        }
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Game start error:', error);
    
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
      
      if (error.message === 'UNAUTHORIZED_NOT_HOST') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED_NOT_HOST',
              message: 'Only the host can start the game',
              retryable: false
            }
          },
          { status: 403 }
        );
      }
      
      if (error.message === 'GAME_ALREADY_STARTED') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GAME_ALREADY_STARTED',
              message: 'This game has already started',
              retryable: false
            }
          },
          { status: 400 }
        );
      }
      
      if (error.message === 'INCOMPLETE_CHARACTER_CREATION') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INCOMPLETE_CHARACTER_CREATION',
              message: 'All players must complete character creation before starting the game',
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
          message: 'An error occurred while starting the game',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

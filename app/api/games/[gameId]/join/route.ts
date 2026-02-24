/**
 * Game Join API Route
 * POST /api/games/[gameId]/join
 * Allows authenticated users to join an existing game session
 * Validates: Requirements 3.1, 3.4, 3.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { joinGame, type JoinGameParams } from '@/lib/game-manager';
import { broadcastPlayerJoined, broadcastGameUpdate } from '@/lib/realtime/broadcast';

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
            message: 'You must be logged in to join a game',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { gameId } = params;
    
    // Prepare join parameters
    const joinParams: JoinGameParams = {
      gameId,
      userId: session.user.id
    };
    
    // Join the game
    const { game, player, alreadyJoined } = await joinGame(joinParams);
    
    // Broadcast player joined event to all players in the game (only if new join)
    if (!alreadyJoined) {
      await broadcastPlayerJoined(gameId, {
        id: player.id,
        userId: player.user.id,
        displayName: player.user.displayName,
        avatar: player.user.avatar,
        role: player.role,
        joinedAt: player.joinedAt,
      });
      
      // Broadcast updated game state with new player count
      await broadcastGameUpdate(gameId, {
        id: game.id,
        status: game.status,
        currentPlayerCount: game.players.length + 1,
      });
    }
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          game: {
            id: game.id,
            name: game.name,
            inviteCode: game.inviteCode,
            maxPlayers: game.maxPlayers,
            difficultyCurve: game.difficultyCurve,
            toneTags: game.toneTags,
            houseRules: game.houseRules,
            status: game.status,
            createdAt: game.createdAt,
            host: game.host,
            currentPlayerCount: game.players.length + (alreadyJoined ? 0 : 1)
          },
          player: {
            id: player.id,
            role: player.role,
            joinedAt: player.joinedAt,
            user: player.user
          },
          alreadyJoined
        }
      },
      { status: alreadyJoined ? 200 : 201 }
    );
    
  } catch (error) {
    console.error('Game join error:', error);
    
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
      
      if (error.message === 'GAME_ALREADY_STARTED') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GAME_ALREADY_STARTED',
              message: 'This game has already started and cannot accept new players',
              retryable: false
            }
          },
          { status: 400 }
        );
      }
      
      if (error.message === 'GAME_FULL') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'GAME_FULL',
              message: 'This game has reached its maximum player capacity',
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
          message: 'An error occurred while joining the game',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

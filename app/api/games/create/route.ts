/**
 * Game Creation API Route
 * POST /api/games/create
 * Creates a new game session with unique invite code
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { createGame, validateGameParams, generateInviteLink, type CreateGameParams } from '@/lib/game-manager';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to create a game',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { name, maxPlayers, difficultyCurve, toneTags, houseRules } = body;
    
    // Prepare game parameters
    const gameParams: CreateGameParams = {
      name,
      hostId: session.user.id,
      maxPlayers: parseInt(maxPlayers, 10),
      difficultyCurve,
      toneTags: Array.isArray(toneTags) ? toneTags : [],
      houseRules: houseRules || null
    };
    
    // Validate parameters
    const validation = validateGameParams(gameParams);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid game parameters',
            details: validation.errors,
            retryable: true
          }
        },
        { status: 400 }
      );
    }
    
    // Create the game
    const { game, hostPlayer } = await createGame(gameParams);
    
    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const inviteLink = generateInviteLink(game.inviteCode, baseUrl);
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          game: {
            id: game.id,
            name: game.name,
            inviteCode: game.inviteCode,
            inviteLink,
            maxPlayers: game.maxPlayers,
            difficultyCurve: game.difficultyCurve,
            toneTags: game.toneTags,
            houseRules: game.houseRules,
            status: game.status,
            createdAt: game.createdAt,
            host: game.host
          },
          hostPlayer: {
            id: hostPlayer.id,
            role: hostPlayer.role,
            user: hostPlayer.user
          }
        }
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Game creation error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('unique invite code')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVITE_CODE_GENERATION_FAILED',
              message: 'Failed to generate unique invite code. Please try again.',
              retryable: true
            }
          },
          { status: 500 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while creating the game',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

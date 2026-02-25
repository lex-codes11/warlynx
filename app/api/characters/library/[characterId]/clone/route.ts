/**
 * Character Clone API Route
 * POST /api/characters/library/[characterId]/clone
 * Clones a library character to a specific game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to clone a character',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { characterId } = params;
    const body = await request.json();
    const { gameId } = body;
    
    if (!gameId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Game ID is required',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Fetch the source character
    const sourceCharacter = await prisma.character.findUnique({
      where: { id: characterId },
    });
    
    if (!sourceCharacter) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHARACTER_NOT_FOUND',
            message: 'Character not found',
            retryable: false
          }
        },
        { status: 404 }
      );
    }
    
    // Validate: only owner can clone
    if (sourceCharacter.userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only clone your own characters',
            retryable: false
          }
        },
        { status: 403 }
      );
    }
    
    // Validate: source must be a library character
    if (sourceCharacter.gameId !== null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Can only clone library characters',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Validate: user is in the target game
    const gamePlayer = await prisma.gamePlayer.findFirst({
      where: {
        gameId,
        userId: session.user.id,
      },
      include: {
        game: {
          select: {
            status: true,
          }
        }
      }
    });
    
    if (!gamePlayer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_IN_GAME',
            message: 'You must be a player in this game',
            retryable: false
          }
        },
        { status: 403 }
      );
    }
    
    // Validate: game must be in lobby status
    if (gamePlayer.game.status !== 'lobby') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GAME_ALREADY_STARTED',
            message: 'Cannot add characters to a game that has already started',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Check if player already has a character in this game
    if (gamePlayer.characterId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CHARACTER_ALREADY_EXISTS',
            message: 'You already have a character in this game',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Clone the character for the game
    const clonedCharacter = await prisma.character.create({
      data: {
        userId: session.user.id,
        gameId,
        name: sourceCharacter.name,
        fusionIngredients: sourceCharacter.fusionIngredients,
        description: sourceCharacter.description,
        abilities: sourceCharacter.abilities,
        weakness: sourceCharacter.weakness,
        alignment: sourceCharacter.alignment,
        archetype: sourceCharacter.archetype,
        tags: sourceCharacter.tags,
        powerSheet: sourceCharacter.powerSheet as any,
        imageUrl: sourceCharacter.imageUrl,
        imagePrompt: sourceCharacter.imagePrompt,
        isReady: true,
      }
    });
    
    // Link the character to the game player
    await prisma.gamePlayer.update({
      where: { id: gamePlayer.id },
      data: {
        characterId: clonedCharacter.id,
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        character: clonedCharacter
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Character clone error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while cloning the character',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

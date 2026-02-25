/**
 * Character Library Item API Route
 * DELETE /api/characters/library/[characterId] - Delete a saved character
 * POST /api/characters/library/[characterId]/clone - Clone character to a game
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function DELETE(
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
            message: 'You must be logged in to delete a character',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { characterId } = params;
    
    // Fetch the character
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        userId: true,
        gameId: true,
      }
    });
    
    if (!character) {
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
    
    // Validate: only owner can delete
    if (character.userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You can only delete your own characters',
            retryable: false
          }
        },
        { status: 403 }
      );
    }
    
    // Validate: can only delete library characters (not game characters)
    if (character.gameId !== null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_OPERATION',
            message: 'Cannot delete characters that are in active games',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Delete the character
    await prisma.character.delete({
      where: { id: characterId }
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Character deleted successfully'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Character deletion error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting the character',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

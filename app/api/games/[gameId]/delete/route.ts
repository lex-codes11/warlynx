/**
 * Game Deletion API Route
 * DELETE /api/games/[gameId]/delete
 * Allows host to delete a game in lobby status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to delete a game',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { gameId } = params;
    
    // Fetch the game
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        hostId: true,
        status: true,
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
    
    // Validate: only host can delete the game
    if (game.hostId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED_NOT_HOST',
            message: 'Only the host can delete this game',
            retryable: false
          }
        },
        { status: 403 }
      );
    }
    
    // Validate: can only delete games in lobby status
    if (game.status !== 'lobby') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'GAME_ALREADY_STARTED',
            message: 'Cannot delete a game that has already started',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Delete the game (cascade will handle related records)
    await prisma.game.delete({
      where: { id: gameId }
    });
    
    return NextResponse.json(
      {
        success: true,
        message: 'Game deleted successfully'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Game deletion error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while deleting the game',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

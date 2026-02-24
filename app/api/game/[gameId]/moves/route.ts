/**
 * AI Move Generation API Endpoint
 * Generates move options for the current player's turn
 * Validates: Requirements 9.1, 9.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateMoves } from '@/lib/ai/move-generator';
import { Character, GameContext } from '@/types/game-enhancements';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { characterId } = await request.json();

    if (!characterId) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Character ID is required' } },
        { status: 400 }
      );
    }

    // Fetch game with characters and recent events
    const game = await prisma.game.findUnique({
      where: { id: params.gameId },
      include: {
        players: {
          include: {
            character: true,
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Game not found' } },
        { status: 404 }
      );
    }

    // Find the character
    const character = await prisma.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Character not found' } },
        { status: 404 }
      );
    }

    // Verify character belongs to user
    if (character.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not your character' } },
        { status: 403 }
      );
    }

    // Build game context
    const currentSituation = game.events[0]?.content || 'The adventure begins...';
    const recentActions = game.events
      .filter((e) => e.type === 'action')
      .slice(0, 3)
      .map((e) => e.content);

    const allCharacters = game.players
      .filter((p) => p.character)
      .map((p) => p.character!);

    const gameContext: GameContext = {
      currentSituation,
      recentActions,
      characters: allCharacters as any[],
      currentCharacter: character as any,
    };

    // Generate AI moves (Requirement 9.1, 9.5)
    const result = await generateMoves(character as any, gameContext);

    return NextResponse.json({
      success: result.success,
      moves: result.moves,
      error: result.error,
    });
  } catch (error) {
    console.error('Move generation error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate moves',
        },
      },
      { status: 500 }
    );
  }
}

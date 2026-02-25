/**
 * Game Status API Route
 * GET /api/game/[gameId]/status
 * 
 * Returns the current game state for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { gameId } = params;

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            character: {
              select: {
                id: true,
                name: true,
                powerSheet: true,
              },
            },
          },
        },
        turns: {
          orderBy: {
            turnIndex: 'desc',
          },
          take: 3,
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const activePlayerId = game.turnOrder[game.currentTurnIndex];
    const activePlayer = game.players.find(p => p.userId === activePlayerId);

    return NextResponse.json({
      gameId: game.id,
      status: game.status,
      currentTurnIndex: game.currentTurnIndex,
      turnOrder: game.turnOrder,
      activePlayerId,
      activePlayerName: activePlayer?.user.displayName,
      requestingUserId: session.user.id,
      isRequestingUserActive: activePlayerId === session.user.id,
      players: game.players.map(p => ({
        userId: p.userId,
        displayName: p.user.displayName,
        characterName: p.character?.name,
        characterHp: (p.character?.powerSheet as any)?.hp,
        characterMaxHp: (p.character?.powerSheet as any)?.maxHp,
      })),
      recentTurns: game.turns.map(t => ({
        turnIndex: t.turnIndex,
        phase: t.phase,
        activePlayerId: t.activePlayerId,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
      })),
    });
  } catch (error) {
    console.error('Game status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

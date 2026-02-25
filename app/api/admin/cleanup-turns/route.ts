/**
 * Admin endpoint to cleanup stuck turns
 * GET /api/admin/cleanup-turns
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Checking for stuck turns...');

    // Find all turns stuck in "resolving" phase
    const stuckTurns = await prisma.turn.findMany({
      where: {
        phase: 'resolving',
      },
      include: {
        game: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    console.log(`Found ${stuckTurns.length} stuck turns`);

    if (stuckTurns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck turns found',
        cleaned: 0,
      });
    }

    // Complete stuck turns
    const results = [];
    for (const turn of stuckTurns) {
      console.log(`Cleaning up turn ${turn.id} for game ${turn.gameId}`);
      
      await prisma.turn.update({
        where: { id: turn.id },
        data: {
          phase: 'completed',
          completedAt: new Date(),
        },
      });

      results.push({
        turnId: turn.id,
        gameId: turn.gameId,
        startedAt: turn.startedAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${stuckTurns.length} stuck turns`,
      cleaned: stuckTurns.length,
      turns: results,
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup turns',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  getCharacterHistory,
  getProgressionSummary,
  getLatestSnapshot,
} from "@/lib/stats-tracker";

/**
 * GET /api/characters/[characterId]/stats
 * Returns current stats and progression history for a character
 * 
 * Query parameters:
 * - limit: Maximum number of history snapshots to return (default: 50)
 * - includeSummary: Include progression summary (default: true)
 * 
 * **Validates: Requirements 9.5**
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { characterId: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { characterId } = params;

    // Validate characterId
    if (!characterId || typeof characterId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid character ID" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const includeSummary = searchParams.get("includeSummary") !== "false";

    // Fetch character and verify access
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        game: {
          include: {
            players: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this character's stats
    // User must be either the character owner or a player in the same game
    const isOwner = character.userId === userId;
    const isGamePlayer = character.game.players.length > 0;

    if (!isOwner && !isGamePlayer) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to view this character's stats",
        },
        { status: 403 }
      );
    }

    // Get current stats from character's Power Sheet
    const currentStats = character.powerSheet as any;

    // Get latest snapshot (most recent recorded stats)
    const latestSnapshot = await getLatestSnapshot(characterId);

    // Get progression history
    const history = await getCharacterHistory(characterId, limit);

    // Get progression summary if requested
    let summary = null;
    if (includeSummary) {
      summary = await getProgressionSummary(characterId);
    }

    return NextResponse.json({
      success: true,
      character: {
        id: character.id,
        name: character.name,
        gameId: character.gameId,
      },
      currentStats: {
        level: currentStats.level,
        hp: currentStats.hp,
        maxHp: currentStats.maxHp,
        attributes: currentStats.attributes,
        statuses: currentStats.statuses || [],
        perks: currentStats.perks || [],
        abilities: currentStats.abilities || [],
        weakness: currentStats.weakness,
      },
      latestSnapshot,
      history,
      summary,
    });
  } catch (error) {
    console.error("Stats retrieval error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        retryable: false,
      },
      { status: 500 }
    );
  }
}

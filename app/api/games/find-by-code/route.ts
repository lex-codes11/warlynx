import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_CODE",
            message: "Invite code is required",
          },
        },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { inviteCode: code },
      select: {
        id: true,
        name: true,
        status: true,
        maxPlayers: true,
        _count: {
          select: {
            players: true,
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GAME_NOT_FOUND",
            message: "No game found with this invite code",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      game,
    });
  } catch (error) {
    console.error("Find game error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to find game",
        },
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generatePowerSheet } from "@/lib/ai/power-sheet-generator";
import { generateCharacterImage } from "@/lib/ai/image-generator";
import {
  checkRateLimit,
  RATE_LIMITS,
  formatRateLimitError,
  getRateLimitHeaders,
} from "@/lib/rate-limit";

/**
 * Character creation request body
 */
interface CreateCharacterRequest {
  gameId: string;
  name: string;
  fusionIngredients: string;
  description: string;
  abilities: string[];
  weakness: string;
  alignment?: string | null;
  archetype?: string | null;
  tags?: string[];
}

/**
 * Validates character creation request
 * **Validates: Requirements 4.2, 4.3**
 */
function validateCharacterRequest(
  data: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!data.gameId || typeof data.gameId !== "string") {
    errors.push("gameId is required");
  }

  if (!data.name || typeof data.name !== "string" || data.name.trim().length === 0) {
    errors.push("name is required");
  }

  if (data.name && data.name.length > 100) {
    errors.push("name must be 100 characters or less");
  }

  if (!data.fusionIngredients || typeof data.fusionIngredients !== "string" || data.fusionIngredients.trim().length === 0) {
    errors.push("fusionIngredients is required");
  }

  if (data.fusionIngredients && data.fusionIngredients.length > 200) {
    errors.push("fusionIngredients must be 200 characters or less");
  }

  if (!data.description || typeof data.description !== "string" || data.description.trim().length === 0) {
    errors.push("description is required");
  }

  if (data.description && data.description.length > 500) {
    errors.push("description must be 500 characters or less");
  }

  if (!Array.isArray(data.abilities)) {
    errors.push("abilities must be an array");
  } else if (data.abilities.length < 3 || data.abilities.length > 6) {
    errors.push("abilities must contain 3-6 items");
  } else if (!data.abilities.every((a: any) => typeof a === "string" && a.trim().length > 0)) {
    errors.push("all abilities must be non-empty strings");
  }

  if (!data.weakness || typeof data.weakness !== "string" || data.weakness.trim().length === 0) {
    errors.push("weakness is required");
  }

  if (data.weakness && data.weakness.length > 200) {
    errors.push("weakness must be 200 characters or less");
  }

  // Optional fields validation
  if (data.alignment !== undefined && data.alignment !== null) {
    if (typeof data.alignment !== "string") {
      errors.push("alignment must be a string");
    } else if (data.alignment.length > 50) {
      errors.push("alignment must be 50 characters or less");
    }
  }

  if (data.archetype !== undefined && data.archetype !== null) {
    if (typeof data.archetype !== "string") {
      errors.push("archetype must be a string");
    } else if (data.archetype.length > 50) {
      errors.push("archetype must be 50 characters or less");
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push("tags must be an array");
    } else if (!data.tags.every((t: any) => typeof t === "string")) {
      errors.push("all tags must be strings");
    } else if (data.tags.length > 10) {
      errors.push("tags must contain 10 or fewer items");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * POST /api/characters/create
 * Creates a new character for a player in a game
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.8, 13.4**
 */
export async function POST(request: NextRequest) {
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

    // **Validates: Requirement 13.4** - Check rate limit for character creation
    const rateLimitKey = `character-creation:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.CHARACTER_CREATION);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        formatRateLimitError(rateLimit, 'character creation'),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request
    const validation = validateCharacterRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const data: CreateCharacterRequest = body;

    // Check if game exists and user is a player
    const game = await prisma.game.findUnique({
      where: { id: data.gameId },
      include: {
        players: {
          where: { userId },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 }
      );
    }

    if (game.players.length === 0) {
      return NextResponse.json(
        { success: false, error: "You are not a player in this game" },
        { status: 403 }
      );
    }

    // **Validates: Requirement 4.1** - Enforce one character per player per game
    const existingCharacter = await prisma.character.findFirst({
      where: {
        gameId: data.gameId,
        userId,
      },
    });

    if (existingCharacter) {
      return NextResponse.json(
        {
          success: false,
          error: "You already have a character in this game",
        },
        { status: 400 }
      );
    }

    // **Validates: Requirement 4.4** - Generate Power Sheet via AI
    const powerSheetResult = await generatePowerSheet({
      name: data.name,
      fusionIngredients: data.fusionIngredients,
      description: data.description,
      abilities: data.abilities,
      weakness: data.weakness,
      alignment: data.alignment,
      archetype: data.archetype,
      tags: data.tags,
    });

    if (!powerSheetResult.success || !powerSheetResult.powerSheet) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate Power Sheet",
          details: powerSheetResult.error,
          preservedInput: data, // **Validates: Requirement 4.8** - Preserve input on failure
        },
        { status: 500 }
      );
    }

    // **Validates: Requirements 4.5, 4.6** - Generate character image via AI
    const imageResult = await generateCharacterImage({
      name: data.name,
      fusionIngredients: data.fusionIngredients,
      description: data.description,
      alignment: data.alignment,
      archetype: data.archetype,
      tags: data.tags,
    });

    if (!imageResult.success || !imageResult.imageUrl || !imageResult.imagePrompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate character image",
          details: imageResult.error,
          preservedInput: data, // **Validates: Requirement 4.8** - Preserve input on failure
        },
        { status: 500 }
      );
    }

    // Create character in database
    const character = await prisma.character.create({
      data: {
        gameId: data.gameId,
        userId,
        name: data.name,
        fusionIngredients: data.fusionIngredients,
        description: data.description,
        abilities: data.abilities,
        weakness: data.weakness,
        alignment: data.alignment,
        archetype: data.archetype,
        tags: data.tags || [],
        powerSheet: powerSheetResult.powerSheet as any, // Prisma Json type
        imageUrl: imageResult.imageUrl,
        imagePrompt: imageResult.imagePrompt,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Update GamePlayer to link the character
    await prisma.gamePlayer.update({
      where: {
        gameId_userId: {
          gameId: data.gameId,
          userId,
        },
      },
      data: {
        characterId: character.id,
      },
    });

    // Log image generation
    await prisma.imageGenerationLog.create({
      data: {
        userId,
        characterId: character.id,
        prompt: imageResult.imagePrompt,
        imageUrl: imageResult.imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      character,
    }, {
      headers: getRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    console.error("Character creation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

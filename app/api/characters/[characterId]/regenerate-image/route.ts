import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateCharacterImage } from "@/lib/ai/image-generator";
import {
  checkRateLimit,
  RATE_LIMITS,
  formatRateLimitError,
  getRateLimitHeaders,
} from "@/lib/rate-limit";

/**
 * POST /api/characters/[characterId]/regenerate-image
 * Regenerates the character image with rate limiting
 * 
 * **Validates: Requirements 4.7, 12.5, 13.4**
 */
export async function POST(
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

    // Check rate limit
    const rateLimitKey = `image-regeneration:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.IMAGE_GENERATION);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        formatRateLimitError(rateLimit, 'image regeneration'),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    // Fetch character and verify ownership
    const character = await prisma.character.findUnique({
      where: { id: characterId },
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

    if (!character) {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    // Verify user owns this character
    if (character.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have permission to regenerate this character's image",
        },
        { status: 403 }
      );
    }

    // Generate new character image
    const imageResult = await generateCharacterImage({
      name: character.name,
      fusionIngredients: character.fusionIngredients,
      description: character.description,
      alignment: character.alignment,
      archetype: character.archetype,
      tags: character.tags,
    });

    if (!imageResult.success || !imageResult.imageUrl || !imageResult.imagePrompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate character image",
          details: imageResult.error,
          retryable: true,
        },
        { status: 500 }
      );
    }

    // Update character with new image
    const updatedCharacter = await prisma.character.update({
      where: { id: characterId },
      data: {
        imageUrl: imageResult.imageUrl,
        imagePrompt: imageResult.imagePrompt,
        updatedAt: new Date(),
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

    // **Validates: Requirement 12.5** - Track regeneration attempts in ImageGenerationLog
    await prisma.imageGenerationLog.create({
      data: {
        userId,
        characterId: character.id,
        prompt: imageResult.imagePrompt,
        imageUrl: imageResult.imageUrl,
      },
    });

    return NextResponse.json(
      {
        success: true,
        character: updatedCharacter,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
      },
      {
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  } catch (error) {
    console.error("Image regeneration error:", error);
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

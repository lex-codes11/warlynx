import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateCharacterImage } from "@/lib/ai/image-generator";

/**
 * Rate limiting configuration
 * Default: 3 regenerations per hour per user
 */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_IMAGE_GENERATION || "3",
  10
);

/**
 * In-memory rate limiting store
 * Structure: Map<userId, { count: number, resetAt: number }>
 * 
 * Note: For production with multiple instances, use Redis instead
 * Exported for testing purposes
 */
export const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

/**
 * Check if user has exceeded rate limit
 * **Validates: Requirements 4.7, 12.5**
 */
function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  // No previous requests or window expired
  if (!userLimit || now >= userLimit.resetAt) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(userId, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
    };
  }

  // Within rate limit window
  if (userLimit.count < RATE_LIMIT_MAX_REQUESTS) {
    userLimit.count++;
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - userLimit.count,
      resetAt: userLimit.resetAt,
    };
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: userLimit.resetAt,
  };
}

/**
 * POST /api/characters/[characterId]/regenerate-image
 * Regenerates the character image with rate limiting
 * 
 * **Validates: Requirements 4.7, 12.4, 12.5**
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
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      const resetInSeconds = Math.ceil(
        (rateLimit.resetAt - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          details: `You have reached the maximum number of image regenerations. Please try again in ${resetInSeconds} seconds.`,
          retryable: true,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
            "Retry-After": resetInSeconds.toString(),
          },
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
        headers: {
          "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
        },
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

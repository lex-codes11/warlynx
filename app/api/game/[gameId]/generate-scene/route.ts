/**
 * Battle Scene Image Generation API Route
 * POST /api/game/[gameId]/generate-scene
 * Generates an image of the current battle scene
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { checkRateLimit, RATE_LIMITS, formatRateLimitError } from '@/lib/rate-limit';

// Lazy initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
    });
  }
  return openai;
}

export async function POST(
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
            message: 'You must be logged in to generate scene images',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const { gameId } = params;
    const userId = session.user.id;
    
    // Check rate limit (use same limit as character image generation)
    const rateLimitKey = `scene-generation:${userId}`;
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.IMAGE_GENERATION);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        formatRateLimitError(rateLimit, 'scene image generation'),
        { status: 429 }
      );
    }
    
    // Verify user is in the game
    const gamePlayer = await prisma.gamePlayer.findFirst({
      where: {
        gameId,
        userId,
      },
      include: {
        game: {
          include: {
            players: {
              include: {
                character: true,
                user: {
                  select: {
                    displayName: true,
                  }
                }
              }
            },
            events: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 5,
            }
          }
        }
      }
    });
    
    if (!gamePlayer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_IN_GAME',
            message: 'You must be a player in this game',
            retryable: false
          }
        },
        { status: 403 }
      );
    }
    
    const game = gamePlayer.game;
    
    // Get custom description from request body (optional)
    const body = await request.json().catch(() => ({}));
    const customDescription = body.description || '';
    
    // Build scene description
    const scenePrompt = buildScenePrompt(game, customDescription);
    
    // Generate image with DALL-E 3
    const client = getOpenAIClient();
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: scenePrompt,
      n: 1,
      size: "1792x1024", // Landscape for battle scenes
      quality: "standard",
      style: "vivid",
    });
    
    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL returned from DALL-E");
    }
    
    // Log the generation
    await prisma.imageGenerationLog.create({
      data: {
        userId,
        characterId: gamePlayer.characterId,
        prompt: scenePrompt,
        imageUrl,
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        imageUrl,
        prompt: scenePrompt,
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Scene generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while generating the scene image',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

/**
 * Build the DALL-E prompt for battle scene
 */
function buildScenePrompt(game: any, customDescription: string): string {
  const parts: string[] = [];
  
  // Get alive characters
  const aliveCharacters = game.players
    .filter((p: any) => p.character && (p.character.powerSheet as any)?.hp > 0)
    .map((p: any) => ({
      name: p.character.name,
      fusion: p.character.fusionIngredients,
      description: p.character.description,
    }));
  
  // Get recent events for context
  const recentEvents = game.events
    .slice(0, 3)
    .map((e: any) => e.content)
    .join(' ');
  
  // Start with custom description if provided
  if (customDescription) {
    parts.push(customDescription);
  } else {
    // Build automatic description
    parts.push('An epic battle scene featuring:');
    
    aliveCharacters.forEach((char: any, index: number) => {
      parts.push(
        `${index + 1}. ${char.name} (${char.fusion}) - ${char.description.substring(0, 100)}`
      );
    });
    
    // Add context from recent events
    if (recentEvents) {
      parts.push(`Current situation: ${recentEvents.substring(0, 200)}`);
    }
  }
  
  // Add style instructions
  parts.push(
    'Cinematic wide-angle shot, dramatic lighting, intense action, high detail, fantasy game art style, dynamic composition.'
  );
  
  return parts.join(' ');
}

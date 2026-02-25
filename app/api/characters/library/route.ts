/**
 * Character Library API Route
 * GET /api/characters/library - Get user's saved characters
 * POST /api/characters/library - Save a character to library
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to view your character library',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    // Fetch user's saved characters (characters with null gameId are library characters)
    const characters = await prisma.character.findMany({
      where: {
        userId: session.user.id,
        gameId: null,
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        fusionIngredients: true,
        description: true,
        abilities: true,
        weakness: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        characters
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Character library fetch error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching your character library',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to save a character',
            retryable: false
          }
        },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, fusionIngredients, description, abilities, weakness, imageUrl, imagePrompt, powerSheet } = body;
    
    // Validate required fields
    if (!name || !fusionIngredients || !description) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name, fusion ingredients, and description are required',
            retryable: false
          }
        },
        { status: 400 }
      );
    }
    
    // Create character in library (gameId is null)
    const character = await prisma.character.create({
      data: {
        userId: session.user.id,
        gameId: null, // Library character
        name,
        fusionIngredients,
        description,
        abilities: abilities || [],
        weakness: weakness || '',
        imageUrl: imageUrl || '',
        imagePrompt: imagePrompt || '',
        powerSheet: (powerSheet || {}) as any,
        isReady: true,
      },
      select: {
        id: true,
        name: true,
        fusionIngredients: true,
        description: true,
        abilities: true,
        weakness: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        character
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Character library save error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while saving the character',
          retryable: true
        }
      },
      { status: 500 }
    );
  }
}

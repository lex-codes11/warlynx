/**
 * Character Update API Route
 * 
 * Handles character attribute updates with validation and real-time sync.
 * 
 * Requirements:
 * - 3.3: Real-time character updates
 * - 3.4: Persist character changes immediately upon edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  updateCharacterAttributes,
  canEditCharacter,
  getCharacter,
} from '@/lib/character-mutations';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { characterId, updates } = body;

    // Validate required fields
    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Check if user can edit this character
    const canEdit = await canEditCharacter(characterId, session.user.id);
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Cannot edit this character. Either you do not own it or it is already marked as ready.' },
        { status: 403 }
      );
    }

    // Update character
    const updatedCharacter = await updateCharacterAttributes(characterId, updates);

    return NextResponse.json({
      success: true,
      character: updatedCharacter,
    });
  } catch (error) {
    console.error('Character update error:', error);
    
    // Handle validation errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update character' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get character ID from query params
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    // Get character
    const character = await getCharacter(characterId);

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    // Check if user owns this character or is in the same game
    if (character.userId !== session.user.id) {
      // TODO: Add check if user is in the same game
      // For now, only allow owner to view
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      character,
    });
  } catch (error) {
    console.error('Character fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch character' },
      { status: 500 }
    );
  }
}

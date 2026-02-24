# Game Enhancements Integration Guide

## Overview

This guide provides instructions for integrating all the newly implemented game enhancement features into your application.

## Completed Components

### 1. AI Services

#### MoveGeneratorService (`lib/ai/move-generator.ts`)
- Generates 4 AI move options (A, B, C, D) for player turns
- Includes timeout handling (3 seconds)
- Provides fallback moves on failure
- **Usage**: Called via `/api/game/[gameId]/moves` endpoint

#### ImageGenerationService (`lib/ai/image-generation-service.ts`)
- Detects appearance changes in narrative text
- Regenerates character images when appearance changes
- Includes timeout handling (10 seconds)
- **Usage**: Called via `appearance-change-handler.ts`

### 2. UI Components

#### MoveSelector (`components/gameplay/MoveSelector.tsx`)
- Displays 4 AI-generated move options
- Provides custom move input field
- Only enabled during player's turn
- **Props**: `aiMoves`, `onMoveSelected`, `isPlayerTurn`, `isLoading`

#### CharacterImageViewer (`components/character/CharacterImageViewer.tsx`)
- Renders character images at different sizes (thumbnail, large, fullscreen)
- Opens modal on click for fullscreen view
- Maintains aspect ratios
- **Props**: `imageUrl`, `characterName`, `size`, `onClick`

#### TTSControls (`components/gameplay/TTSControls.tsx`)
- Enable/disable toggle for text-to-speech
- Playback controls (pause, resume, stop)
- Shows playback state indicator
- **Props**: `enabled`, `onEnabledChange`

#### EnhancedGameplayView (`components/gameplay/EnhancedGameplayView.tsx`)
- Comprehensive gameplay view integrating all features
- Includes TTS, move selection, character images, stats, abilities, turn indicator
- **Props**: `game`, `userId`, `userCharacterId`, `onMoveSubmit`

### 3. Services & Utilities

#### TTSService (`lib/tts-service.ts`)
- Text-to-speech service using Web Speech API
- Supports Azure Speech SDK (placeholder for full integration)
- Methods: `initialize()`, `speak()`, `pause()`, `resume()`, `stop()`, `isPlaying()`

#### AppearanceChangeHandler (`lib/appearance-change-handler.ts`)
- Monitors narrative for appearance change keywords
- Triggers image regeneration automatically
- Broadcasts updates to all players
- **Usage**: Call `onNarrativeGenerated(gameId, narrative)` after generating story content

### 4. Hooks

#### useTTSNarration (`hooks/useTTSNarration.ts`)
- Automatically narrates new story content
- Detects content changes and triggers TTS
- **Usage**: `useTTSNarration({ enabled, storyContent, ttsOptions })`

#### useTTSSpeaker (`hooks/useTTSNarration.ts`)
- Manual TTS control for specific text
- **Usage**: `const { speak, pause, resume, stop } = useTTSSpeaker()`

### 5. API Endpoints

#### `/api/game/[gameId]/moves` (POST)
- Generates AI move options for current player
- Requires `characterId` in request body
- Returns `{ success, moves, error }`

## Integration Steps

### Step 1: Update Game Room Page

Replace the existing `GameRoomClient` with `EnhancedGameplayView`:

```tsx
// app/game/[gameId]/room/page.tsx
import { EnhancedGameplayView } from '@/components/gameplay/EnhancedGameplayView';

export default function GameRoomPage({ params }: { params: { gameId: string } }) {
  // ... fetch game data ...

  const handleMoveSubmit = async (move: string) => {
    const response = await fetch(`/api/game/${params.gameId}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: move }),
    });
    
    if (response.ok) {
      // Refresh or update game state
      window.location.reload();
    }
  };

  return (
    <EnhancedGameplayView
      game={game}
      userId={session.user.id}
      userCharacterId={userCharacter?.id}
      onMoveSubmit={handleMoveSubmit}
    />
  );
}
```

### Step 2: Integrate Appearance Change Detection

Add to your narrative generation logic:

```typescript
// After generating narrative in your DM/AI service
import { onNarrativeGenerated } from '@/lib/appearance-change-handler';

// In your narrative generation function
const narrative = await generateNarrative(gameId, action);

// Trigger appearance change detection
await onNarrativeGenerated(gameId, narrative);
```

### Step 3: Initialize TTS Service

Add to your root layout or app initialization:

```tsx
// app/layout.tsx
'use client';

import { useEffect } from 'react';
import { initializeTTS } from '@/lib/tts-service';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize TTS service on client side
    initializeTTS();
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### Step 4: Environment Variables

Add Azure TTS credentials (optional):

```env
# .env.local
NEXT_PUBLIC_AZURE_SPEECH_KEY=your_azure_key
NEXT_PUBLIC_AZURE_SPEECH_REGION=your_azure_region
```

If not provided, the system will use Web Speech API as fallback.

### Step 5: Update Existing Components (Optional)

If you want to add individual features to existing pages:

#### Add TTS to Story Display
```tsx
import { TTSControls } from '@/components/gameplay/TTSControls';
import { useTTSNarration } from '@/hooks/useTTSNarration';

function StoryDisplay({ storyContent }) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  
  useTTSNarration({ enabled: ttsEnabled, storyContent });
  
  return (
    <>
      <TTSControls enabled={ttsEnabled} onEnabledChange={setTtsEnabled} />
      {/* Story content */}
    </>
  );
}
```

#### Add Character Image Viewer
```tsx
import { CharacterImageViewer } from '@/components/character/CharacterImageViewer';

function CharacterCard({ character }) {
  return (
    <CharacterImageViewer
      imageUrl={character.imageUrl}
      characterName={character.name}
      size="large"
    />
  );
}
```

#### Add Move Selector
```tsx
import { MoveSelector } from '@/components/gameplay/MoveSelector';

function TurnPanel({ aiMoves, isPlayerTurn, onMoveSelected }) {
  return (
    <MoveSelector
      aiMoves={aiMoves}
      onMoveSelected={onMoveSelected}
      isPlayerTurn={isPlayerTurn}
    />
  );
}
```

## Testing Checklist

- [ ] AI move generation returns 4 options
- [ ] Move selector displays AI options and custom input
- [ ] Character images open in fullscreen modal
- [ ] TTS narrates new story content when enabled
- [ ] TTS stops when disabled
- [ ] Appearance changes trigger image regeneration
- [ ] New images broadcast to all players
- [ ] All components integrate without errors

## Known Limitations

1. **Azure TTS**: Full Azure Speech SDK integration is a placeholder. Currently uses Web Speech API fallback.
2. **Image Generation**: Requires OpenAI API key and storage configuration (S3 or Supabase).
3. **Real-time Updates**: Requires active Supabase connection for broadcasting.

## Troubleshooting

### TTS Not Working
- Check browser compatibility (Web Speech API support)
- Verify Azure credentials if using Azure
- Check browser console for errors

### AI Moves Not Generating
- Verify OpenAI API key is set
- Check API endpoint logs for errors
- Ensure character and game context are valid

### Images Not Updating
- Verify storage provider is configured (S3 or Supabase)
- Check appearance change keywords are present in narrative
- Review console logs for image generation errors

## Next Steps

1. Run the application and test each feature
2. Monitor console logs for any errors
3. Adjust styling to match your design system
4. Add error boundaries for graceful failure handling
5. Implement loading states for better UX
6. Add analytics to track feature usage

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Review the design document for requirements
3. Test individual components in isolation
4. Verify all dependencies are installed

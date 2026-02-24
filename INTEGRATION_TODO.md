# Integration TODO

## Completed ✅
1. **Epic Loading Bar** - Added fullscreen loading overlay with progress steps
2. **Weakness-based Move Rejection** - Fixed: characters can now use moves even if related to their weakness
3. **Simplified Character Creation** - Only fusion ingredients + description needed

## Remaining Issues

### 1. A-D Move Choices Not Showing
**Problem**: The game room is using `GameRoomClient` instead of `EnhancedGameplayView`

**Solution**: Replace GameRoomClient with EnhancedGameplayView in `/app/game/[gameId]/room/page.tsx`

**File to modify**: `app/game/[gameId]/room/page.tsx`
```tsx
// Change from:
import GameRoomClient from "./GameRoomClient";

// To:
import { EnhancedGameplayView } from "@/components/gameplay/EnhancedGameplayView";

// And in the return:
return (
  <EnhancedGameplayView
    game={game}
    userId={session.user.id}
    userCharacterId={userPlayer?.character?.id}
    onMoveSubmit={async (move: string) => {
      // Handle move submission
    }}
  />
);
```

### 2. Images Too Small and Not Clickable
**Problem**: GameRoomClient uses small images without click handlers

**Solution**: EnhancedGameplayView already has `CharacterImageViewer` with:
- Larger images (64x64 default, configurable)
- Click to open fullscreen modal
- Close button in modal

This will be fixed when EnhancedGameplayView is integrated.

### 3. No Stats/Ability Summaries Showing
**Problem**: GameRoomClient doesn't include the new components

**Solution**: EnhancedGameplayView already includes:
- `StatsDisplay` - Shows HP, energy bars for all characters
- `AbilitySummaryContainer` - Shows abilities for all characters
- `TurnIndicator` - Shows whose turn it is

This will be fixed when EnhancedGameplayView is integrated.

### 4. Move Submission Handler
**Problem**: Need to wire up the `onMoveSubmit` handler in EnhancedGameplayView

**Current flow in GameRoomClient**:
```tsx
const handleSubmitAction = async (action: string) => {
  const response = await fetch(`/api/game/${game.id}/turn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  
  if (response.ok) {
    router.refresh();
  }
};
```

**Solution**: Pass this handler to EnhancedGameplayView as `onMoveSubmit` prop.

## Quick Integration Steps

1. Open `app/game/[gameId]/room/page.tsx`
2. Import EnhancedGameplayView instead of GameRoomClient
3. Create a move submission handler
4. Pass game data and handler to EnhancedGameplayView
5. Test that A-D choices, images, and stats all appear

## Notes
- EnhancedGameplayView is already fully implemented
- All components (MoveSelector, CharacterImageViewer, StatsDisplay, AbilitySummary) are ready
- Just needs to be wired up in the game room page

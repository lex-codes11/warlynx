# Character Library & Game Deletion Features

This document describes the new character library and game deletion features added to the application.

## Features Overview

### 1. Game Deletion in Lobby

Hosts can now delete games that are still in the lobby status (before the game starts).

#### Implementation Details

- **API Route**: `DELETE /api/games/[gameId]/delete`
- **Authorization**: Only the game host can delete a game
- **Restrictions**: Can only delete games in "lobby" status
- **UI Location**: Lobby page - "Delete Game" button in Host Controls section

#### Usage

1. Navigate to a game lobby where you are the host
2. Click the "Delete Game" button in the Host Controls section
3. Confirm the deletion in the dialog
4. You will be redirected to the dashboard

### 2. Character Library System

Users can now save characters to their personal library and reuse them across multiple games.

#### Key Components

**API Routes:**
- `GET /api/characters/library` - Fetch user's saved characters
- `POST /api/characters/library` - Save a new character to library
- `DELETE /api/characters/library/[characterId]` - Delete a saved character
- `POST /api/characters/library/[characterId]/clone` - Clone a library character to a game

**Pages:**
- `/characters/library` - View and manage saved characters
- Character creation page now includes "Use Saved Character" option

#### How It Works

**Saving Characters:**
1. Create a character in a game
2. After character creation, click "Save to Library" button
3. Character is saved to your personal library (stored with `gameId: null`)
4. Saved characters can be reused in any future game

**Using Saved Characters:**
1. When creating a character for a game, click "Use Saved Character"
2. Select a character from your library
3. The character is cloned to the current game
4. You're redirected to the lobby with your character ready

**Managing Library:**
1. Access your library from the dashboard via "Character Library" button
2. View all saved characters with their details
3. Delete characters you no longer need

#### Database Schema

Characters are stored in the `character` table with:
- `gameId: null` for library characters (not tied to any game)
- `gameId: <game-id>` for characters in active games

When cloning, a new character record is created with the target game's ID.

## Technical Details

### Security & Validation

**Game Deletion:**
- Validates user authentication
- Ensures only host can delete
- Prevents deletion of active/completed games
- Cascade deletes related records (players, characters)

**Character Library:**
- Users can only save/delete their own characters
- Can only clone to games they're a player in
- Validates game is in lobby status before cloning
- Prevents duplicate characters per player per game

### UI/UX Enhancements

**Dashboard:**
- Added "Character Library" button next to "Create New Game"

**Lobby:**
- Reorganized host controls into a single section
- Added "Delete Game" button with confirmation dialog
- Improved button states and loading indicators

**Character Creation:**
- Added "Use Saved Character" toggle
- Shows library selection interface
- "Save to Library" button after character creation
- Success feedback when saved

**Character Library Page:**
- Grid layout showing all saved characters
- Character cards with image, name, and details
- Delete functionality with confirmation
- Empty state with helpful message

## Future Enhancements

Potential improvements for the character library system:

1. **Character Editing**: Allow users to edit saved characters
2. **Character Sharing**: Share characters with other players
3. **Character Tags**: Add custom tags for organization
4. **Search & Filter**: Search and filter saved characters
5. **Character Templates**: Pre-made character templates
6. **Import/Export**: Export characters as JSON for backup

## Testing

Test files included:
- `app/api/games/[gameId]/delete/__tests__/route.test.ts` - Game deletion API tests

To run tests:
```bash
npm test
```

## Migration Notes

No database migrations are required. The existing `character` table already supports:
- `gameId` can be `null` for library characters
- All necessary fields for character data

The feature uses the existing schema and adds new API routes and UI components.

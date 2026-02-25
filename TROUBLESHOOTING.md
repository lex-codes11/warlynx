# Warlynx Troubleshooting Guide

## Stuck Turn Issue - Both Players Waiting

If both players see "Waiting for other player" or think it's the other player's turn, follow these steps:

### Step 1: Check Game Status

Visit this URL in your browser (replace `<gameId>` with your actual game ID):
```
http://localhost:8080/api/game/<gameId>/status
```

This will show you:
- Current turn index
- Active player ID
- Turn order
- Recent turns
- Player states

### Step 2: Run Diagnostic Script

From the project root, run:
```bash
npx tsx scripts/diagnose-game-state.ts <gameId>
```

This script will:
- Show detailed game state
- Identify stuck turns
- Automatically fix common issues
- Show which player should be active

### Step 3: Manual Database Fixes

If the diagnostic script doesn't fix the issue, you can manually fix it using SQL:

#### Delete Stuck Turns
```sql
-- Delete all turns in 'resolving' phase
DELETE FROM "Turn" WHERE phase = 'resolving';
```

#### Reset Game to Specific Turn
```sql
-- Reset to first player's turn (replace 'your-game-id')
UPDATE "Game" 
SET "currentTurnIndex" = 0 
WHERE id = 'your-game-id';
```

#### Check Current Game State
```sql
-- See current game state
SELECT 
  id,
  status,
  "currentTurnIndex",
  "turnOrder"
FROM "Game"
WHERE id = 'your-game-id';
```

#### Check Recent Turns
```sql
-- See recent turns
SELECT 
  "turnIndex",
  phase,
  "activePlayerId",
  "startedAt",
  "completedAt"
FROM "Turn"
WHERE "gameId" = 'your-game-id'
ORDER BY "turnIndex" DESC
LIMIT 5;
```

### Step 4: Refresh Both Browsers

After fixing the database:
1. Hard refresh both browser windows (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Or close and reopen both browser tabs
3. The game should now show the correct active player

### Common Causes

1. **Stuck Turn in Resolving Phase**: A turn started processing but never completed
   - Fixed by: Deleting turns in 'resolving' phase older than 30 seconds
   
2. **Race Condition**: Both players submitted moves at the same time
   - Fixed by: The turn route now prevents duplicate turn submissions
   
3. **Real-time Sync Issue**: Browser didn't receive the turn completion event
   - Fixed by: Hard refresh or improved logging to debug

4. **CHARACTER_NOT_FOUND Error**: DM generated stat updates for non-existent characters
   - Fixed by: Character ID validation in processStatUpdates

### Prevention

The following improvements have been made to prevent this issue:
- Turn route now checks for stuck turns (>30 seconds in resolving)
- Character ID validation before applying stat updates
- Better error handling and logging
- Automatic cleanup of stuck turns

### Getting Help

If the issue persists:
1. Check the server logs for errors
2. Run the diagnostic script and share the output
3. Check the `/api/game/<gameId>/status` endpoint
4. Look for console errors in the browser developer tools

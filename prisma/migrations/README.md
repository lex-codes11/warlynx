# Database Migrations

This directory contains SQL migration files for the database schema.

## Game Enhancements Migration

**File:** `add_game_enhancements.sql`

This migration adds support for the game enhancements feature, including:

### Changes

1. **Game Table Updates**
   - Added `currentTurnPlayerId` column to track the active player in a game session
   - This enables the turn indicator feature to show whose turn it is

2. **Character Table Updates**
   - Added `isReady` boolean column (default: false) to track player ready state
   - This supports the pre-game character review and ready workflow
   - Description field has a 1000 character limit (enforced at application level)

3. **New TypingStatus Table**
   - Tracks real-time typing indicators for players in a game
   - Columns:
     - `gameId`: Reference to the game session
     - `userId`: Reference to the user who is typing
     - `isTyping`: Boolean flag indicating typing state
     - `lastUpdated`: Timestamp of last update
   - Primary key: Composite of (gameId, userId)
   - Foreign keys to Game and User tables with CASCADE delete

### Running the Migration

To apply this migration to your database:

```bash
# Using psql
psql -U your_username -d your_database -f prisma/migrations/add_game_enhancements.sql

# Or using Prisma
npx prisma db push
```

### Rollback

To rollback this migration:

```sql
-- Remove TypingStatus table
DROP TABLE IF EXISTS "TypingStatus";

-- Remove added columns
ALTER TABLE "Game" DROP COLUMN IF EXISTS "currentTurnPlayerId";
ALTER TABLE "Character" DROP COLUMN IF EXISTS "isReady";
```

### Notes

- The character description length constraint (1000 chars) is enforced at the application level through Prisma schema and validation utilities
- The TypingStatus table is designed for real-time updates via Supabase Realtime
- All foreign key constraints use CASCADE delete to maintain referential integrity

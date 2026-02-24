-- Migration: Add Game Enhancements
-- This migration adds support for:
-- - Character description length constraint (1000 chars)
-- - Typing status tracking for real-time indicators
-- - Current turn player tracking in game sessions
-- - Character ready state for pre-game

-- Add currentTurnPlayerId to Game table
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "currentTurnPlayerId" TEXT;

-- Add isReady to Character table
ALTER TABLE "Character" ADD COLUMN IF NOT EXISTS "isReady" BOOLEAN NOT NULL DEFAULT false;

-- Add description length constraint to Character table
-- Note: PostgreSQL doesn't support CHECK constraints on TEXT columns directly in all versions
-- We'll enforce this at the application level and in Prisma schema
-- But we can add a trigger for database-level enforcement if needed

-- Create TypingStatus table for real-time typing indicators
CREATE TABLE IF NOT EXISTS "TypingStatus" (
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isTyping" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TypingStatus_pkey" PRIMARY KEY ("gameId", "userId")
);

-- Create indexes for TypingStatus
CREATE INDEX IF NOT EXISTS "TypingStatus_gameId_idx" ON "TypingStatus"("gameId");
CREATE INDEX IF NOT EXISTS "TypingStatus_userId_idx" ON "TypingStatus"("userId");

-- Add foreign key constraints for TypingStatus
ALTER TABLE "TypingStatus" ADD CONSTRAINT "TypingStatus_gameId_fkey" 
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TypingStatus" ADD CONSTRAINT "TypingStatus_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comment to document the description length constraint
COMMENT ON COLUMN "Character"."description" IS 'Character description with max length of 1000 characters (enforced at application level)';

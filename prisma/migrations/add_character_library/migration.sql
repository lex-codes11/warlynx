-- AlterTable: Make gameId nullable to support character library
-- Characters with gameId = NULL are library characters (not tied to any game)
-- Characters with gameId set are game characters

-- First, we need to drop the foreign key constraint
ALTER TABLE "Character" DROP CONSTRAINT "Character_gameId_fkey";

-- Drop the unique constraint that includes gameId
ALTER TABLE "Character" DROP CONSTRAINT "Character_gameId_userId_key";

-- Make gameId nullable
ALTER TABLE "Character" ALTER COLUMN "gameId" DROP NOT NULL;

-- Re-add the foreign key constraint with nullable support
ALTER TABLE "Character" ADD CONSTRAINT "Character_gameId_fkey" 
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add a new unique constraint that only applies when gameId is not null
-- This ensures one character per user per game, but allows multiple library characters
CREATE UNIQUE INDEX "Character_gameId_userId_key" ON "Character"("gameId", "userId") WHERE "gameId" IS NOT NULL;

/**
 * Cleanup Completed Turns Script
 * 
 * This script removes completed turns that are blocking new turn submissions.
 * This happens when a turn completes but the game state wasn't properly updated.
 * 
 * Usage: npx tsx scripts/cleanup-completed-turns.ts <gameId>
 */

import { prisma } from '../lib/prisma';

async function cleanupCompletedTurns(gameId: string) {
  console.log(`\n🧹 Cleaning up completed turns for game: ${gameId}\n`);

  // Get game state
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      id: true,
      status: true,
      currentTurnIndex: true,
      turnOrder: true,
    },
  });

  if (!game) {
    console.error('❌ Game not found');
    return;
  }

  console.log('📊 Current Game State:');
  console.log(`   Status: ${game.status}`);
  console.log(`   Current Turn Index: ${game.currentTurnIndex}`);
  console.log(`   Turn Order: ${JSON.stringify(game.turnOrder)}`);

  // Find completed turns at the current turn index
  const completedTurns = await prisma.turn.findMany({
    where: {
      gameId,
      turnIndex: game.currentTurnIndex,
      phase: 'completed',
    },
  });

  if (completedTurns.length === 0) {
    console.log('\n✅ No completed turns found at current turn index');
    return;
  }

  console.log(`\n⚠️  Found ${completedTurns.length} completed turn(s) at current turn index:`);
  completedTurns.forEach((turn) => {
    console.log(`   - Turn ${turn.turnIndex} (ID: ${turn.id})`);
    console.log(`     Started: ${turn.startedAt}`);
    console.log(`     Completed: ${turn.completedAt}`);
  });

  // Delete completed turns
  console.log('\n🗑️  Deleting completed turns...');
  const result = await prisma.turn.deleteMany({
    where: {
      gameId,
      turnIndex: game.currentTurnIndex,
      phase: 'completed',
    },
  });

  console.log(`✅ Deleted ${result.count} completed turn(s)`);
  console.log('\n✨ Cleanup complete! Players can now submit moves.');
}

// Run the script
const gameId = process.argv[2];

if (!gameId) {
  console.error('Usage: npx tsx scripts/cleanup-completed-turns.ts <gameId>');
  process.exit(1);
}

cleanupCompletedTurns(gameId)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

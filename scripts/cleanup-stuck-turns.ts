/**
 * Cleanup script for stuck turns
 * Run with: DATABASE_URL="your-db-url" npx tsx scripts/cleanup-stuck-turns.ts
 * Or just run it and it will use the .env file automatically
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupStuckTurns() {
  console.log('Checking for stuck turns...');

  // Find all turns stuck in "resolving" phase
  const stuckTurns = await prisma.turn.findMany({
    where: {
      phase: 'resolving',
    },
    include: {
      game: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  console.log(`Found ${stuckTurns.length} stuck turns`);

  if (stuckTurns.length === 0) {
    console.log('No stuck turns found. All clear!');
    return;
  }

  // Delete or complete stuck turns
  for (const turn of stuckTurns) {
    console.log(`Cleaning up turn ${turn.id} for game ${turn.gameId}`);
    
    await prisma.turn.update({
      where: { id: turn.id },
      data: {
        phase: 'completed',
        completedAt: new Date(),
      },
    });
  }

  console.log(`Cleaned up ${stuckTurns.length} stuck turns`);
}

cleanupStuckTurns()
  .then(() => {
    console.log('Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

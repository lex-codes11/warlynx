/**
 * Check and Fix HP Script
 * 
 * This script checks character HP in the database and can manually fix it.
 * 
 * Usage: 
 *   Check HP: npx tsx scripts/check-and-fix-hp.ts <gameId>
 *   Fix HP: npx tsx scripts/check-and-fix-hp.ts <gameId> <characterName> <newHP>
 */

import { prisma } from '../lib/prisma';

async function checkAndFixHP(gameId: string, characterName?: string, newHP?: number) {
  console.log(`\n🔍 Checking HP for game: ${gameId}\n`);

  // Get game with characters
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
          character: true,
        },
      },
    },
  });

  if (!game) {
    console.error('❌ Game not found');
    return;
  }

  console.log('📊 Character HP Status:\n');

  for (const player of game.players) {
    if (!player.character) continue;

    const powerSheet = player.character.powerSheet as any;
    const hpPercent = Math.round((powerSheet.hp / powerSheet.maxHp) * 100);

    console.log(`${player.character.name} (${player.user.displayName}):`);
    console.log(`  Character ID: ${player.character.id}`);
    console.log(`  HP: ${powerSheet.hp}/${powerSheet.maxHp} (${hpPercent}%)`);
    console.log(`  Level: ${powerSheet.level}`);
    console.log('');

    // If we're fixing HP for this character
    if (characterName && player.character.name === characterName && newHP !== undefined) {
      console.log(`🔧 Updating ${characterName}'s HP to ${newHP}...`);
      
      powerSheet.hp = Math.max(0, Math.min(powerSheet.maxHp, newHP));
      
      await prisma.character.update({
        where: { id: player.character.id },
        data: {
          powerSheet: powerSheet,
        },
      });

      const newHpPercent = Math.round((powerSheet.hp / powerSheet.maxHp) * 100);
      console.log(`✅ Updated! New HP: ${powerSheet.hp}/${powerSheet.maxHp} (${newHpPercent}%)\n`);
    }
  }

  // Check recent stat updates from events
  console.log('📝 Recent Stat Change Events:\n');
  const statEvents = await prisma.gameEvent.findMany({
    where: {
      gameId,
      type: 'stat_change',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
    include: {
      character: {
        select: {
          name: true,
        },
      },
    },
  });

  if (statEvents.length === 0) {
    console.log('  No stat change events found');
  } else {
    statEvents.forEach((event) => {
      const metadata = event.metadata as any;
      console.log(`  ${event.character?.name || 'Unknown'}: ${event.content}`);
      if (metadata?.hpChange) {
        console.log(`    HP Change: ${metadata.hpChange > 0 ? '+' : ''}${metadata.hpChange}`);
        console.log(`    Old HP: ${metadata.oldHp}, New HP: ${metadata.newHp}`);
      }
      console.log('');
    });
  }
}

// Run the script
const gameId = process.argv[2];
const characterName = process.argv[3];
const newHP = process.argv[4] ? parseInt(process.argv[4]) : undefined;

if (!gameId) {
  console.error('Usage:');
  console.error('  Check HP: npx tsx scripts/check-and-fix-hp.ts <gameId>');
  console.error('  Fix HP: npx tsx scripts/check-and-fix-hp.ts <gameId> <characterName> <newHP>');
  process.exit(1);
}

checkAndFixHP(gameId, characterName, newHP)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

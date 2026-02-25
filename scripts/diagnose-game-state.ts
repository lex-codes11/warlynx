/**
 * Diagnose Game State Script
 * 
 * This script helps diagnose and fix issues with stuck games where
 * both players think it's the other player's turn.
 * 
 * Usage: npx tsx scripts/diagnose-game-state.ts <gameId>
 */

import { prisma } from '../lib/prisma';

async function diagnoseGameState(gameId: string) {
  console.log(`\n🔍 Diagnosing game state for: ${gameId}\n`);

  // Fetch game with all related data
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          character: {
            select: {
              id: true,
              name: true,
              powerSheet: true,
            },
          },
        },
      },
      turns: {
        orderBy: {
          turnIndex: 'desc',
        },
        take: 5,
      },
      events: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      },
    },
  });

  if (!game) {
    console.error('❌ Game not found');
    return;
  }

  console.log('📊 GAME STATUS');
  console.log('─'.repeat(50));
  console.log(`Status: ${game.status}`);
  console.log(`Current Turn Index: ${game.currentTurnIndex}`);
  console.log(`Turn Order: ${JSON.stringify(game.turnOrder)}`);
  console.log(`Created: ${game.createdAt}`);
  console.log(`Started: ${game.startedAt}`);

  console.log('\n👥 PLAYERS');
  console.log('─'.repeat(50));
  game.players.forEach((player, index) => {
    const isActive = game.turnOrder[game.currentTurnIndex] === player.userId;
    const powerSheet = player.character?.powerSheet as any;
    console.log(`${isActive ? '👉' : '  '} Player ${index + 1}:`);
    console.log(`   User ID: ${player.userId}`);
    console.log(`   Email: ${player.user.email}`);
    console.log(`   Display Name: ${player.user.displayName}`);
    console.log(`   Character: ${player.character?.name || 'None'}`);
    if (powerSheet) {
      console.log(`   HP: ${powerSheet.hp}/${powerSheet.maxHp}`);
      console.log(`   Level: ${powerSheet.level}`);
    }
    console.log(`   ${isActive ? '🎯 ACTIVE PLAYER' : ''}`);
  });

  console.log('\n🔄 RECENT TURNS');
  console.log('─'.repeat(50));
  if (game.turns.length === 0) {
    console.log('No turns recorded yet');
  } else {
    game.turns.forEach((turn) => {
      const player = game.players.find(p => p.userId === turn.activePlayerId);
      console.log(`Turn ${turn.turnIndex}:`);
      console.log(`  Player: ${player?.user.displayName || turn.activePlayerId}`);
      console.log(`  Phase: ${turn.phase}`);
      console.log(`  Started: ${turn.startedAt}`);
      console.log(`  Completed: ${turn.completedAt || 'Not completed'}`);
      
      if (turn.phase === 'resolving') {
        const secondsAgo = Math.floor((Date.now() - turn.startedAt.getTime()) / 1000);
        console.log(`  ⚠️  STUCK IN RESOLVING (${secondsAgo}s ago)`);
      }
    });
  }

  console.log('\n📝 RECENT EVENTS');
  console.log('─'.repeat(50));
  if (game.events.length === 0) {
    console.log('No events recorded yet');
  } else {
    game.events.slice(0, 5).forEach((event) => {
      const character = game.players
        .find(p => p.character?.id === event.characterId)
        ?.character;
      console.log(`[${event.type}] ${character?.name || 'System'}: ${event.content.substring(0, 80)}...`);
    });
  }

  // Check for issues
  console.log('\n🔧 DIAGNOSTICS');
  console.log('─'.repeat(50));

  const issues: string[] = [];
  const fixes: Array<() => Promise<void>> = [];

  // Check for stuck turns
  const stuckTurns = game.turns.filter(turn => {
    if (turn.phase !== 'resolving') return false;
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    return turn.startedAt < thirtySecondsAgo;
  });

  if (stuckTurns.length > 0) {
    issues.push(`Found ${stuckTurns.length} stuck turn(s) in resolving phase`);
    fixes.push(async () => {
      console.log('Deleting stuck turns...');
      for (const turn of stuckTurns) {
        await prisma.turn.delete({ where: { id: turn.id } });
        console.log(`  ✓ Deleted turn ${turn.turnIndex}`);
      }
    });
  }

  // Check if current turn index is valid
  if (game.currentTurnIndex >= game.turnOrder.length) {
    issues.push(`Current turn index (${game.currentTurnIndex}) is out of bounds`);
    fixes.push(async () => {
      console.log('Resetting turn index to 0...');
      await prisma.game.update({
        where: { id: gameId },
        data: { currentTurnIndex: 0 },
      });
      console.log('  ✓ Turn index reset');
    });
  }

  // Check if active player exists
  const activePlayerId = game.turnOrder[game.currentTurnIndex];
  const activePlayer = game.players.find(p => p.userId === activePlayerId);
  if (!activePlayer) {
    issues.push(`Active player (${activePlayerId}) not found in game`);
  }

  // Check if active player has a character
  if (activePlayer && !activePlayer.character) {
    issues.push(`Active player has no character`);
  }

  // Check if active player's character is dead
  if (activePlayer?.character) {
    const powerSheet = activePlayer.character.powerSheet as any;
    if (powerSheet.hp <= 0) {
      issues.push(`Active player's character is dead (HP: ${powerSheet.hp})`);
      fixes.push(async () => {
        console.log('Advancing to next alive player...');
        // This would require importing advanceTurn from turn-manager
        console.log('  ⚠️  Manual fix required: Call advanceTurn() or skip to next player');
      });
    }
  }

  if (issues.length === 0) {
    console.log('✅ No issues detected');
  } else {
    console.log('❌ Issues detected:');
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });

    if (fixes.length > 0) {
      console.log('\n🔧 Applying fixes...');
      for (const fix of fixes) {
        await fix();
      }
      console.log('\n✅ Fixes applied successfully');
    }
  }

  console.log('\n');
}

// Run the script
const gameId = process.argv[2];

if (!gameId) {
  console.error('Usage: npx tsx scripts/diagnose-game-state.ts <gameId>');
  process.exit(1);
}

diagnoseGameState(gameId)
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

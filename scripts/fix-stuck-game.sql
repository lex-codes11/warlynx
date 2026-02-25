-- Fix Stuck Game Script
-- Run this in your database console to fix the current stuck game

-- 1. First, let's see the current state
SELECT 
  id,
  status,
  "currentTurnIndex",
  "turnOrder"
FROM "Game"
WHERE id = 'cmm0xy44i0002jxteiq5sn22i';

-- 2. Check for stuck turns
SELECT 
  id,
  "turnIndex",
  phase,
  "activePlayerId",
  "startedAt",
  "completedAt"
FROM "Turn"
WHERE "gameId" = 'cmm0xy44i0002jxteiq5sn22i'
ORDER BY "turnIndex" DESC;

-- 3. Delete all stuck turns (in resolving phase)
DELETE FROM "Turn" 
WHERE "gameId" = 'cmm0xy44i0002jxteiq5sn22i' 
AND phase = 'resolving';

-- 4. Check which player should be active
-- turnOrder: [ 'cmm0xcls500002x4fxwfcd0zk', 'cmm0yo4pw0000zuwgwhcs76kr' ]
-- currentTurnIndex: 1 means player at index 1 is active
-- That's 'cmm0yo4pw0000zuwgwhcs76kr' (lexylexy1)

-- 5. If you need to reset to a specific player's turn:
-- To reset to PhoenixReign's turn (index 0):
-- UPDATE "Game" SET "currentTurnIndex" = 0 WHERE id = 'cmm0xy44i0002jxteiq5sn22i';

-- To reset to lexylexy1's turn (index 1):
-- UPDATE "Game" SET "currentTurnIndex" = 1 WHERE id = 'cmm0xy44i0002jxteiq5sn22i';

-- 6. Verify the fix
SELECT 
  g.id,
  g.status,
  g."currentTurnIndex",
  g."turnOrder",
  u1."displayName" as player1,
  u2."displayName" as player2
FROM "Game" g
LEFT JOIN "GamePlayer" gp1 ON gp1."gameId" = g.id AND gp1."userId" = g."turnOrder"[1]
LEFT JOIN "User" u1 ON u1.id = gp1."userId"
LEFT JOIN "GamePlayer" gp2 ON gp2."gameId" = g.id AND gp2."userId" = g."turnOrder"[2]
LEFT JOIN "User" u2 ON u2.id = gp2."userId"
WHERE g.id = 'cmm0xy44i0002jxteiq5sn22i';

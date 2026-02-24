# Turn Permission Enforcement

This module provides utilities for validating that only the active player can submit actions during their turn.

**Validates: Requirements 6.4, 13.2**

## Usage

### In API Routes (Recommended)

Use `requireTurnPermission` to fail fast on permission violations:

```typescript
import { requireTurnPermission, isTurnPermissionError } from '@/lib/turn-permissions';

export async function POST(request: Request) {
  const { gameId, userId, action } = await request.json();

  try {
    // Throws TurnPermissionError if user is not the active player
    await requireTurnPermission(gameId, userId);

    // Process the action...
    const result = await processAction(gameId, userId, action);

    return Response.json({ success: true, result });
  } catch (error) {
    if (isTurnPermissionError(error)) {
      return Response.json(
        { 
          success: false, 
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: 403 }
      );
    }
    throw error;
  }
}
```

### For Conditional Logic

Use `validateTurnPermission` when you need to check permissions without throwing:

```typescript
import { validateTurnPermission } from '@/lib/turn-permissions';

const result = await validateTurnPermission(gameId, userId);

if (!result.allowed) {
  console.log(`Permission denied: ${result.error?.message}`);
  return { success: false, error: result.error };
}

// Proceed with action...
```

## API Reference

### `validateTurnPermission(gameId: string, userId: string)`

Validates if a user has permission to submit an action for a game.

**Returns:** `Promise<PermissionValidationResult>`
- `allowed: boolean` - Whether the action is allowed
- `error?: { code: PermissionErrorCode, message: string }` - Error details if not allowed

### `requireTurnPermission(gameId: string, userId: string)`

Validates turn permission and throws an error if not allowed. Use in API routes where you want to fail fast.

**Throws:** `TurnPermissionError` if permission is denied

### `isTurnPermissionError(error: unknown)`

Type guard to check if an error is a `TurnPermissionError`.

**Returns:** `boolean`

## Error Codes

- `NOT_YOUR_TURN` - User attempted to submit an action when it's not their turn
- `GAME_NOT_ACTIVE` - Game is not in active state
- `PLAYER_NOT_IN_GAME` - Unable to verify player permissions (player may not be in game)

## Example: Turn Processing API Route

```typescript
// app/api/games/[gameId]/turn/route.ts
import { requireTurnPermission, isTurnPermissionError } from '@/lib/turn-permissions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { gameId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { action } = await request.json();

  try {
    // Validate turn permission
    await requireTurnPermission(params.gameId, session.user.id);

    // Process the turn action
    const result = await processTurnAction(params.gameId, session.user.id, action);

    return Response.json({ success: true, result });
  } catch (error) {
    if (isTurnPermissionError(error)) {
      return Response.json(
        { 
          success: false, 
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: 403 }
      );
    }

    console.error('Turn processing error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Testing

The module includes comprehensive unit tests covering:
- Permission validation for active and non-active players
- Error handling for database failures
- Edge cases (empty IDs, special characters, etc.)
- Integration with the turn manager

Run tests with:
```bash
npm test -- lib/__tests__/turn-permissions.test.ts
```

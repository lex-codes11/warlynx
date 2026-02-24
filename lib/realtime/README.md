# Real-Time Infrastructure

This directory contains the real-time communication infrastructure for the Warlynx multiplayer game using Supabase Realtime.

## Overview

The real-time system enables instant synchronization of game state across all connected players. It uses Supabase Realtime's broadcast feature to send events to specific game rooms.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Components                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useRealtimeGame Hook                                │   │
│  │  - Manages connection state                          │   │
│  │  - Subscribes to game events                         │   │
│  │  - Provides reconnect/disconnect controls            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket Connection
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Realtime                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Game Rooms (Channels)                               │   │
│  │  - game:game-123                                     │   │
│  │  - game:game-456                                     │   │
│  │  - ...                                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Broadcast Events
                            │
┌─────────────────────────────────────────────────────────────┐
│                     Server API Routes                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Broadcast Utilities                                 │   │
│  │  - broadcastGameUpdate()                             │   │
│  │  - broadcastPlayerJoined()                           │   │
│  │  - broadcastTurnStarted()                            │   │
│  │  - ...                                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Files

### `supabase.ts`
Core Supabase Realtime configuration and client-side utilities.

**Key Functions:**
- `createRealtimeClient()` - Creates a Supabase client for real-time operations
- `subscribeToGame()` - Subscribes to a game room for real-time updates
- `unsubscribeFromGame()` - Unsubscribes from a game room
- `getChannelState()` - Gets the current connection state

### `broadcast.ts`
Server-side utilities for broadcasting events to game rooms.

**Key Functions:**
- `broadcastGameUpdate()` - Broadcast game state changes
- `broadcastPlayerJoined()` - Broadcast when a player joins
- `broadcastPlayerLeft()` - Broadcast when a player leaves
- `broadcastTurnStarted()` - Broadcast when a turn starts
- `broadcastTurnResolved()` - Broadcast when a turn is resolved
- `broadcastCharacterUpdate()` - Broadcast character changes
- `broadcastStatsUpdate()` - Broadcast stat changes
- `broadcastEvent()` - Generic broadcast function

### `hooks/useRealtimeGame.ts`
React hook for managing real-time game subscriptions in client components.

## Event Types

The system supports the following real-time events:

| Event Type | Description | Payload |
|------------|-------------|---------|
| `game:updated` | Game state changed | Game data object |
| `player:joined` | Player joined the game | Player object |
| `player:left` | Player left the game | Player ID string |
| `turn:started` | New turn started | Turn object |
| `turn:resolved` | Turn was resolved | Turn response object |
| `character:updated` | Character data changed | Character object |
| `stats:updated` | Character stats changed | Stats update object |

## Usage

### Client-Side (React Components)

```tsx
'use client';

import { useRealtimeGame } from '@/hooks/useRealtimeGame';

export function GameRoom({ gameId }: { gameId: string }) {
  const { connectionState, isConnected, reconnect } = useRealtimeGame({
    gameId,
    onGameUpdated: (data) => {
      console.log('Game updated:', data);
      // Update local state
    },
    onPlayerJoined: (player) => {
      console.log('Player joined:', player);
      // Update roster
    },
    onTurnStarted: (turn) => {
      console.log('Turn started:', turn);
      // Update turn display
    },
  });

  return (
    <div>
      <div>Connection: {connectionState}</div>
      {!isConnected && (
        <button onClick={reconnect}>Reconnect</button>
      )}
      {/* Game UI */}
    </div>
  );
}
```

### Server-Side (API Routes)

```typescript
import { broadcastGameUpdate, broadcastPlayerJoined } from '@/lib/realtime/broadcast';

// In your API route
export async function POST(request: Request) {
  // ... game logic ...
  
  // Broadcast the update to all connected clients
  await broadcastGameUpdate(gameId, {
    status: 'active',
    turnIndex: 1,
    currentTurnIndex: 0,
  });
  
  return Response.json({ success: true });
}
```

## Environment Variables

The real-time system requires the following environment variables:

```bash
# Client-side (public)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Server-side (private)
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Connection State Management

The `useRealtimeGame` hook manages connection state automatically:

- **`connecting`** - Establishing connection to Supabase
- **`connected`** - Successfully connected and subscribed
- **`disconnected`** - Not connected (initial state or after disconnect)
- **`error`** - Connection error occurred

The hook provides `reconnect()` and `disconnect()` functions for manual control.

## Best Practices

### 1. Conditional Subscription
Only subscribe when needed to reduce resource usage:

```tsx
const { isConnected } = useRealtimeGame({
  gameId,
  enabled: gameStatus === 'active', // Only subscribe for active games
  onGameUpdated: handleUpdate,
});
```

### 2. Cleanup
The hook automatically cleans up subscriptions when the component unmounts.

### 3. Error Handling
Always handle connection errors gracefully:

```tsx
const { connectionState, reconnect } = useRealtimeGame({
  gameId,
  onGameUpdated: handleUpdate,
});

if (connectionState === 'error') {
  return <ErrorMessage onRetry={reconnect} />;
}
```

### 4. Rate Limiting
The system is configured with a rate limit of 10 events per second per channel to prevent flooding.

### 5. Broadcast Efficiency
Unsubscribe from channels immediately after broadcasting to free resources:

```typescript
// This is handled automatically in broadcast utilities
await broadcastGameUpdate(gameId, data);
// Channel is automatically unsubscribed
```

## Testing

Unit tests are provided for all real-time utilities:

```bash
# Run all real-time tests
npm test -- lib/realtime/__tests__

# Run specific test file
npm test -- lib/realtime/__tests__/supabase.test.ts
npm test -- lib/realtime/__tests__/broadcast.test.ts
```

## Troubleshooting

### Connection Issues

**Problem:** Client can't connect to Supabase Realtime

**Solutions:**
1. Verify environment variables are set correctly
2. Check that Supabase project has Realtime enabled
3. Ensure CORS is configured for your domain
4. Check browser console for WebSocket errors

### Events Not Received

**Problem:** Clients not receiving broadcast events

**Solutions:**
1. Verify the channel name matches (format: `game:{gameId}`)
2. Check that the event type matches exactly
3. Ensure the client is subscribed before events are broadcast
4. Check Supabase dashboard for Realtime logs

### Performance Issues

**Problem:** Slow or delayed updates

**Solutions:**
1. Reduce broadcast frequency (batch updates when possible)
2. Check network latency
3. Verify rate limiting isn't being triggered
4. Consider using database triggers for some updates

## Future Enhancements

Potential improvements for the real-time system:

1. **Presence Tracking** - Track which players are currently online
2. **Typing Indicators** - Show when players are typing actions
3. **Optimistic Updates** - Update UI immediately before server confirmation
4. **Reconnection Strategy** - Implement exponential backoff for reconnections
5. **Message Queue** - Queue messages during disconnection and send on reconnect
6. **Compression** - Compress large payloads to reduce bandwidth

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Broadcast Documentation](https://supabase.com/docs/guides/realtime/broadcast)
- [Design Document - Real-Time Communication System](../../.kiro/specs/warlynx-multiplayer-game/design.md#5-real-time-communication-system)

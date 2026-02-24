# Gameplay Components

This directory contains gameplay-related UI components for the multiplayer game.

## AbilitySummary

Displays abilities for all characters in the game session. Shows abilities grouped by character, visible to all players, with formatted display for readability.

### Basic Usage

```tsx
import { AbilitySummary } from '@/components/gameplay';

function GameplayPage({ characters }) {
  return <AbilitySummary characters={characters} />;
}
```

### With Real-time Updates

For automatic real-time ability updates, use the `AbilitySummaryContainer`:

```tsx
import { AbilitySummaryContainer } from '@/components/gameplay';

function GameplayPage({ gameId, initialCharacters }) {
  return (
    <AbilitySummaryContainer
      gameId={gameId}
      initialCharacters={initialCharacters}
    />
  );
}
```

The container component automatically subscribes to character updates and refreshes the display when abilities change.

### Features

- **Displays all character abilities** - Shows abilities for every character in the session
- **Grouped by character** - Abilities are organized under each character's name
- **Power level indicators** - Visual bars showing ability strength (1-10 scale)
- **Cooldown information** - Shows cooldown duration for abilities
- **Weakness display** - Shows character weaknesses
- **Perks display** - Shows unlocked character perks
- **Real-time updates** - Automatically updates when abilities change (with container)
- **Visible to all players** - No access restrictions, all players see all abilities

### Props

#### AbilitySummary

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `characters` | `Character[]` | Yes | Array of characters to display |
| `className` | `string` | No | Additional CSS classes |

#### AbilitySummaryContainer

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `gameId` | `string` | Yes | Game ID for real-time subscription |
| `initialCharacters` | `Character[]` | Yes | Initial character data |
| `className` | `string` | No | Additional CSS classes |

### Requirements Satisfied

- **8.1**: Display abilities for all characters in session
- **8.2**: Make ability summaries visible to all players
- **8.3**: Subscribe to real-time ability updates
- **8.4**: Format ability summaries for readability

## StatsDisplay

Displays stat bars for all characters in the game session.

### Usage

```tsx
import { StatsDisplay } from '@/components/gameplay';

function GameplayPage({ characters }) {
  return <StatsDisplay characters={characters} />;
}
```

## TurnIndicator

Shows whose turn it is in the game.

### Usage

```tsx
import { TurnIndicator } from '@/components/gameplay';

function GameplayPage({ currentPlayerId, players }) {
  return <TurnIndicator currentPlayerId={currentPlayerId} players={players} />;
}
```

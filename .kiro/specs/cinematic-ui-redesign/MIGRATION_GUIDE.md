# Cinematic UI Migration Guide

## Overview

This guide explains how to enable, configure, and use the new cinematic UI for the Fusion RPG web application. The cinematic UI transforms the game interface from a standard dashboard into a dark anime/Marvel combat console experience with dramatic visuals, animations, and immersive effects.

## Quick Start

### Enabling Cinematic UI

The cinematic UI is controlled by a feature flag. To enable it:

1. **Set the environment variable:**
   ```bash
   NEXT_PUBLIC_ENABLE_CINEMATIC_UI=true
   ```

2. **Add to your `.env.local` file:**
   ```env
   NEXT_PUBLIC_ENABLE_CINEMATIC_UI=true
   ```

3. **Restart your development server:**
   ```bash
   npm run dev
   ```

### Disabling Cinematic UI

To revert to the original UI:

1. **Set the environment variable to false:**
   ```bash
   NEXT_PUBLIC_ENABLE_CINEMATIC_UI=false
   ```

2. **Or remove the variable entirely from `.env.local`**

3. **Restart your development server**

The application will automatically fall back to the original UI when the feature flag is disabled or not set.

## Architecture

### Feature Flag Implementation

The cinematic UI is integrated into `EnhancedGameplayView` using a feature flag:

```typescript
// Feature flag check
const useCinematicUI = process.env.NEXT_PUBLIC_ENABLE_CINEMATIC_UI === 'true';

// Conditional rendering
if (useCinematicUI) {
  // Render cinematic UI components
  return <CinematicLayout />;
}

// Render original UI
return <OriginalLayout />;
```

This approach ensures:
- **Zero breaking changes** - Original UI remains fully functional
- **Easy rollback** - Toggle the flag to switch between UIs
- **Safe testing** - Test new UI without affecting production
- **Gradual migration** - Deploy to subset of users first

## New Components

### 1. AmbientBackground

**Purpose:** Provides subtle animated background effects with particles and nebula gradients.

**Props:**
```typescript
interface AmbientBackgroundProps {
  intensity?: 'low' | 'medium' | 'high'; // Default: 'low'
}
```

**Usage:**
```tsx
import { AmbientBackground } from '@/components/cinematic/AmbientBackground';

<AmbientBackground intensity="medium" />
```

**Features:**
- Animated particles with random motion
- Nebula gradient overlays
- Performance-optimized for mobile devices
- Respects `prefers-reduced-motion` setting
- Automatically reduces particle count on low-end devices

---

### 2. BattleFeed

**Purpose:** Displays narrative events and abilities with cinematic presentation.

**Props:**
```typescript
interface BattleFeedProps {
  events: GameEvent[];
  onEventRead?: (eventId: string) => void;
}

interface GameEvent {
  id: string;
  type: 'narrative' | 'action' | 'ability' | 'death';
  content: string;
  character?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  ability?: {
    name: string;
    description: string;
    icon?: string;
  };
  timestamp: Date;
}
```

**Usage:**
```tsx
import { BattleFeed } from '@/components/cinematic/BattleFeed';

<BattleFeed 
  events={gameEvents}
  onEventRead={(eventId) => console.log('Event read:', eventId)}
/>
```

**Features:**
- Full-width glass panel with glowing borders
- Large typography for ability names (text-3xl)
- Character-by-character reveal animation for abilities
- Distinct visual treatment for different event types
- Icon badges for abilities
- Auto-scroll to latest events
- Empty state placeholder

---

### 3. PowerCard

**Purpose:** Displays character information with dramatic cinematic visual treatment.

**Props:**
```typescript
interface PowerCardProps {
  character: Character;
  isActive: boolean;
  onDamage?: () => void;
}

interface Character {
  id: string;
  name: string;
  imageUrl?: string;
  hp: number;
  maxHp: number;
  level: number;
  status: StatusEffect[];
  fusionTags?: string[];
}

interface StatusEffect {
  id: string;
  name: string;
  icon?: string;
  type: 'buff' | 'debuff';
}
```

**Usage:**
```tsx
import { PowerCard } from '@/components/cinematic/PowerCard';

<PowerCard
  character={characterData}
  isActive={isPlayerTurn}
  onDamage={() => console.log('Character took damage!')}
/>
```

**Features:**
- Large character portrait with glowing borders
- Pulse animation and lift effect for active player
- Shake animation when HP decreases
- Stat badges for HP, Level, and Status effects
- Fusion tags display under character name
- Placeholder avatar for missing images
- Color-coded HP bar (red/orange/yellow gradient)
- Hover effects with scale transform

---

### 4. ChoiceTile & DecisionTerminal

**Purpose:** Displays action selection interface with choice tiles and optional custom input.

**ChoiceTile Props:**
```typescript
interface ChoiceTileProps {
  letter: 'A' | 'B' | 'C' | 'D';
  title: string;
  hint: string;
  icon: string;
  onSelect: () => void;
  disabled?: boolean;
  simplifyEffects?: boolean;
}
```

**DecisionTerminal Props:**
```typescript
interface DecisionTerminalProps {
  characterName: string;
  isPlayerTurn: boolean;
  aiMoves: MoveOptions;
  onMoveSelected: (move: string) => void;
  isLoading?: boolean;
}

interface MoveOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}
```

**Usage:**
```tsx
import { DecisionTerminal } from '@/components/cinematic/DecisionTerminal';

<DecisionTerminal
  characterName="Aria"
  isPlayerTurn={true}
  aiMoves={{
    A: "Attack - Strike with your sword",
    B: "Defend - Raise your shield",
    C: "Magic - Cast a spell",
    D: "Item - Use a potion"
  }}
  onMoveSelected={(move) => handleMove(move)}
  isLoading={false}
/>
```

**Features:**
- Header showing "⚡ YOUR TURN — [CHARACTER NAME]"
- 4 choice tiles in grid layout (2x2 desktop, 1 column mobile)
- Each tile shows letter badge, icon, title, and hint
- Hover glow effects
- Disabled state when not player's turn
- Custom action input field below tiles
- Keyboard shortcuts (A, B, C, D keys)
- Stagger animation for tile appearance
- Focus indicators for accessibility

---

### 5. PowerHUD

**Purpose:** Displays vital character stats in a bottom-screen heads-up display.

**Props:**
```typescript
interface PowerHUDProps {
  character: Character;
  visible: boolean;
}
```

**Usage:**
```tsx
import { PowerHUD } from '@/components/cinematic/PowerHUD';

<PowerHUD
  character={activeCharacter}
  visible={true}
/>
```

**Features:**
- Fixed bottom positioning
- Animated HP bar with gradient fill
- Spring animation for HP drain (0.8s duration)
- Level and HP stat displays
- Active buff and debuff icons with float animation
- Glass panel styling with backdrop blur
- Responsive layout (stacks vertically on mobile)
- Slide-in animation on mount

---

### 6. TurnIndicator (Enhanced)

**Purpose:** Shows turn order with dramatic visual emphasis.

**Props:**
```typescript
interface TurnIndicatorProps {
  currentPlayerId: string;
  players: Player[];
  className?: string;
}

interface Player {
  id: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  characterId: string | null;
}
```

**Usage:**
```tsx
import { TurnIndicator } from '@/components/gameplay/TurnIndicator';

<TurnIndicator
  currentPlayerId={currentUserId}
  players={gamePlayers}
/>
```

**Features:**
- Glass panel styling with neon glow
- Prominent active player display with avatar
- Full-screen flash effect on turn change
- Continuous glow pulse for active player
- Turn order list with numbered positions
- Player avatars or initials
- Ring and shadow highlighting for active player
- Smooth layout animations for reordering
- Responsive design

## Component Mapping

The cinematic UI replaces existing components with enhanced versions:

| Original Component | Cinematic Component | Location |
|-------------------|---------------------|----------|
| Story panel (div) | `BattleFeed` | `components/cinematic/BattleFeed.tsx` |
| `CharacterImageViewer` | `PowerCard` | `components/cinematic/PowerCard.tsx` |
| `MoveSelector` | `DecisionTerminal` | `components/cinematic/DecisionTerminal.tsx` |
| N/A (new) | `PowerHUD` | `components/cinematic/PowerHUD.tsx` |
| `TurnIndicator` | `TurnIndicator` (enhanced) | `components/gameplay/TurnIndicator.tsx` |
| N/A (new) | `AmbientBackground` | `components/cinematic/AmbientBackground.tsx` |

## Theme Configuration

### Colors

The cinematic UI uses a custom color palette defined in `lib/cinematic/themeConstants.ts`:

```typescript
const CINEMATIC_COLORS = {
  background: '#0B0B12',
  glass: 'rgba(17, 24, 39, 0.6)',
  accents: {
    cyan: '#06B6D4',      // Plasma blue
    purple: '#A855F7',    // Electric purple
    orange: '#F97316',    // Lava orange
    magenta: '#EC4899',   // Neon magenta
  },
};
```

### Tailwind Extensions

The theme extends Tailwind CSS with custom values:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'cinematic-bg': '#0B0B12',
        'plasma-blue': '#06B6D4',
        'electric-purple': '#A855F7',
        'lava-orange': '#F97316',
        'neon-magenta': '#EC4899',
      },
      backdropBlur: {
        'cinematic': '16px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.3)',
        'glow-md': '0 0 20px rgba(6, 182, 212, 0.4)',
        'glow-lg': '0 0 30px rgba(168, 85, 247, 0.6)',
      },
    },
  },
};
```

### Glass Panel Classes

Reusable glass panel styles are available:

```typescript
import { GLASS_PANEL_CLASSES } from '@/lib/cinematic/themeConstants';

// Base glass panel
<div className={GLASS_PANEL_CLASSES.base}>...</div>

// Glass panel with cyan glow
<div className={GLASS_PANEL_CLASSES.glowCyan}>...</div>

// Glass panel with purple glow
<div className={GLASS_PANEL_CLASSES.glowPurple}>...</div>
```

## Animation System

### Framer Motion

All animations use `framer-motion` for declarative, performant animations:

```bash
npm install framer-motion
```

### Animation Variants

Reusable animation variants are defined in `lib/cinematic/animationVariants.ts`:

```typescript
import { 
  fadeIn, 
  slideUp, 
  activePowerCard, 
  shake,
  glow,
  flash
} from '@/lib/cinematic/animationVariants';

<motion.div
  variants={fadeIn}
  initial="initial"
  animate="animate"
  exit="exit"
>
  Content
</motion.div>
```

### Performance Optimization

The cinematic UI includes several performance optimizations:

1. **GPU-accelerated animations** - Uses `transform` and `opacity` only
2. **Intersection Observer** - Pauses off-screen animations
3. **Mobile detection** - Reduces particle count and simplifies effects
4. **Reduced motion support** - Respects `prefers-reduced-motion` setting
5. **Conditional will-change** - Only applied when actively animating

## Accessibility

### Keyboard Navigation

- **Choice tiles:** Press A, B, C, or D keys to select
- **Focus indicators:** All interactive elements have visible focus rings
- **Tab navigation:** All components support keyboard navigation

### Screen Readers

- **ARIA labels:** All interactive elements have descriptive labels
- **ARIA live regions:** Turn changes announced to screen readers
- **Status roles:** Stat displays use proper ARIA roles

### Reduced Motion

Users who prefer reduced motion will see:
- Instant transitions instead of animations
- No particle effects
- No glow pulses
- Simplified visual effects

## Mobile Optimization

### Responsive Design

All components adapt to mobile viewports:

- **Grid layouts:** Switch from 2-column to 1-column
- **Typography:** Scales appropriately for smaller screens
- **Touch targets:** Minimum 44x44px for accessibility
- **Spacing:** Adjusts padding and margins

### Performance

Mobile-specific optimizations:

- **Reduced particle count:** 50% fewer particles on mobile
- **Simplified effects:** Reduced glow and shadow effects
- **Low-end device detection:** Further reduces effects on older devices
- **Optimized animations:** Fewer concurrent animations

## Error Handling

### Error Boundaries

All cinematic components are wrapped in error boundaries:

```tsx
<ErrorBoundary
  fallback={
    <div className="bg-gray-900/40 backdrop-blur-md border border-red-500/30 rounded-xl p-6">
      <p className="text-red-400 text-center">
        Unable to load component. Please refresh the page.
      </p>
    </div>
  }
>
  <CinematicComponent />
</ErrorBoundary>
```

### Graceful Degradation

Components handle missing data gracefully:

- **Missing images:** Display placeholder avatars with initials
- **Empty events:** Show "Awaiting battle events..." message
- **Missing character data:** Hide PowerHUD
- **Invalid HP values:** Clamp to 0-maxHp range

## Breaking Changes

**There are NO breaking changes.** The cinematic UI is:

- **Additive only** - New components alongside existing ones
- **Feature-flagged** - Original UI remains fully functional
- **API-compatible** - Same props and interfaces
- **Event-compatible** - Same event handlers and callbacks

## Migration Checklist

- [ ] Set `NEXT_PUBLIC_ENABLE_CINEMATIC_UI=true` in environment
- [ ] Restart development server
- [ ] Test all game flows (turn taking, combat, abilities)
- [ ] Verify mobile responsiveness
- [ ] Test with reduced motion preference enabled
- [ ] Test error scenarios (missing data, network errors)
- [ ] Verify keyboard navigation works
- [ ] Test with screen reader
- [ ] Monitor performance (60fps target)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Cinematic UI not appearing

1. Check environment variable is set correctly
2. Restart development server
3. Clear browser cache
4. Check browser console for errors

### Performance issues

1. Reduce `AmbientBackground` intensity to 'low'
2. Check device capabilities (mobile/low-end detection)
3. Verify `prefers-reduced-motion` is respected
4. Monitor frame rate in browser DevTools

### Animations not working

1. Verify `framer-motion` is installed
2. Check for JavaScript errors in console
3. Verify `prefers-reduced-motion` setting
4. Check browser compatibility

### Components not rendering

1. Check error boundaries for fallback UI
2. Verify data format matches interfaces
3. Check browser console for errors
4. Verify all required props are provided

## Support

For issues or questions:

1. Check this migration guide
2. Review component documentation in source files
3. Check the design document: `.kiro/specs/cinematic-ui-redesign/design.md`
4. Check the requirements: `.kiro/specs/cinematic-ui-redesign/requirements.md`

## Future Enhancements

Planned improvements for future releases:

- Visual regression testing
- Additional animation presets
- Customizable color themes
- User preference persistence
- Performance monitoring dashboard
- A/B testing framework

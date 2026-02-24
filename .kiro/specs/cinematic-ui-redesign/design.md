# Design Document: Cinematic UI Redesign

## Overview

This design transforms the Fusion RPG web application from a standard dashboard interface into a cinematic dark anime/Marvel combat console. The redesign focuses on visual presentation, animations, and user experience while maintaining all existing game logic and functionality. The implementation uses Next.js, Tailwind CSS, and framer-motion to create an immersive battle arena experience.

## Architecture

### Component Hierarchy

```
EnhancedGameplayView (Updated)
├── BattleFeed (New)
│   ├── StoryEvent
│   ├── AbilityHighlight
│   └── IconBadge
├── PowerCard (New)
│   ├── CharacterPortrait
│   ├── StatBadge
│   └── FusionTag
├── DecisionTerminal (New)
│   ├── ChoiceTile (x4)
│   └── CustomActionInput
├── PowerHUD (New)
│   ├── HPBar
│   ├── StatDisplay
│   └── BuffIcon
├── TurnIndicator (Enhanced)
└── AmbientBackground (New)
```

### Technology Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom theme extensions
- **Animations**: framer-motion for declarative animations
- **State Management**: React hooks (existing pattern)
- **Real-time**: Supabase subscriptions (existing)

### Design Principles

1. **Visual Hierarchy**: Use size, color, and motion to guide attention
2. **Cinematic Timing**: Animations should feel deliberate and impactful
3. **Performance First**: Optimize animations for 60fps on all devices
4. **Progressive Enhancement**: Core functionality works without animations
5. **Accessibility**: Maintain ARIA labels and keyboard navigation

## Components and Interfaces

### 1. BattleFeed Component

**Purpose**: Display narrative events and abilities with cinematic presentation.

**Interface**:
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

**Styling**:
- Background: `bg-gray-900/40 backdrop-blur-md`
- Border: `border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]`
- Padding: `p-8` for cinematic spacing
- Typography: Ability names use `text-3xl font-bold` with gradient text

**Animation**:
- New events fade in with slide-up motion
- Ability names reveal with stagger effect on characters
- Scroll behavior is smooth with momentum

### 2. PowerCard Component

**Purpose**: Display character information with dramatic visual treatment.

**Interface**:
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

**Styling**:
- Container: `relative overflow-hidden rounded-xl`
- Background: `bg-gray-900/60 backdrop-blur-lg`
- Border: Dynamic based on state
  - Active: `border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]`
  - Inactive: `border border-gray-700/50`
- Portrait: `aspect-[3/4] object-cover`

**Animation**:
- Active state: Continuous pulse using `animate-pulse` variant
- Active lift: `scale-105` transform
- Damage shake: Keyframe animation with `translateX` oscillation
- Hover: `scale-102` with glow intensity increase

### 3. DecisionTerminal Component

**Purpose**: Present action choices in a tactical terminal interface.

**Interface**:
```typescript
interface DecisionTerminalProps {
  characterName: string;
  isPlayerTurn: boolean;
  aiMoves: MoveOptions;
  onMoveSelected: (move: string) => void;
  isLoading: boolean;
}

interface MoveOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

interface ChoiceTileProps {
  letter: 'A' | 'B' | 'C' | 'D';
  title: string;
  hint: string;
  icon: string;
  onSelect: () => void;
  disabled: boolean;
}
```

**Styling**:
- Terminal header: `text-2xl font-bold text-cyan-400`
- Choice tile: `bg-gray-900/50 backdrop-blur-md border border-gray-700/50`
- Hover state: `border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]`
- Grid layout: `grid grid-cols-2 gap-4` on desktop, `grid-cols-1` on mobile

**Animation**:
- Tiles fade in with stagger (0.1s delay between each)
- Hover: Scale to `1.02` with glow transition
- Click: Brief scale to `0.98` for tactile feedback
- Disabled: Opacity `0.5` with grayscale filter

### 4. PowerHUD Component

**Purpose**: Display vital character stats in a bottom-screen HUD.

**Interface**:
```typescript
interface PowerHUDProps {
  character: Character;
  visible: boolean;
}

interface HPBarProps {
  current: number;
  max: number;
  animated: boolean;
}
```

**Styling**:
- Container: `fixed bottom-0 left-0 right-0 z-40`
- Background: `bg-gray-900/80 backdrop-blur-xl border-t border-cyan-500/30`
- HP bar container: `h-3 bg-gray-800 rounded-full overflow-hidden`
- HP bar fill: `h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500`

**Animation**:
- HP drain: Spring animation with `duration: 0.8s, ease: "easeOut"`
- Slide in: Translate from `translateY(100%)` to `translateY(0)`
- Buff icons: Gentle float animation with `translateY` oscillation

### 5. TurnIndicator (Enhanced)

**Purpose**: Show turn order with dramatic visual emphasis.

**Interface**:
```typescript
interface TurnIndicatorProps {
  currentPlayerId: string;
  players: Player[];
  onTurnChange?: () => void;
}

interface Player {
  id: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  characterId: string | null;
}
```

**Styling**:
- Container: `bg-gray-900/60 backdrop-blur-lg rounded-xl border border-purple-500/30`
- Active player: `ring-4 ring-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]`
- Player avatar: `w-16 h-16 rounded-full border-2`

**Animation**:
- Turn change: Full-screen flash overlay with `opacity: 0.3` fade
- Active indicator: Continuous glow pulse
- Player list: Smooth reordering with layout animations

### 6. AmbientBackground Component

**Purpose**: Provide subtle animated background effects.

**Interface**:
```typescript
interface AmbientBackgroundProps {
  intensity?: 'low' | 'medium' | 'high';
}
```

**Implementation**:
- Canvas-based particle system or CSS-based nebula effect
- Particles: Small dots with random motion and fade
- Colors: Mix of cyan, purple, and orange with low opacity
- Performance: RequestAnimationFrame with throttling

## Data Models

### Theme Configuration

```typescript
interface CinematicTheme {
  colors: {
    background: string; // #0B0B12
    glass: string; // rgba(17, 24, 39, 0.6)
    accents: {
      cyan: string; // Plasma blue
      purple: string; // Electric purple
      orange: string; // Lava orange
      magenta: string; // Neon magenta
    };
  };
  effects: {
    glow: {
      small: string;
      medium: string;
      large: string;
    };
    blur: {
      sm: string;
      md: string;
      lg: string;
    };
  };
  spacing: {
    cinematic: string; // Extra generous spacing
  };
}
```

### Animation Variants

```typescript
interface AnimationVariants {
  fadeIn: Variant;
  slideUp: Variant;
  pulse: Variant;
  shake: Variant;
  glow: Variant;
  flash: Variant;
}

// Example variant
const fadeIn: Variant = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4, ease: 'easeOut' },
};
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Visual Styling Properties

Property 1: Glass panel consistency
*For any* component using glass panel styling (BattleFeed, PowerCard, DecisionTerminal, PowerHUD, TurnIndicator), the component should have backdrop-blur and semi-transparent background classes
**Validates: Requirements 1.3, 3.5, 5.6, 6.2**

Property 2: Neon glow color palette
*For any* component applying neon glow effects, the glow colors should be from the defined palette (cyan, purple, orange, magenta)
**Validates: Requirements 1.4**

Property 3: Event rendering with full-width glass panel
*For any* narrative event displayed in BattleFeed, the event should be rendered in a container with full-width styling and glowing border classes
**Validates: Requirements 2.1**

Property 4: Ability name typography
*For any* ability event displayed in BattleFeed, the ability name should have large text size classes (text-3xl or larger)
**Validates: Requirements 2.2**

Property 5: Character portrait with glow
*For any* character displayed in PowerCard, the portrait should be rendered with large format and glowing border classes
**Validates: Requirements 3.1**

Property 6: Stat badge completeness
*For any* character displayed in PowerCard, the component should render badges for HP, Level, and all Status effects
**Validates: Requirements 3.3**

Property 7: Fusion tag display
*For any* character with fusionTags, the PowerCard should display all fusion tags under the character name
**Validates: Requirements 3.4**

Property 8: Choice tile information completeness
*For any* choice tile in DecisionTerminal, the tile should display an icon, title, and hint text
**Validates: Requirements 4.2**

Property 9: Decision terminal header format
*For any* DecisionTerminal with a character name, the header should contain the pattern "YOUR TURN" and the character name
**Validates: Requirements 4.5**

Property 10: Choice tile disabled state
*For any* DecisionTerminal where isPlayerTurn is false, all choice tiles should be disabled
**Validates: Requirements 4.6**

Property 11: Power HUD stat display
*For any* character displayed in PowerHUD, the component should render HP bar, Level, and all status effect icons
**Validates: Requirements 5.2, 5.3, 5.4**

Property 12: Active player highlighting
*For any* TurnIndicator with a currentPlayerId, the active player should have different styling (ring, shadow, or glow) than inactive players
**Validates: Requirements 6.3**

Property 13: Player avatar rendering
*For any* player in TurnIndicator, the component should render an avatar image or placeholder
**Validates: Requirements 6.4**

Property 14: Interactive hover states
*For any* interactive element (ChoiceTile, PowerCard when clickable), the element should have hover state classes defined
**Validates: Requirements 7.5**

Property 15: Responsive layout adaptation
*For any* component with grid or flex layout, the component should have responsive classes that adapt to mobile, tablet, and desktop viewports
**Validates: Requirements 8.1, 8.2**

Property 16: Responsive typography
*For any* text element, the element should use responsive text size classes or scale appropriately for mobile viewports
**Validates: Requirements 8.3**

Property 17: Touch target sizing
*For any* interactive element on mobile, the element should have minimum dimensions of 44x44 pixels for touch accessibility
**Validates: Requirements 8.4**

Property 18: API integration preservation
*For any* existing API call in the original components, the redesigned components should make the same API calls with the same parameters
**Validates: Requirements 9.2**

Property 19: Component prop compatibility
*For any* redesigned component, the component should accept the same props as the original component it replaces
**Validates: Requirements 9.3**

Property 20: Event handler preservation
*For any* event handler in the original components, the redesigned components should call the same handlers with the same arguments
**Validates: Requirements 9.5**

Property 21: Component migration completeness
*For all* new components (BattleFeed, PowerCard, DecisionTerminal, PowerHUD, enhanced TurnIndicator), each component should exist and render without errors
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Animation Properties

Property 22: New content animation
*For any* new event added to BattleFeed, the event should have framer-motion animation variants applied
**Validates: Requirements 2.3**

Property 23: Ability highlight distinction
*For any* ability-type event in BattleFeed, the event should have distinct visual styling compared to narrative events
**Validates: Requirements 2.4**

Property 24: Icon badge rendering
*For any* ability event with an icon property, the BattleFeed should display the icon badge
**Validates: Requirements 2.5**

Property 25: Active player animation
*For any* PowerCard where isActive is true, the component should apply pulse animation and scale transform
**Validates: Requirements 3.2, 7.3**

Property 26: Damage shake animation
*For any* PowerCard, when onDamage callback is triggered, the component should apply shake animation
**Validates: Requirements 3.6, 7.2**

Property 27: Turn change flash effect
*For any* TurnIndicator, when currentPlayerId changes, the component should trigger a flash effect overlay
**Validates: Requirements 6.1, 7.1**

Property 28: Framer-motion usage
*For any* animated component, the component should use framer-motion components (motion.div, motion.span, etc.) for animations
**Validates: Requirements 7.6**

## Error Handling

### Component Error Boundaries

All new components should be wrapped in error boundaries to prevent cascading failures:

```typescript
<ErrorBoundary fallback={<FallbackUI />}>
  <BattleFeed events={events} />
</ErrorBoundary>
```

### Missing Data Handling

**BattleFeed**:
- Empty events array: Display placeholder message
- Missing character data: Show event without character attribution
- Missing ability data: Display as regular narrative event

**PowerCard**:
- Missing imageUrl: Display placeholder avatar with character initials
- Missing status effects: Render empty status container
- Missing fusionTags: Hide fusion tag section

**DecisionTerminal**:
- Missing aiMoves: Display loading state or default options
- Network error: Show retry button with error message

**PowerHUD**:
- Missing character data: Hide HUD
- Invalid HP values: Clamp to 0-maxHp range

### Animation Fallbacks

- Reduced motion preference: Disable animations, use instant transitions
- Performance issues: Reduce particle count, simplify effects
- Browser compatibility: Graceful degradation to CSS transitions

## Testing Strategy

### Unit Testing

**Component Rendering**:
- Test each component renders without errors with valid props
- Test components handle missing optional props gracefully
- Test components display correct data from props

**Conditional Rendering**:
- Test PowerCard active/inactive states
- Test DecisionTerminal enabled/disabled states
- Test PowerHUD visibility based on character data

**Event Handlers**:
- Test ChoiceTile calls onSelect when clicked
- Test PowerCard calls onDamage when triggered
- Test DecisionTerminal calls onMoveSelected with correct move

**Edge Cases**:
- Empty events array in BattleFeed
- Character with no status effects in PowerCard
- Character with no fusionTags in PowerCard
- DecisionTerminal with isPlayerTurn false

### Property-Based Testing

Property-based tests should run with minimum 100 iterations to ensure comprehensive coverage across randomized inputs.

**Visual Consistency Tests**:
- Generate random component configurations
- Verify glass panel styling is consistent
- Verify glow colors are from defined palette

**Data Display Tests**:
- Generate random character data
- Verify all required stats are displayed
- Verify all status effects are rendered

**Responsive Behavior Tests**:
- Test components at various viewport widths
- Verify layout adapts correctly
- Verify touch targets meet minimum size

**Animation Tests**:
- Verify framer-motion variants are applied
- Verify animations trigger on state changes
- Verify reduced motion preference is respected

### Integration Testing

**Component Integration**:
- Test EnhancedGameplayView with all new components
- Verify data flows correctly from parent to children
- Verify event handlers propagate correctly

**Real-time Updates**:
- Test components update when game state changes
- Test turn transitions trigger correct animations
- Test damage events trigger correct visual feedback

**API Integration**:
- Test DecisionTerminal integrates with move submission API
- Test components handle API errors gracefully
- Test loading states display correctly

### Visual Regression Testing

- Capture screenshots of components in various states
- Compare against baseline images
- Flag unexpected visual changes

### Accessibility Testing

- Test keyboard navigation works for all interactive elements
- Test screen readers can access all content
- Test reduced motion preference is respected
- Test color contrast meets WCAG AA standards

### Performance Testing

- Measure component render times
- Monitor animation frame rates (target 60fps)
- Test with large numbers of events in BattleFeed
- Profile memory usage with animations running

## Implementation Notes

### Tailwind Configuration

Extend Tailwind config with custom theme values:

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

### Animation Performance

- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating `width`, `height`, `top`, `left` (causes reflow)
- Use `will-change` sparingly and remove after animation
- Implement `IntersectionObserver` to pause off-screen animations

### Mobile Optimization

- Reduce particle count on mobile devices
- Simplify glow effects on low-end devices
- Use `matchMedia` to detect mobile viewport
- Implement touch-specific interactions (swipe, long-press)

### Migration Strategy

1. **Phase 1**: Create new components alongside existing ones
2. **Phase 2**: Add feature flag to toggle between old and new UI
3. **Phase 3**: Test new UI with subset of users
4. **Phase 4**: Migrate all users to new UI
5. **Phase 5**: Remove old components and feature flag

### Browser Compatibility

- Target: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Fallbacks for older browsers: CSS transitions instead of framer-motion
- Polyfills: backdrop-filter for Safari < 14
- Testing: BrowserStack for cross-browser validation

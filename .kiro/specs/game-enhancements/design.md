# Design Document: Game Enhancements

## Overview

This design specifies the technical implementation for comprehensive enhancements to an existing Next.js multiplayer game. The enhancements span authentication UI, character creation workflows, real-time synchronization, gameplay interfaces, and AI-powered content generation. The system leverages existing infrastructure including Supabase for real-time data, NextAuth for authentication, and integrates new services for Azure TTS and dynamic image generation.

The design follows a component-based architecture with clear separation between UI components, business logic, and external service integrations. Real-time updates are achieved through Supabase's real-time subscriptions, ensuring all players see synchronized game state without manual refreshes.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
├─────────────────────────────────────────────────────────────┤
│  Authentication UI  │  Character Creator  │  Gameplay UI    │
│  - Login/Logout     │  - Auto-generation  │  - Stats Display│
│  - Session Mgmt     │  - Summary View     │  - Turn Indicator│
│                     │  - Ready State      │  - Move Options │
│                     │                     │  - Image Viewer │
└──────────┬──────────┴──────────┬──────────┴────────┬────────┘
           │                     │                    │
           ▼                     ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   NextAuth       │  │   Supabase       │  │  External APIs   │
│   - Auth Flow    │  │   - Real-time    │  │  - Azure TTS     │
│   - Session      │  │   - Database     │  │  - Image Gen     │
│                  │  │   - Subscriptions│  │  - AI Moves      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Data Flow

1. **Authentication Flow**: User → Auth UI → NextAuth → Session State → UI Update
2. **Character Creation Flow**: Description → AI Service → Abilities/Weaknesses → Summary → Ready State
3. **Real-time Updates Flow**: Action → Supabase → Broadcast → All Clients → UI Update
4. **Gameplay Flow**: Turn Start → AI Moves → User Selection → Game State Update → Next Turn

### Technology Stack

- **Frontend**: Next.js 14+, React, TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Authentication**: NextAuth.js
- **Real-time**: Supabase Realtime subscriptions
- **External Services**: Azure Text-to-Speech API, AI image generation API
- **State Management**: React Context + Supabase real-time sync

## Components and Interfaces

### Authentication Components

**AuthButtons Component**
```typescript
interface AuthButtonsProps {
  session: Session | null;
}

// Renders login button when session is null
// Renders logout button when session exists
// Handles authentication state transitions
```

**Implementation Notes**:
- Use NextAuth's `signIn()` and `signOut()` methods
- Display buttons conditionally based on session state
- Update UI immediately on authentication state change

### Character Creator Components

**CharacterCreationForm Component**
```typescript
interface CharacterCreationFormProps {
  onCharacterCreated: (character: Character) => void;
}

interface Character {
  id: string;
  userId: string;
  description: string; // max 1000 chars
  abilities: string[];
  weaknesses: string[];
  stats: CharacterStats;
  imageUrl: string;
  isReady: boolean;
}

// Provides description input with character counter
// Calls AI service to derive abilities and weaknesses
// Displays generated attributes (read-only)
```

**CharacterSummary Component**
```typescript
interface CharacterSummaryProps {
  character: Character;
  onEdit: () => void;
  onReady: () => void;
  isEditable: boolean;
}

// Displays complete character information
// Provides edit button (disabled when ready)
// Provides ready button
// Shows ready state indicator
```

**Character Attribute Generator Service**
```typescript
interface AttributeGeneratorService {
  generateAttributes(description: string): Promise<{
    abilities: string[];
    weaknesses: string[];
  }>;
  
  generateFusionAttributes(
    char1: Character,
    char2: Character
  ): Promise<{
    abilities: string[];
    weaknesses: string[];
  }>;
}

// Calls AI API with character description
// Parses response into structured abilities and weaknesses
// Handles fusion logic for combined characters
```

### Real-time Engine

**RealtimeSubscriptionManager**
```typescript
interface RealtimeSubscriptionManager {
  subscribeToSession(sessionId: string, callbacks: SessionCallbacks): Subscription;
  broadcastAction(sessionId: string, action: GameAction): Promise<void>;
  broadcastTypingStatus(sessionId: string, userId: string, isTyping: boolean): Promise<void>;
}

interface SessionCallbacks {
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onGameStateUpdate: (state: GameState) => void;
  onPlayerTyping: (playerId: string, isTyping: boolean) => void;
}

// Uses Supabase Realtime channels
// Subscribes to session-specific events
// Broadcasts changes to all connected clients
```

**Implementation Notes**:
- Create Supabase channel per game session
- Use presence tracking for player join/leave
- Broadcast game state changes through channel
- Implement typing debounce (2 second timeout)

### Gameplay Interface Components

**StatsDisplay Component**
```typescript
interface StatsDisplayProps {
  characters: Character[];
}

interface CharacterStats {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  // Additional stats as needed
}

// Renders stat bars for all characters
// Updates bars on real-time stat changes
// Color-codes bars based on stat levels
```

**AbilitySummary Component**
```typescript
interface AbilitySummaryProps {
  characters: Character[];
}

// Displays abilities for all characters
// Groups by character
// Updates when abilities change
```

**TurnIndicator Component**
```typescript
interface TurnIndicatorProps {
  currentPlayerId: string;
  players: Player[];
}

// Highlights active player
// Shows turn order
// Updates immediately on turn change
```

**MoveSelector Component**
```typescript
interface MoveSelectorProps {
  aiMoves: string[]; // A, B, C, D options
  onMoveSelected: (move: string) => void;
  isPlayerTurn: boolean;
}

// Displays 4 AI-generated move options
// Provides custom move input field
// Submits selected or custom move
```

**CharacterImageViewer Component**
```typescript
interface CharacterImageViewerProps {
  imageUrl: string;
  characterName: string;
  size: 'thumbnail' | 'large' | 'fullscreen';
  onClick?: () => void;
}

// Renders image at specified size
// Opens modal on click for fullscreen view
// Maintains aspect ratio
```

**TypingIndicator Component**
```typescript
interface TypingIndicatorProps {
  typingPlayers: string[]; // player names
}

// Shows "Player X is typing..." message
// Animates indicator
// Hides when no one is typing
```

### AI Content Generation Services

**MoveGeneratorService**
```typescript
interface MoveGeneratorService {
  generateMoves(
    character: Character,
    gameContext: GameContext
  ): Promise<string[]>; // Returns 4 move options
}

interface GameContext {
  currentSituation: string;
  recentActions: string[];
  otherCharacters: Character[];
}

// Calls AI API with game context
// Generates 4 contextually appropriate moves
// Returns within 3 second timeout
```

**ImageGenerationService**
```typescript
interface ImageGenerationService {
  generateCharacterImage(description: string): Promise<string>; // Returns image URL
  detectAppearanceChange(narrative: string): boolean;
  regenerateImage(character: Character, changeDescription: string): Promise<string>;
}

// Calls image generation API
// Stores images in Supabase Storage
// Returns public URL
// Detects appearance keywords in narrative
```

### Text-to-Speech Service

**TTSService**
```typescript
interface TTSService {
  initialize(apiKey: string, region: string): void;
  speak(text: string, options: TTSOptions): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  isPlaying(): boolean;
}

interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
}

// Integrates Azure Speech SDK
// Manages audio playback state
// Provides playback controls
```

## Data Models

### Database Schema Extensions

**characters table**
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES game_sessions(id),
  description TEXT CHECK (char_length(description) <= 1000),
  abilities JSONB, -- Array of ability strings
  weaknesses JSONB, -- Array of weakness strings
  stats JSONB, -- Character statistics object
  image_url TEXT,
  is_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_characters_session ON characters(session_id);
CREATE INDEX idx_characters_user ON characters(user_id);
```

**game_sessions table (existing, with additions)**
```sql
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS current_turn_player_id UUID REFERENCES auth.users(id);
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS turn_order JSONB; -- Array of player IDs
```

**typing_status table (for real-time typing indicators)**
```sql
CREATE TABLE typing_status (
  session_id UUID REFERENCES game_sessions(id),
  user_id UUID REFERENCES auth.users(id),
  is_typing BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, user_id)
);
```

### Real-time Subscriptions

**Session Channel Structure**
```typescript
// Channel name: `session:${sessionId}`
// Events:
// - player_joined: { playerId, playerName }
// - player_left: { playerId }
// - game_state_updated: { state: GameState }
// - typing_status: { userId, isTyping }
// - turn_changed: { currentPlayerId }
// - character_updated: { characterId, updates }
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Character Attribute Auto-Generation
*For any* valid character description, the Character_Creator should automatically generate both abilities and weaknesses without requiring manual input.
**Validates: Requirements 2.1, 2.2**

### Property 2: Fusion Attribute Derivation
*For any* two characters undergoing fusion, the Character_Creator should derive new abilities and weaknesses based on the fusion mechanics.
**Validates: Requirements 2.3**

### Property 3: Character Summary Completeness
*For any* created character, the displayed summary should contain all required fields: description, abilities, weaknesses, and statistics.
**Validates: Requirements 3.1**

### Property 4: Edit Persistence Round-Trip
*For any* character attribute edit, persisting the change and then retrieving the character should return the updated value.
**Validates: Requirements 3.4**

### Property 5: Ready State Disables Editing
*For any* player marked as ready, all character editing controls should be disabled.
**Validates: Requirements 4.4**

### Property 6: Image Click Opens Modal
*For any* character image in the gameplay interface, clicking it should display the full-size image in a modal.
**Validates: Requirements 5.2**

### Property 7: Image Aspect Ratio Preservation
*For any* character image, scaling to different sizes should preserve the original aspect ratio.
**Validates: Requirements 5.4**

### Property 8: Real-Time Update Propagation
*For any* player action, all connected clients should receive and apply the update without requiring page refresh.
**Validates: Requirements 6.1, 6.2**

### Property 9: Session Event Broadcasting
*For any* player join or leave event, all other players in the session should be notified immediately.
**Validates: Requirements 6.3**

### Property 10: Stats Display Completeness
*For any* set of characters in a session, the Stats_Display should render labeled stat bars for all characters visible to all players.
**Validates: Requirements 7.1, 7.3, 7.4**

### Property 11: Stats Update Reactivity
*For any* character statistic change, the Stats_Display should update the visual representation in real-time.
**Validates: Requirements 7.2**

### Property 12: Ability Summary Visibility
*For any* set of characters in a session, ability summaries should be displayed and visible to all players.
**Validates: Requirements 8.1, 8.2**

### Property 13: Ability Update Reactivity
*For any* ability change during gameplay, the ability summaries should update immediately.
**Validates: Requirements 8.3**

### Property 14: AI Move Generation Count
*For any* player turn, the AI_Content_Generator should generate exactly four distinct move options labeled A, B, C, and D.
**Validates: Requirements 9.1**

### Property 15: Move Options Display
*For any* set of AI-generated moves, all four options should be displayed to the active player.
**Validates: Requirements 9.2**

### Property 16: Move Selection Processing
*For any* move selection (AI-generated or custom), the Game_System should process it as the player's action.
**Validates: Requirements 9.4**

### Property 17: Turn State Maintenance
*For any* game session, the Turn_Manager should always maintain a defined current active player state.
**Validates: Requirements 10.1**

### Property 18: Turn Indicator Display
*For any* turn state, the Gameplay_Interface should display a visual indicator showing whose turn it is.
**Validates: Requirements 10.2**

### Property 19: Turn Change Reactivity
*For any* turn change, the turn indicator should update immediately to reflect the new active player.
**Validates: Requirements 10.3**

### Property 20: Active Player Visual Distinction
*For any* player in a session, the active player should be visually distinguished from other players.
**Validates: Requirements 10.4**

### Property 21: Typing Event Broadcasting
*For any* player who begins typing, a typing indicator should be broadcast to all other players in the session.
**Validates: Requirements 11.1**

### Property 22: Typing Indicator Display
*For any* player currently typing, a typing indicator should be displayed next to their name or character.
**Validates: Requirements 11.3**

### Property 23: Submit Clears Typing Indicator
*For any* player who submits input, their typing indicator should be immediately removed.
**Validates: Requirements 11.4**

### Property 24: Description Length Enforcement
*For any* character description input exceeding 1000 characters, the Character_Creator should either reject or truncate it to 1000 characters.
**Validates: Requirements 12.1, 12.4**

### Property 25: Character Counter Display
*For any* description input state, the Character_Creator should display the current character count and remaining characters.
**Validates: Requirements 12.2**

### Property 26: TTS Content Triggering
*For any* new story content when TTS is enabled, the TTS_Service should read the content aloud.
**Validates: Requirements 13.3**

### Property 27: TTS Disable Stops Playback
*For any* active TTS playback, disabling text-to-speech should immediately stop the playback.
**Validates: Requirements 13.5**

### Property 28: Appearance Change Detection
*For any* narrative text containing appearance change keywords, the Image_Service should detect the change.
**Validates: Requirements 14.1**

### Property 29: Image Update Propagation
*For any* detected appearance change, the Image_Service should generate a new image, replace the old one, and broadcast the update to all players.
**Validates: Requirements 14.2, 14.3, 14.4**

## Error Handling

### Authentication Errors
- **Network Failures**: Display user-friendly error message, allow retry
- **Invalid Credentials**: Show clear error message from NextAuth
- **Session Expiry**: Automatically redirect to login, preserve intended destination

### Character Creation Errors
- **AI Service Timeout**: Show loading state, retry up to 3 times, fallback to manual input if all retries fail
- **Invalid Description**: Validate length client-side, show error message before submission
- **Image Generation Failure**: Use default placeholder image, log error, allow manual retry

### Real-time Connection Errors
- **Connection Lost**: Display reconnection indicator, attempt automatic reconnection
- **Subscription Failure**: Log error, attempt resubscription, notify user if persistent
- **Message Delivery Failure**: Queue messages locally, retry on reconnection

### Gameplay Errors
- **Invalid Move**: Validate move format, show error message, allow correction
- **Out of Turn Action**: Prevent action client-side, show "not your turn" message
- **State Desynchronization**: Implement periodic state reconciliation, force refresh if critical

### External Service Errors
- **Azure TTS Failure**: Disable TTS gracefully, show notification, allow re-enable
- **Image API Failure**: Use cached/previous image, log error, retry on next change
- **AI Move Generation Failure**: Provide generic fallback moves, allow custom input

## Testing Strategy

### Dual Testing Approach

This feature requires both unit testing and property-based testing for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property Tests**: Verify universal properties across all inputs through randomization

Together, these approaches ensure both concrete bug detection and general correctness verification.

### Property-Based Testing Configuration

**Library Selection**: 
- TypeScript/JavaScript: Use `fast-check` library
- Property tests should run minimum 100 iterations per test
- Each property test must reference its design document property

**Test Tagging Format**:
```typescript
// Feature: game-enhancements, Property 1: Character Attribute Auto-Generation
test('character description generates abilities and weaknesses', () => {
  fc.assert(
    fc.property(fc.string({ minLength: 10, maxLength: 1000 }), async (description) => {
      const result = await generateAttributes(description);
      expect(result.abilities).toBeDefined();
      expect(result.abilities.length).toBeGreaterThan(0);
      expect(result.weaknesses).toBeDefined();
      expect(result.weaknesses.length).toBeGreaterThan(0);
    }),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus Areas

**Authentication Components**:
- Login button renders when not authenticated
- Logout button renders when authenticated
- Button clicks trigger correct authentication methods
- Session state updates reflect in UI

**Character Creator**:
- Description input enforces 1000 character limit
- Character counter displays correctly
- Ready button disables editing
- Summary displays all character fields
- Edit functionality updates character data

**Real-time Features**:
- Subscription setup and teardown
- Event broadcasting to all clients
- Typing indicator debounce behavior (2 second timeout)
- Connection error handling and reconnection

**Gameplay Interface**:
- Turn indicator highlights correct player
- Stats bars render for all characters
- Ability summaries display correctly
- Move options display all 4 AI suggestions
- Custom move input accepts user text
- Image modal opens and closes correctly

**External Services**:
- TTS service initialization
- TTS playback controls (pause, resume, stop)
- Image generation API calls
- AI move generation API calls
- Error handling for service failures

### Integration Testing

**End-to-End Flows**:
- Complete character creation flow
- Ready state transition to gameplay
- Turn-based gameplay with move selection
- Real-time updates across multiple clients
- Image regeneration on appearance change
- TTS playback during story progression

### Performance Considerations

While not covered by automated tests, monitor:
- Real-time update latency (target: <500ms)
- AI move generation time (target: <3s)
- Image generation time (target: <10s)
- TTS initialization and playback responsiveness

### Test Data Generation

**Property Test Generators**:
- Character descriptions (10-1000 chars, various content)
- Character stats (valid ranges for health, energy, etc.)
- Game sessions (1-8 players, various states)
- Move text (valid and invalid formats)
- Narrative text (with and without appearance keywords)

**Edge Cases to Cover**:
- Empty or whitespace-only inputs
- Maximum length inputs (1000 chars)
- Special characters and Unicode in descriptions
- Concurrent actions from multiple players
- Network disconnection and reconnection
- Service timeouts and failures

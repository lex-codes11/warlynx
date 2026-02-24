# Design Document: Warlynx Multiplayer AI Game

## Overview

Warlynx is a production-ready multiplayer web application built with Next.js 14+ (App Router), TypeScript, and real-time communication. The architecture follows a client-server model with server-side AI integration, PostgreSQL database with Prisma ORM, and real-time state synchronization using Socket.io or Supabase Realtime.

The system enforces strict turn-based gameplay where an AI Dungeon Master (powered by OpenAI GPT-4) orchestrates narrative generation, validates player actions against character Power Sheets, and maintains game state consistency across all connected clients.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Next.js)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Auth UI    │  │  Game Lobby  │  │  Game Room   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Routes    │
                    │  (Next.js App)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│   NextAuth     │  │  Socket.io/     │  │   OpenAI API   │
│   (Auth)       │  │  Supabase RT    │  │  (GPT-4 + DALL-E)│
└───────┬────────┘  └────────┬────────┘  └───────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Prisma ORM     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │  S3/Supabase    │
                    │    Storage      │
                    └─────────────────┘
```

### Technology Stack Rationale

- **Next.js 14+ App Router**: Server components, streaming, and built-in API routes
- **TypeScript**: Type safety across client and server
- **NextAuth**: Flexible authentication with multiple providers
- **Prisma**: Type-safe database access with migrations
- **Socket.io or Supabase Realtime**: Real-time bidirectional communication
- **OpenAI GPT-4**: Advanced narrative generation and reasoning
- **OpenAI DALL-E 3**: High-quality character image generation
- **Tailwind CSS + shadcn/ui**: Rapid UI development with accessible components
- **PostgreSQL**: Robust relational database with JSON support

### Deployment Architecture

- **Hosting**: Vercel (Next.js optimized) or self-hosted
- **Database**: Managed PostgreSQL (Supabase, Railway, or Neon)
- **Storage**: S3-compatible storage for character images
- **Real-time**: Socket.io server (separate process) or Supabase Realtime (managed)

## Components and Interfaces

### 1. Authentication System

**Component**: `AuthProvider` (NextAuth configuration)

**Responsibilities**:
- Handle email/password authentication
- Handle OAuth providers (Google, Discord, GitHub)
- Manage session tokens and cookies
- Provide user context to application

**Key Files**:
- `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `lib/auth.ts` - Auth utilities and session helpers
- `components/auth/SignInForm.tsx` - Sign-in UI
- `components/auth/SignUpForm.tsx` - Sign-up UI

**Interface**:
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  createdAt: Date;
}

interface Session {
  user: User;
  expires: string;
}
```

### 2. Game Management System

**Component**: `GameManager`

**Responsibilities**:
- Create new game sessions
- Generate invite codes
- Manage game lifecycle (lobby → active → completed)
- Enforce player limits
- Lock roster when game starts

**Key Files**:
- `app/api/games/create/route.ts` - Create game endpoint
- `app/api/games/[gameId]/join/route.ts` - Join game endpoint
- `app/api/games/[gameId]/start/route.ts` - Start game endpoint
- `lib/game-manager.ts` - Game logic utilities

**Interface**:
```typescript
interface Game {
  id: string;
  name: string;
  hostId: string;
  inviteCode: string;
  maxPlayers: number;
  difficultyCurve: 'easy' | 'medium' | 'hard' | 'brutal';
  toneTags: string[];
  houseRules: string | null;
  status: 'lobby' | 'active' | 'completed';
  turnOrder: string[]; // Array of player IDs
  currentTurnIndex: number;
  createdAt: Date;
  startedAt: Date | null;
}

interface GamePlayer {
  id: string;
  gameId: string;
  userId: string;
  role: 'host' | 'player';
  joinedAt: Date;
  characterId: string | null;
}
```

### 3. Character Creation System

**Component**: `CharacterBuilder`

**Responsibilities**:
- Collect character information from player
- Generate Power Sheet via AI
- Generate character image via DALL-E
- Handle image regeneration with rate limiting
- Validate character data

**Key Files**:
- `app/api/characters/create/route.ts` - Create character endpoint
- `app/api/characters/[characterId]/regenerate-image/route.ts` - Regenerate image
- `lib/ai/power-sheet-generator.ts` - AI Power Sheet generation
- `lib/ai/image-generator.ts` - AI image generation
- `components/character/CharacterBuilder.tsx` - Character creation UI

**Interface**:
```typescript
interface Character {
  id: string;
  gameId: string;
  userId: string;
  name: string;
  fusionIngredients: string;
  description: string;
  abilities: string[];
  weakness: string;
  alignment: string | null;
  archetype: string | null;
  tags: string[];
  powerSheet: PowerSheet;
  imageUrl: string;
  imagePrompt: string;
  createdAt: Date;
}

interface PowerSheet {
  level: number;
  hp: number;
  maxHp: number;
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
  abilities: Ability[];
  weakness: string;
  statuses: Status[];
  perks: Perk[];
}

interface Ability {
  name: string;
  description: string;
  powerLevel: number; // 1-10 scale
  cooldown: number | null;
}

interface Status {
  name: string;
  description: string;
  duration: number; // turns remaining
  effect: string;
}

interface Perk {
  name: string;
  description: string;
  unlockedAt: number; // level
}
```

### 4. AI Dungeon Master System

**Component**: `AIDungeonMaster`

**Responsibilities**:
- Generate narrative based on game state
- Present exactly 4 choices (A-D) each turn
- Validate player actions against Power Sheets
- Resolve actions and update character stats
- Enforce game rules and prevent invalid actions
- Generate level-up rewards and perks

**Key Files**:
- `app/api/game/[gameId]/turn/route.ts` - Process turn endpoint
- `lib/ai/dungeon-master.ts` - Core DM logic
- `lib/ai/action-validator.ts` - Action validation
- `lib/ai/stat-updater.ts` - Stat calculation logic

**Interface**:
```typescript
interface TurnRequest {
  gameId: string;
  playerId: string;
  action: 'A' | 'B' | 'C' | 'D' | string; // Choice or custom action
}

interface TurnResponse {
  success: boolean;
  narrative: string;
  choices: Choice[];
  statUpdates: StatUpdate[];
  events: GameEvent[];
  validationError: string | null;
}

interface Choice {
  label: 'A' | 'B' | 'C' | 'D';
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

interface StatUpdate {
  characterId: string;
  changes: {
    hp?: number;
    level?: number;
    attributes?: Partial<PowerSheet['attributes']>;
    statuses?: Status[];
    newPerks?: Perk[];
  };
}

interface GameEvent {
  type: 'narrative' | 'action' | 'stat_change' | 'death' | 'level_up';
  characterId: string | null;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

**AI Prompt Structure**:
```typescript
interface DMPromptContext {
  gameSettings: {
    toneTags: string[];
    difficultyCurve: string;
    houseRules: string | null;
  };
  turnOrder: string[];
  activePlayer: {
    id: string;
    character: Character;
    powerSheet: PowerSheet;
  };
  allCharacters: Character[];
  recentEvents: GameEvent[]; // Last 10-20 events
  currentTurn: number;
}
```

### 5. Real-Time Communication System

**Component**: `RealtimeManager`

**Responsibilities**:
- Broadcast game state changes to all players
- Handle player connections and disconnections
- Synchronize turn updates
- Update lobby roster in real-time
- Manage room subscriptions

**Key Files**:
- `lib/socket/server.ts` - Socket.io server setup (if using Socket.io)
- `lib/socket/client.ts` - Socket.io client hooks
- `lib/realtime/supabase.ts` - Supabase Realtime setup (if using Supabase)
- `hooks/useGameState.ts` - React hook for game state subscription

**Interface**:
```typescript
// Socket.io Events
interface ServerToClientEvents {
  'game:updated': (game: Game) => void;
  'player:joined': (player: GamePlayer) => void;
  'player:left': (playerId: string) => void;
  'turn:started': (turn: Turn) => void;
  'turn:resolved': (response: TurnResponse) => void;
  'character:updated': (character: Character) => void;
  'stats:updated': (update: StatUpdate) => void;
}

interface ClientToServerEvents {
  'game:join': (gameId: string) => void;
  'game:leave': (gameId: string) => void;
  'turn:submit': (request: TurnRequest) => void;
}
```

### 6. Turn Management System

**Component**: `TurnManager`

**Responsibilities**:
- Track current turn and active player
- Enforce turn order
- Prevent out-of-turn actions
- Handle turn transitions
- Skip dead players in turn order

**Key Files**:
- `lib/turn-manager.ts` - Turn logic
- `app/api/game/[gameId]/current-turn/route.ts` - Get current turn

**Interface**:
```typescript
interface Turn {
  id: string;
  gameId: string;
  turnIndex: number;
  activePlayerId: string;
  phase: 'waiting' | 'choosing' | 'resolving' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
}
```

### 7. Stats Tracking System

**Component**: `StatsTracker`

**Responsibilities**:
- Record stat snapshots after events
- Calculate stat changes
- Track character progression history
- Provide stat comparison utilities

**Key Files**:
- `lib/stats-tracker.ts` - Stats tracking logic
- `app/api/characters/[characterId]/stats/route.ts` - Get stats history

**Interface**:
```typescript
interface StatsSnapshot {
  id: string;
  gameId: string;
  characterId: string;
  turnId: string;
  level: number;
  hp: number;
  maxHp: number;
  attributes: PowerSheet['attributes'];
  statuses: Status[];
  perks: Perk[];
  createdAt: Date;
}
```

## Data Models

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(cuid())
  email       String   @unique
  displayName String
  avatar      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  hostedGames  Game[]       @relation("HostedGames")
  gamePlayers  GamePlayer[]
  characters   Character[]
  accounts     Account[]
  sessions     Session[]

  @@index([email])
}

// NextAuth models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Game {
  id              String   @id @default(cuid())
  name            String
  hostId          String
  inviteCode      String   @unique
  maxPlayers      Int
  difficultyCurve String   // 'easy' | 'medium' | 'hard' | 'brutal'
  toneTags        String[] // Array of tags
  houseRules      String?  @db.Text
  status          String   @default("lobby") // 'lobby' | 'active' | 'completed'
  turnOrder       String[] // Array of player IDs
  currentTurnIndex Int     @default(0)
  createdAt       DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?

  // Relations
  host            User              @relation("HostedGames", fields: [hostId], references: [id])
  players         GamePlayer[]
  characters      Character[]
  turns           Turn[]
  events          GameEvent[]
  statsSnapshots  StatsSnapshot[]

  @@index([inviteCode])
  @@index([hostId])
  @@index([status])
}

model GamePlayer {
  id          String   @id @default(cuid())
  gameId      String
  userId      String
  role        String   // 'host' | 'player'
  joinedAt    DateTime @default(now())
  characterId String?  @unique

  // Relations
  game      Game       @relation(fields: [gameId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  character Character? @relation(fields: [characterId], references: [id])

  @@unique([gameId, userId])
  @@index([gameId])
  @@index([userId])
}

model Character {
  id                String   @id @default(cuid())
  gameId            String
  userId            String
  name              String
  fusionIngredients String
  description       String   @db.Text
  abilities         String[] // Array of ability names
  weakness          String
  alignment         String?
  archetype         String?
  tags              String[]
  powerSheet        Json     // PowerSheet object
  imageUrl          String
  imagePrompt       String   @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relations
  game           Game            @relation(fields: [gameId], references: [id], onDelete: Cascade)
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  gamePlayer     GamePlayer?
  statsSnapshots StatsSnapshot[]
  events         GameEvent[]

  @@unique([gameId, userId])
  @@index([gameId])
  @@index([userId])
}

model Turn {
  id              String    @id @default(cuid())
  gameId          String
  turnIndex       Int
  activePlayerId  String
  phase           String    @default("waiting") // 'waiting' | 'choosing' | 'resolving' | 'completed'
  startedAt       DateTime  @default(now())
  completedAt     DateTime?

  // Relations
  game   Game        @relation(fields: [gameId], references: [id], onDelete: Cascade)
  events GameEvent[]

  @@unique([gameId, turnIndex])
  @@index([gameId])
  @@index([activePlayerId])
}

model GameEvent {
  id          String   @id @default(cuid())
  gameId      String
  turnId      String?
  characterId String?
  type        String   // 'narrative' | 'action' | 'stat_change' | 'death' | 'level_up'
  content     String   @db.Text
  metadata    Json     // Additional structured data
  createdAt   DateTime @default(now())

  // Relations
  game      Game       @relation(fields: [gameId], references: [id], onDelete: Cascade)
  turn      Turn?      @relation(fields: [turnId], references: [id])
  character Character? @relation(fields: [characterId], references: [id])

  @@index([gameId])
  @@index([turnId])
  @@index([characterId])
  @@index([createdAt])
}

model StatsSnapshot {
  id          String   @id @default(cuid())
  gameId      String
  characterId String
  turnId      String
  level       Int
  hp          Int
  maxHp       Int
  attributes  Json     // Attributes object
  statuses    Json     // Array of Status objects
  perks       Json     // Array of Perk objects
  createdAt   DateTime @default(now())

  // Relations
  game      Game      @relation(fields: [gameId], references: [id], onDelete: Cascade)
  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@index([gameId])
  @@index([characterId])
  @@index([createdAt])
}

model ImageGenerationLog {
  id          String   @id @default(cuid())
  userId      String
  characterId String?
  prompt      String   @db.Text
  imageUrl    String
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several redundancies were identified:

- Properties 6.2 and 7.4 both test "exactly 4 choices" - consolidated into one property
- Properties 6.4 and 13.2 both test "only active player can act" - consolidated into one property
- Multiple properties test data persistence (15.1-15.6) - consolidated into comprehensive persistence properties
- Multiple properties test real-time updates (11.1-11.4) - consolidated into broadcast properties
- UI layout properties (14.1, 14.2) are examples, not universal properties - kept as examples only

### Core Properties

**Property 1: Authentication creates complete user profiles**
*For any* successful authentication (email or OAuth), the returned user profile must contain id, displayName, and avatar fields.
**Validates: Requirements 1.3**

**Property 2: Session persistence across navigation**
*For any* authenticated session, navigating between pages must preserve the session state without requiring re-authentication.
**Validates: Requirements 1.4**

**Property 3: Protected route authentication enforcement**
*For any* protected route, an unauthenticated request must result in redirect to the authentication page.
**Validates: Requirements 1.5**

**Property 4: Game creation completeness**
*For any* game creation request with valid parameters, the created Game_Session must contain all specified fields (name, maxPlayers, difficultyCurve, toneTags, houseRules) with correct values.
**Validates: Requirements 2.1**

**Property 5: Invite code uniqueness**
*For any* two distinct Game_Sessions, their invite codes must be different.
**Validates: Requirements 2.2**

**Property 6: Host assignment on game creation**
*For any* game creation, the creator must be assigned the 'host' role with exclusive permissions to start and end the game.
**Validates: Requirements 2.3, 13.1**

**Property 7: Valid join adds player to roster**
*For any* valid invite code and authenticated user, joining must add the user to the Game_Session roster and broadcast the update to all players.
**Validates: Requirements 3.1, 3.3**

**Property 8: One character per player per game**
*For any* player in a Game_Session, attempting to create a second character must be rejected.
**Validates: Requirements 4.1**

**Property 9: Character creation field validation**
*For any* character creation request, missing required fields (name, fusionIngredients, description, abilities, weakness) must result in rejection, while optional fields (alignment, archetype, tags) must be accepted when present or absent.
**Validates: Requirements 4.2, 4.3**

**Property 10: Character creation generates complete artifacts**
*For any* valid character creation, the system must generate and store: (1) a Power_Sheet with balanced stats, (2) an image prompt, and (3) a character image with URL.
**Validates: Requirements 4.4, 4.5, 4.6**

**Property 11: Image regeneration rate limiting**
*For any* player requesting multiple image regenerations within the cooldown period, requests beyond the limit must be rejected with a rate limit error.
**Validates: Requirements 4.7, 12.5**

**Property 12: Game start locks roster and establishes turn order**
*For any* game start action by the host, the system must: (1) lock the roster preventing new joins, (2) establish a turn order from the current roster, and (3) set the first player as active.
**Validates: Requirements 5.3, 5.4**

**Property 13: Game start requires complete character creation**
*For any* game with at least one player missing a character, the host's attempt to start the game must be rejected.
**Validates: Requirements 5.5**

**Property 14: Exactly one active player per turn**
*For any* game state during active gameplay, exactly one player must be designated as the active player.
**Validates: Requirements 6.1**

**Property 15: Turn generates exactly four choices**
*For any* turn in active gameplay, the AI_DM must generate exactly 4 choices labeled A, B, C, and D.
**Validates: Requirements 6.2, 7.4**

**Property 16: Only active player can submit actions**
*For any* turn, action submissions from non-active players must be rejected with a permission error.
**Validates: Requirements 6.4, 13.2**

**Property 17: Turn resolution advances to next player**
*For any* valid action submission by the active player, the turn must resolve and the next player in turn order (skipping dead characters) must become active.
**Validates: Requirements 6.3, 6.5**

**Property 18: AI context includes active player's Power_Sheet**
*For any* turn narrative generation, the AI prompt must include the active player's complete Power_Sheet.
**Validates: Requirements 7.1**

**Property 19: AI context completeness**
*For any* turn narrative generation, the AI prompt must include: game rules, turn order, all Power_Sheets, current stats, and recent events.
**Validates: Requirements 7.2**

**Property 20: Turn output structure completeness**
*For any* turn resolution, the AI output must include: (1) narrative text, (2) exactly 4 choices, and (3) stat updates for affected characters.
**Validates: Requirements 7.3, 7.5**

**Property 21: Invalid action rejection**
*For any* player action that requests abilities outside their Power_Sheet or with unreasonable power scaling, the AI_DM must refuse the action with an explanation and require a valid retry.
**Validates: Requirements 8.1, 8.2, 8.3**

**Property 22: Action validation against Power_Sheet**
*For any* player action, validation must occur against the active player's Power_Sheet (abilities, weaknesses, current stats) before resolution.
**Validates: Requirements 8.4, 8.5**

**Property 23: Character death updates turn order**
*For any* character whose HP reaches zero, the system must: (1) mark the character as dead, (2) remove them from the active turn order, and (3) continue the game with remaining players.
**Validates: Requirements 10.1, 10.2, 10.3**

**Property 24: Stat updates are broadcast and stored**
*For any* event that affects character stats, the system must: (1) update the character's current stats, (2) broadcast the update to all players, and (3) store a StatsSnapshot.
**Validates: Requirements 9.3, 9.4, 11.4**

**Property 25: Real-time state synchronization**
*For any* game state change (player join/leave, turn resolution, stat update), the system must broadcast updates to all players in the Game_Session immediately.
**Validates: Requirements 11.1, 11.2, 11.3**

**Property 26: Image generation uses consistent template**
*For any* character image generation, the prompt must follow a consistent template that includes the Fusion_Ingredients and description.
**Validates: Requirements 12.1**

**Property 27: Image generation stores artifacts**
*For any* successful image generation, the system must store: (1) the image file, (2) the image URL, and (3) the prompt used.
**Validates: Requirements 12.2, 12.3**

**Property 28: Permission validation for state modifications**
*For any* game state modification (start game, end game, submit action), the system must validate the requesting user has the required permissions.
**Validates: Requirements 13.3**

**Property 29: AI endpoint rate limiting**
*For any* user making rapid requests to AI endpoints, requests beyond the rate limit must be rejected with a rate limit error.
**Validates: Requirements 13.4**

**Property 30: Input sanitization prevents injection**
*For any* user input that will be included in AI prompts, the system must sanitize the input to prevent prompt injection attacks.
**Validates: Requirements 13.6**

**Property 31: Character cards display complete information**
*For any* character in the Game Room, the character card must display: image, HP, level, and status effects.
**Validates: Requirements 14.3**

**Property 32: Action input visibility restricted to active player**
*For any* turn, the action input field must be visible only to the active player, not to other players.
**Validates: Requirements 14.5**

**Property 33: Choice display completeness**
*For any* turn, all 4 choices (A, B, C, D) must be displayed with clear labels and descriptions.
**Validates: Requirements 14.6**

**Property 34: Data persistence round-trip**
*For any* entity (User, Game, Character, Turn, Event, StatsSnapshot), creating the entity and then retrieving it must return equivalent data.
**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6**

**Property 35: Responsive rendering across viewports**
*For any* page, rendering at different viewport widths (mobile, tablet, desktop) must maintain functionality and readability.
**Validates: Requirements 16.1**

**Property 36: Touch target minimum size on mobile**
*For any* interactive element, the touch target size on mobile viewports must meet minimum accessibility standards (44x44px).
**Validates: Requirements 16.4**

**Property 37: Dashboard displays all user games**
*For any* user with multiple games, the dashboard must display all games they are participating in with correct status.
**Validates: Requirements 17.1, 17.2**

**Property 38: Dashboard navigation based on game status**
*For any* game clicked in the dashboard, navigation must go to the lobby if status is 'lobby', or to the game room if status is 'active'.
**Validates: Requirements 17.4**

**Property 39: Dashboard displays user characters**
*For any* game in the dashboard where the user has created a character, the character information must be displayed.
**Validates: Requirements 17.5**

**Property 40: Environment variable validation on startup**
*For any* application startup with missing required environment variables, the system must fail with a clear error message indicating which variables are missing.
**Validates: Requirements 18.5**

## Error Handling

### Error Categories

**1. Authentication Errors**
- Invalid credentials
- Expired sessions
- OAuth provider failures
- Missing user profile data

**Strategy**: Return clear error messages, preserve user input, provide retry mechanisms.

**2. Game Management Errors**
- Invalid invite codes
- Game at capacity
- Game already started
- Unauthorized actions (non-host trying to start game)

**Strategy**: Validate on server-side, return specific error codes, prevent client-side manipulation.

**3. Character Creation Errors**
- Missing required fields
- Invalid ability count (not 3-6)
- AI generation failures (Power_Sheet or image)
- Rate limit exceeded for image regeneration

**Strategy**: Preserve user input on failure, allow retry, provide clear validation messages, implement exponential backoff for AI failures.

**4. Gameplay Errors**
- Out-of-turn action attempts
- Invalid action requests (outside Power_Sheet)
- AI generation timeouts
- Connection loss during turn

**Strategy**: Enforce permissions server-side, validate actions against Power_Sheet, implement retry logic for AI timeouts, maintain game state during reconnection.

**5. Real-Time Communication Errors**
- WebSocket disconnection
- Failed state synchronization
- Message delivery failures

**Strategy**: Implement automatic reconnection, queue messages during disconnection, resync state on reconnection.

**6. AI Integration Errors**
- OpenAI API rate limits
- Invalid API responses
- Timeout errors
- Prompt injection attempts

**Strategy**: Implement retry with exponential backoff, validate AI responses, sanitize all user inputs, provide fallback responses.

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string; // e.g., 'GAME_FULL', 'INVALID_ACTION', 'RATE_LIMIT_EXCEEDED'
    message: string; // Human-readable error message
    details?: Record<string, any>; // Additional context
    retryable: boolean; // Whether the client should retry
  };
}
```

### Critical Error Handling Rules

1. **Never expose internal errors to clients**: Sanitize error messages
2. **Always validate on server-side**: Never trust client validation
3. **Preserve user input on failures**: Allow easy retry
4. **Log all errors server-side**: For debugging and monitoring
5. **Implement circuit breakers**: For external API calls (OpenAI)
6. **Graceful degradation**: Continue game if non-critical features fail

## Testing Strategy

### Dual Testing Approach

The Warlynx application requires both unit testing and property-based testing for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary

### Unit Testing Focus

Unit tests should focus on:
- Specific examples that demonstrate correct behavior (e.g., creating a game with specific settings)
- Integration points between components (e.g., NextAuth integration, Prisma queries)
- Edge cases (e.g., game at capacity, joining started game)
- Error conditions (e.g., invalid invite code, missing required fields)

Avoid writing too many unit tests for scenarios that property tests can cover through randomization.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each property test must reference its design document property
- Tag format: `// Feature: warlynx-multiplayer-game, Property {number}: {property_text}`

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: warlynx-multiplayer-game, Property 5: Invite code uniqueness
test('invite codes are unique across games', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(gameSettingsArbitrary(), { minLength: 2, maxLength: 10 }),
      async (gameSettings) => {
        const games = await Promise.all(
          gameSettings.map(settings => createGame(settings))
        );
        
        const inviteCodes = games.map(g => g.inviteCode);
        const uniqueCodes = new Set(inviteCodes);
        
        expect(uniqueCodes.size).toBe(inviteCodes.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Organization

```
tests/
├── unit/
│   ├── auth/
│   │   ├── signin.test.ts
│   │   └── session.test.ts
│   ├── game/
│   │   ├── create.test.ts
│   │   ├── join.test.ts
│   │   └── start.test.ts
│   ├── character/
│   │   ├── create.test.ts
│   │   └── power-sheet.test.ts
│   ├── gameplay/
│   │   ├── turn-manager.test.ts
│   │   └── ai-dm.test.ts
│   └── realtime/
│       └── synchronization.test.ts
├── property/
│   ├── auth.property.test.ts
│   ├── game.property.test.ts
│   ├── character.property.test.ts
│   ├── gameplay.property.test.ts
│   ├── permissions.property.test.ts
│   └── persistence.property.test.ts
├── integration/
│   ├── game-flow.test.ts
│   ├── character-creation-flow.test.ts
│   └── gameplay-flow.test.ts
└── e2e/
    ├── full-game.test.ts
    └── multiplayer.test.ts
```

### Property Test Generators (Arbitraries)

Key generators needed for property tests:

```typescript
// User generators
const userArbitrary = () => fc.record({
  email: fc.emailAddress(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  avatar: fc.option(fc.webUrl(), { nil: null })
});

// Game settings generators
const gameSettingsArbitrary = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  maxPlayers: fc.integer({ min: 2, max: 10 }),
  difficultyCurve: fc.constantFrom('easy', 'medium', 'hard', 'brutal'),
  toneTags: fc.array(fc.constantFrom('anime', 'marvel', 'pokemon', 'wrestling', 'custom'), { minLength: 1, maxLength: 5 }),
  houseRules: fc.option(fc.string({ maxLength: 500 }), { nil: null })
});

// Character generators
const characterArbitrary = () => fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  fusionIngredients: fc.string({ minLength: 5, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  abilities: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 3, maxLength: 6 }),
  weakness: fc.string({ minLength: 5, maxLength: 200 }),
  alignment: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  archetype: fc.option(fc.string({ maxLength: 50 }), { nil: null }),
  tags: fc.array(fc.string({ maxLength: 30 }), { maxLength: 5 })
});

// Power Sheet generators
const powerSheetArbitrary = () => fc.record({
  level: fc.integer({ min: 1, max: 100 }),
  hp: fc.integer({ min: 1, max: 1000 }),
  maxHp: fc.integer({ min: 1, max: 1000 }),
  attributes: fc.record({
    strength: fc.integer({ min: 1, max: 100 }),
    agility: fc.integer({ min: 1, max: 100 }),
    intelligence: fc.integer({ min: 1, max: 100 }),
    charisma: fc.integer({ min: 1, max: 100 }),
    endurance: fc.integer({ min: 1, max: 100 })
  }),
  abilities: fc.array(abilityArbitrary(), { minLength: 3, maxLength: 10 }),
  weakness: fc.string({ minLength: 5, maxLength: 200 }),
  statuses: fc.array(statusArbitrary(), { maxLength: 5 }),
  perks: fc.array(perkArbitrary(), { maxLength: 10 })
});

// Action generators (for testing validation)
const validActionArbitrary = (powerSheet: PowerSheet) => 
  fc.constantFrom(...powerSheet.abilities.map(a => a.name));

const invalidActionArbitrary = (powerSheet: PowerSheet) =>
  fc.string({ minLength: 5, maxLength: 100 })
    .filter(action => !powerSheet.abilities.some(a => a.name === action));
```

### Integration Testing

Integration tests should cover:
- Complete game creation flow (create → invite → join → character creation → start)
- Complete turn flow (present choices → submit action → validate → resolve → update stats → next turn)
- Real-time synchronization across multiple clients
- AI integration (Power_Sheet generation, image generation, narrative generation)
- Database operations with Prisma
- Authentication flow with NextAuth

### End-to-End Testing

E2E tests should cover:
- Full game from creation to completion with multiple players
- Character death and game continuation
- Reconnection after disconnection
- Mobile responsive behavior

### Mocking Strategy

**Mock external services in unit/property tests**:
- OpenAI API (GPT-4 and DALL-E)
- Storage service (S3/Supabase)
- Email service (for authentication)

**Use real services in integration tests**:
- Database (use test database)
- NextAuth (use test OAuth providers)

**Use real services in E2E tests**:
- All services (use staging environment)

### Test Data Management

- Use factories for creating test data
- Use database transactions for test isolation
- Clean up test data after each test
- Use separate test database
- Seed test database with minimal required data

### Critical Test Scenarios

1. **Exactly 4 choices enforcement**: Property test that every turn generates exactly 4 choices
2. **Turn order enforcement**: Property test that only active player can act
3. **Power Sheet validation**: Property test that invalid actions are rejected
4. **Character death handling**: Unit test for death → turn order update → game continuation
5. **Real-time synchronization**: Integration test for state updates across multiple clients
6. **Rate limiting**: Property test for image regeneration and AI endpoint rate limits
7. **Permission enforcement**: Property test for host-only and active-player-only actions
8. **Data persistence**: Property test for round-trip data integrity

## Implementation Notes

### AI Prompt Engineering

**Power Sheet Generation Prompt Template**:
```
You are a game master creating a balanced character for a multiplayer narrative game.

Character Information:
- Name: {name}
- Fusion Ingredients: {fusionIngredients}
- Description: {description}
- Abilities: {abilities}
- Weakness: {weakness}

Generate a normalized Power Sheet with:
1. Starting level (always 1)
2. HP and maxHP (balanced for level 1, typically 50-150)
3. Attributes (strength, agility, intelligence, charisma, endurance) - each 1-100, total should be ~250
4. Detailed ability descriptions with power levels (1-10 scale)
5. Weakness description
6. Empty statuses and perks arrays (filled during gameplay)

Ensure the character is balanced and not overpowered. The fusion ingredients should influence the stats and abilities, but maintain game balance.

Return JSON in this exact format: {PowerSheet schema}
```

**Turn Narrative Generation Prompt Template**:
```
You are the Dungeon Master for a multiplayer narrative game called Warlynx.

Game Settings:
- Tone Tags: {toneTags}
- Difficulty: {difficultyCurve}
- House Rules: {houseRules}

Current Game State:
- Turn: {turnNumber}
- Active Player: {activePlayer.character.name}
- Active Player's Power Sheet: {activePlayer.powerSheet}
- All Characters: {allCharacters}
- Recent Events: {recentEvents}

Generate the next turn:
1. Write engaging narrative (2-4 paragraphs) that:
   - Continues from recent events
   - Presents a situation for the active player
   - Matches the tone tags
   - Respects the difficulty curve
   
2. Present EXACTLY 4 choices (A, B, C, D):
   - Each choice should be meaningful and distinct
   - Choices should match the active player's abilities
   - Include risk levels (low, medium, high, extreme)
   - No choice should be obviously "correct"

3. If the player submitted a custom action: "{customAction}"
   - Validate it against their Power Sheet
   - If invalid, explain why and require a valid choice
   - If valid, resolve it and generate consequences

Return JSON in this exact format: {TurnResponse schema}

CRITICAL RULES:
- ALWAYS generate exactly 4 choices
- NEVER allow actions outside the Power Sheet
- NEVER provide plot armor - characters can die
- ALWAYS consider character weaknesses
- ALWAYS update stats based on events
```

**Action Validation Prompt Template**:
```
Validate this player action against their Power Sheet.

Action: {action}
Power Sheet: {powerSheet}
Current Stats: {currentStats}

Determine:
1. Is this action within the character's abilities?
2. Is the power scaling reasonable?
3. Are there any weaknesses that would prevent this?
4. What are the likely consequences?

Return JSON: {
  valid: boolean,
  reason: string,
  suggestedAlternatives?: string[]
}
```

### Real-Time Architecture Decision

**Option 1: Socket.io (Recommended for self-hosted)**
- Pros: Full control, works with any hosting, mature library
- Cons: Requires separate server process, more complex deployment
- Setup: Run Socket.io server alongside Next.js, use Redis for multi-instance scaling

**Option 2: Supabase Realtime (Recommended for managed solution)**
- Pros: Managed service, integrates with Supabase database, simpler deployment
- Cons: Vendor lock-in, less control, potential costs
- Setup: Use Supabase client library, subscribe to database changes

**Recommendation**: Use Supabase Realtime for MVP, migrate to Socket.io if scaling requires it.

### Database Indexing Strategy

Critical indexes for performance:
- `Game.inviteCode` - for join lookups
- `Game.status` - for dashboard queries
- `GamePlayer.gameId` and `GamePlayer.userId` - for roster queries
- `Character.gameId` and `Character.userId` - for character lookups
- `Turn.gameId` and `Turn.turnIndex` - for turn history
- `GameEvent.gameId` and `GameEvent.createdAt` - for event log queries
- `StatsSnapshot.characterId` and `StatsSnapshot.createdAt` - for progression history

### Caching Strategy

**Redis caching for**:
- Active game state (avoid database queries every turn)
- User sessions (NextAuth)
- Rate limiting counters
- Real-time connection state

**Cache invalidation**:
- Invalidate game cache on state changes
- TTL for session cache (match NextAuth session duration)
- Reset rate limit counters on cooldown expiry

### Security Considerations

1. **API Key Protection**: All OpenAI API calls must be server-side only
2. **Input Sanitization**: Sanitize all user inputs before including in AI prompts
3. **Permission Checks**: Validate permissions on every state-modifying operation
4. **Rate Limiting**: Implement rate limiting on all AI endpoints
5. **CSRF Protection**: Use NextAuth's built-in CSRF protection
6. **SQL Injection**: Use Prisma's parameterized queries (automatic)
7. **XSS Protection**: Sanitize user-generated content before rendering
8. **Authentication**: Require authentication for all game-related operations

### Performance Optimization

1. **Database Connection Pooling**: Configure Prisma connection pool
2. **Image Optimization**: Use Next.js Image component for character images
3. **Code Splitting**: Use dynamic imports for heavy components
4. **Server Components**: Use React Server Components where possible
5. **Streaming**: Stream AI responses for faster perceived performance
6. **Lazy Loading**: Lazy load character Power Sheets and event history
7. **Debouncing**: Debounce real-time updates to prevent flooding

### Deployment Checklist

- [ ] Set up PostgreSQL database (Supabase/Railway/Neon)
- [ ] Configure environment variables
- [ ] Set up NextAuth providers (email, OAuth)
- [ ] Configure OpenAI API access
- [ ] Set up S3/Supabase Storage for images
- [ ] Configure real-time service (Socket.io or Supabase)
- [ ] Set up Redis for caching (optional but recommended)
- [ ] Configure domain and SSL
- [ ] Set up monitoring and logging
- [ ] Run database migrations
- [ ] Deploy to Vercel or self-hosted environment
- [ ] Test all flows in production environment
- [ ] Set up backup strategy for database
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry or similar)

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Storage (choose one)
# Option 1: AWS S3
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="warlynx-images"

# Option 2: Supabase Storage
NEXT_PUBLIC_SUPABASE_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Real-time (if using Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."

# Redis (optional, for caching)
REDIS_URL="redis://..."

# Rate Limiting
RATE_LIMIT_IMAGE_GENERATION="3" # per hour
RATE_LIMIT_AI_REQUESTS="100" # per hour

# Application
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Conclusion

This design provides a comprehensive architecture for the Warlynx multiplayer AI game. The system enforces strict turn-based gameplay, validates all actions against character Power Sheets, and maintains real-time synchronization across all players. The dual testing approach (unit + property-based) ensures correctness and reliability, while the modular architecture allows for future extensibility.

Key design decisions:
- Server-side AI integration for security
- Real-time communication for synchronization
- Strict permission enforcement for fairness
- Property-based testing for correctness guarantees
- Comprehensive error handling for reliability

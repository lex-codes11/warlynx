# Requirements Document

## Introduction

Warlynx is a multiplayer AI-powered narrative game web application where players create fusion characters with AI-generated images and participate in turn-based gameplay orchestrated by an AI Dungeon Master. The system enforces strict turn-based rules, real consequences including character death, and balanced power progression through AI-normalized character sheets.

## Glossary

- **Host**: The user who creates a game session and controls game lifecycle (start, end)
- **Player**: A user who joins a game session and controls one character
- **Character**: A fusion entity created by combining multiple fictional characters with AI-generated stats and image
- **Power_Sheet**: AI-normalized character statistics including abilities, attributes, HP, and weaknesses
- **AI_DM**: The AI Dungeon Master that generates narrative, presents choices, and resolves actions
- **Turn**: A discrete gameplay phase where exactly one player takes action
- **Game_Session**: A multiplayer game instance with roster, turn order, and state
- **Fusion_Ingredients**: The source characters combined to create a fusion character (e.g., "Homelander + Charizard + Rikishi")
- **System**: The Warlynx web application
- **Auth_Provider**: Authentication service (NextAuth with email and OAuth)
- **Invite_Code**: Unique code or link used to join a game session

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to sign up and log in to the application, so that I can create or join games with a persistent identity.

#### Acceptance Criteria

1. THE System SHALL provide email-based authentication through the Auth_Provider
2. THE System SHALL provide OAuth authentication through the Auth_Provider
3. WHEN a user successfully authenticates, THE System SHALL create or retrieve a user profile with id, displayName, and avatar
4. THE System SHALL maintain user session state across page navigation
5. WHEN an unauthenticated user attempts to access protected features, THE System SHALL redirect them to the authentication page

### Requirement 2: Game Creation

**User Story:** As a host, I want to create a new game with custom settings, so that I can invite players to a tailored gameplay experience.

#### Acceptance Criteria

1. WHEN an authenticated user creates a game, THE System SHALL generate a unique Game_Session with name, max players limit, difficulty curve, tone tags, and house rules
2. WHEN a Game_Session is created, THE System SHALL generate a unique Invite_Code and shareable invite link
3. WHEN a Game_Session is created, THE System SHALL assign the creator as the Host with exclusive control permissions
4. THE System SHALL store tone tags including anime, marvel, pokemon, wrestling, and custom tags
5. WHEN a game is created, THE System SHALL navigate the Host to the game lobby

### Requirement 3: Game Joining

**User Story:** As a player, I want to join a game using an invite code or link, so that I can participate in multiplayer sessions.

#### Acceptance Criteria

1. WHEN an authenticated user provides a valid Invite_Code, THE System SHALL add them to the corresponding Game_Session roster
2. WHEN an unauthenticated user attempts to join via invite link, THE System SHALL require authentication before joining
3. WHEN a user joins a game, THE System SHALL display them in the lobby roster immediately
4. IF a Game_Session has reached max players limit, THEN THE System SHALL reject additional join attempts with an error message
5. IF a Game_Session has already started, THEN THE System SHALL reject join attempts with an error message

### Requirement 4: Character Creation

**User Story:** As a player, I want to create a fusion character with AI-generated stats and image, so that I have a unique entity to play in the game.

#### Acceptance Criteria

1. THE System SHALL allow each player to create exactly one Character per Game_Session
2. WHEN creating a Character, THE System SHALL require name, Fusion_Ingredients, description, abilities (3-6), and weakness
3. WHEN creating a Character, THE System SHALL accept optional fields including alignment, archetype, and tags
4. WHEN a Character is submitted, THE AI_DM SHALL generate a normalized Power_Sheet with balanced stats
5. WHEN a Character is submitted, THE AI_DM SHALL generate a character image prompt based on Fusion_Ingredients and description
6. WHEN a Character is submitted, THE System SHALL generate and store a character image with URL
7. THE System SHALL allow players to regenerate character images with rate limiting applied
8. WHEN a Character creation fails, THE System SHALL preserve the player's input data for retry

### Requirement 5: Game Lobby Management

**User Story:** As a host, I want to manage the game lobby and start the game when ready, so that I can control when gameplay begins.

#### Acceptance Criteria

1. WHEN the Host is in the lobby, THE System SHALL display the invite link, invite code, and current roster
2. THE System SHALL display each player's character creation status in the lobby
3. WHEN the Host starts the game, THE System SHALL lock the roster preventing new joins
4. WHEN the Host starts the game, THE System SHALL establish and lock the turn order
5. IF any player has not completed character creation, THEN THE System SHALL prevent the Host from starting the game
6. WHEN the game starts, THE System SHALL navigate all players to the Game Room

### Requirement 6: Turn-Based Gameplay

**User Story:** As a player, I want to participate in strict turn-based gameplay, so that each player has fair opportunity to act.

#### Acceptance Criteria

1. THE System SHALL enforce exactly one active player per turn
2. WHEN a turn begins, THE AI_DM SHALL present exactly 4 choices labeled A, B, C, and D to the active player
3. WHEN the active player submits a choice or custom action, THE AI_DM SHALL resolve the action and advance to the next turn
4. THE System SHALL prevent non-active players from submitting actions during another player's turn
5. WHEN a turn is resolved, THE System SHALL update the turn order and designate the next active player
6. THE System SHALL display whose turn it is to all players in real-time

### Requirement 7: AI Dungeon Master Narrative Generation

**User Story:** As a player, I want an AI DM to generate engaging narrative and present meaningful choices, so that the game feels dynamic and responsive.

#### Acceptance Criteria

1. WHEN generating narrative for a turn, THE AI_DM SHALL read the active player's Power_Sheet
2. WHEN generating narrative for a turn, THE AI_DM SHALL consider game rules, turn order, all Power_Sheets, current stats, and last N events
3. WHEN generating turn output, THE AI_DM SHALL produce DM narration text
4. WHEN generating turn output, THE AI_DM SHALL produce exactly 4 choices labeled A through D
5. WHEN generating turn output, THE AI_DM SHALL include stat updates for affected characters
6. THE System SHALL log all DM narrative and events in chronological order

### Requirement 8: Power Sheet Enforcement

**User Story:** As a player, I want the AI DM to enforce my character's Power_Sheet limitations, so that gameplay remains balanced and fair.

#### Acceptance Criteria

1. WHEN a player requests an action outside their Power_Sheet abilities, THE AI_DM SHALL refuse the action with an explanation
2. WHEN a player requests an action with unreasonable power scaling, THE AI_DM SHALL refuse the action with an explanation
3. WHEN the AI_DM refuses an action, THE System SHALL require the player to select a valid A-D choice or submit a reasonable action
4. THE AI_DM SHALL validate all player actions against the active player's Power_Sheet before resolution
5. WHEN validating actions, THE AI_DM SHALL consider ability descriptions, character weaknesses, and current stat values

### Requirement 9: Character Progression and Stats

**User Story:** As a player, I want my character to level up and gain upgrades frequently, so that I feel progression throughout the game.

#### Acceptance Criteria

1. THE System SHALL implement Skyrim-style leveling with frequent small upgrades
2. WHEN a character levels up, THE System SHALL offer perks or unlocks appropriate to the character's Power_Sheet
3. WHEN an event affects a character, THE System SHALL update and display HP, level, attributes, and status effects
4. THE System SHALL store stat snapshots after each significant event for history tracking
5. THE System SHALL display current stats for all characters in the Game Room

### Requirement 10: Real Consequences and Character Death

**User Story:** As a player, I want actions to have real consequences including character death, so that gameplay feels meaningful and stakes are high.

#### Acceptance Criteria

1. WHEN a character's HP reaches zero, THE System SHALL mark the character as dead
2. WHEN a character dies, THE System SHALL remove them from the active turn order
3. WHEN a character dies, THE System SHALL continue the game with remaining players
4. THE AI_DM SHALL not provide plot armor or guaranteed survival to any character
5. THE System SHALL display deceased characters with visual indication in the Game Room

### Requirement 11: Real-Time Game State Synchronization

**User Story:** As a player, I want to see game updates in real-time, so that I stay synchronized with other players' actions.

#### Acceptance Criteria

1. WHEN any game state changes, THE System SHALL broadcast updates to all players in the Game_Session
2. WHEN a turn is resolved, THE System SHALL update the narrative log for all players immediately
3. WHEN a player joins or leaves the lobby, THE System SHALL update the roster for all players immediately
4. WHEN character stats change, THE System SHALL update character cards for all players immediately
5. THE System SHALL maintain connection state and reconnect players if connection is lost

### Requirement 12: AI Image Generation

**User Story:** As a player, I want AI-generated character images, so that my fusion character has a unique visual representation.

#### Acceptance Criteria

1. WHEN generating a character image, THE System SHALL use a consistent prompt template based on Fusion_Ingredients and description
2. WHEN an image is generated, THE System SHALL store the image file and return a URL
3. WHEN an image is generated, THE System SHALL store the prompt used for generation
4. THE System SHALL allow players to regenerate character images
5. WHEN a player requests image regeneration, THE System SHALL enforce rate limiting with cooldown period
6. THE System SHALL use server-side API endpoints for all AI image generation calls

### Requirement 13: Permission and Security Controls

**User Story:** As a system administrator, I want strict permission controls, so that only authorized users can perform sensitive actions.

#### Acceptance Criteria

1. THE System SHALL verify that only the Host can start or end a Game_Session
2. THE System SHALL verify that only the active player can submit actions during their turn
3. THE System SHALL validate all game state modifications against user permissions
4. THE System SHALL rate limit all AI API endpoints to prevent abuse
5. THE System SHALL enforce game rules server-side to prevent client-side manipulation
6. THE System SHALL sanitize all user inputs to prevent prompt injection attacks

### Requirement 14: Game Room Interface

**User Story:** As a player, I want a clear game room interface, so that I can easily follow the narrative and take actions.

#### Acceptance Criteria

1. THE System SHALL display the DM narrative log on the left side of the Game Room
2. THE System SHALL display the turn panel on the right side showing whose turn it is and available choices
3. THE System SHALL display character cards showing image, HP, level, and status effects
4. WHEN a player clicks on a character card, THE System SHALL display the full Power_Sheet
5. THE System SHALL display the action input field only to the active player during their turn
6. THE System SHALL display all 4 A-D choices clearly labeled during each turn

### Requirement 15: Data Persistence

**User Story:** As a user, I want all game data to persist, so that I can resume games and review history.

#### Acceptance Criteria

1. THE System SHALL store all Users with id, displayName, and avatar in the database
2. THE System SHALL store all Game_Sessions with settings, roster, and state in the database
3. THE System SHALL store all Characters with Power_Sheet JSON, image URL, and stats in the database
4. THE System SHALL store all Turns with turnIndex, activePlayerId, and phase in the database
5. THE System SHALL store all Messages and Events with type, content, and structured JSON in the database
6. THE System SHALL store StatsSnapshots for character progression history

### Requirement 16: Responsive UI Design

**User Story:** As a user, I want a mobile-responsive interface, so that I can play on any device.

#### Acceptance Criteria

1. THE System SHALL render all pages responsively using Tailwind CSS
2. THE System SHALL adapt the Game Room layout for mobile screens with stacked panels
3. THE System SHALL ensure character cards are readable on mobile devices
4. THE System SHALL ensure all interactive elements are touch-friendly on mobile devices
5. THE System SHALL maintain visual consistency across desktop, tablet, and mobile viewports

### Requirement 17: Dashboard and Game Management

**User Story:** As a user, I want a dashboard to manage my games, so that I can easily access active and past games.

#### Acceptance Criteria

1. WHEN a user navigates to the dashboard, THE System SHALL display all games they are participating in
2. THE System SHALL display game status (lobby, in-progress, completed) for each game
3. THE System SHALL provide a "Create Game" button that navigates to game creation
4. WHEN a user clicks on a game, THE System SHALL navigate them to the appropriate screen (lobby or game room)
5. THE System SHALL display the user's character for each game in the list

### Requirement 18: Environment Configuration

**User Story:** As a developer, I want clear environment variable documentation, so that I can deploy the application correctly.

#### Acceptance Criteria

1. THE System SHALL document all required environment variables for database connection
2. THE System SHALL document all required environment variables for authentication providers
3. THE System SHALL document all required environment variables for OpenAI API integration
4. THE System SHALL document all required environment variables for storage service (S3 or Supabase)
5. THE System SHALL validate required environment variables on application startup

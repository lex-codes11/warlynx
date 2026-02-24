# Implementation Plan: Warlynx Multiplayer AI Game

## Overview

This implementation plan breaks down the Warlynx multiplayer AI game into discrete, incremental coding tasks. Each task builds on previous work, with testing integrated throughout to catch errors early. The plan follows a bottom-up approach: infrastructure → core systems → gameplay → UI polish.

## Tasks

- [x] 1. Project setup and infrastructure
  - Initialize Next.js 14+ project with TypeScript and App Router
  - Configure Tailwind CSS and shadcn/ui
  - Set up Prisma with PostgreSQL connection
  - Create initial Prisma schema with all models (User, Account, Session, Game, GamePlayer, Character, Turn, GameEvent, StatsSnapshot, ImageGenerationLog)
  - Run initial database migration
  - Set up environment variable validation on startup
  - Create basic project structure (lib/, components/, app/ directories)
  - _Requirements: 18.5_

- [ ] 2. Authentication system
  - [x] 2.1 Configure NextAuth with email and OAuth providers
    - Set up NextAuth configuration in `app/api/auth/[...nextauth]/route.ts`
    - Configure email provider
    - Configure at least one OAuth provider (Google or Discord)
    - Create auth utilities in `lib/auth.ts`
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 2.2 Write property test for authentication
    - **Property 1: Authentication creates complete user profiles**
    - **Validates: Requirements 1.3**
  
  - [x] 2.3 Implement session management and protected routes
    - Create session persistence logic
    - Implement middleware for protected routes
    - Create redirect logic for unauthenticated users
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 2.4 Write property tests for session and protection
    - **Property 2: Session persistence across navigation**
    - **Property 3: Protected route authentication enforcement**
    - **Validates: Requirements 1.4, 1.5**
  
  - [x] 2.5 Create authentication UI components
    - Build SignInForm component
    - Build SignUpForm component
    - Create auth pages in app directory
    - _Requirements: 1.1, 1.2_

- [ ] 3. Game management system
  - [x] 3.1 Implement game creation logic
    - Create `lib/game-manager.ts` with game creation utilities
    - Implement invite code generation (unique, short codes)
    - Create API route `app/api/games/create/route.ts`
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 3.2 Write property tests for game creation
    - **Property 4: Game creation completeness**
    - **Property 5: Invite code uniqueness**
    - **Property 6: Host assignment on game creation**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [x] 3.3 Implement game joining logic
    - Create API route `app/api/games/[gameId]/join/route.ts`
    - Implement validation (max players, game status)
    - Add player to roster
    - _Requirements: 3.1, 3.4, 3.5_
  
  - [ ]* 3.4 Write property test for game joining
    - **Property 7: Valid join adds player to roster**
    - **Validates: Requirements 3.1, 3.3**
  
  - [ ]* 3.5 Write unit tests for join edge cases
    - Test joining full game (capacity limit)
    - Test joining started game
    - _Requirements: 3.4, 3.5_
  
  - [x] 3.6 Implement game start logic
    - Create API route `app/api/games/[gameId]/start/route.ts`
    - Implement permission check (host only)
    - Lock roster and establish turn order
    - Validate all players have characters
    - _Requirements: 5.3, 5.4, 5.5, 13.1_
  
  - [ ]* 3.7 Write property tests for game start
    - **Property 12: Game start locks roster and establishes turn order**
    - **Property 13: Game start requires complete character creation**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Character creation system
  - [x] 5.1 Implement Power Sheet generation with OpenAI
    - Create `lib/ai/power-sheet-generator.ts`
    - Implement GPT-4 prompt for Power Sheet generation
    - Parse and validate AI response
    - Implement retry logic with exponential backoff
    - _Requirements: 4.4_
  
  - [ ]* 5.2 Write property test for Power Sheet generation
    - **Property 10: Character creation generates complete artifacts** (Power Sheet part)
    - **Validates: Requirements 4.4**
  
  - [x] 5.3 Implement character image generation with DALL-E
    - Create `lib/ai/image-generator.ts`
    - Implement consistent prompt template
    - Generate image and upload to storage (S3 or Supabase)
    - Store image URL and prompt
    - _Requirements: 4.5, 4.6, 12.1, 12.2, 12.3_
  
  - [ ]* 5.4 Write property tests for image generation
    - **Property 26: Image generation uses consistent template**
    - **Property 27: Image generation stores artifacts**
    - **Validates: Requirements 12.1, 12.2, 12.3**
  
  - [x] 5.5 Implement character creation API
    - Create API route `app/api/characters/create/route.ts`
    - Validate required and optional fields
    - Enforce one character per player per game
    - Call Power Sheet and image generation
    - Store character in database
    - _Requirements: 4.1, 4.2, 4.3, 4.8_
  
  - [ ]* 5.6 Write property tests for character creation
    - **Property 8: One character per player per game**
    - **Property 9: Character creation field validation**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [x] 5.7 Implement image regeneration with rate limiting
    - Create API route `app/api/characters/[characterId]/regenerate-image/route.ts`
    - Implement rate limiting (Redis or in-memory)
    - Track regeneration attempts in ImageGenerationLog
    - _Requirements: 4.7, 12.5_
  
  - [ ]* 5.8 Write property test for rate limiting
    - **Property 11: Image regeneration rate limiting**
    - **Validates: Requirements 4.7, 12.5**
  
  - [x] 5.9 Create character builder UI
    - Build CharacterBuilder component with form
    - Add validation and error display
    - Show image preview and regenerate button
    - Preserve input on failure
    - _Requirements: 4.2, 4.3, 4.8_

- [ ] 6. Real-time communication system
  - [x] 6.1 Set up real-time infrastructure
    - Choose and configure Socket.io or Supabase Realtime
    - Create `lib/socket/server.ts` or `lib/realtime/supabase.ts`
    - Set up client connection in `lib/socket/client.ts`
    - Implement connection state management
    - _Requirements: 11.5_
  
  - [x] 6.2 Implement game state broadcasting
    - Create broadcast utilities for game state changes
    - Implement room subscription/unsubscription
    - Handle player join/leave events
    - _Requirements: 11.1, 11.3_
  
  - [ ]* 6.3 Write property test for real-time synchronization
    - **Property 25: Real-time state synchronization**
    - **Validates: Requirements 11.1, 11.2, 11.3**
  
  - [x] 6.4 Create React hooks for game state
    - Build `hooks/useGameState.ts` for subscribing to game updates
    - Build `hooks/useTurnState.ts` for turn updates
    - Build `hooks/useCharacterStats.ts` for stat updates
    - Handle reconnection logic
    - _Requirements: 11.1, 11.2, 11.4_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Turn management system
  - [x] 8.1 Implement turn manager
    - Create `lib/turn-manager.ts`
    - Implement turn order tracking
    - Implement active player designation
    - Handle turn advancement
    - Skip dead players in turn order
    - _Requirements: 6.1, 6.5_
  
  - [ ]* 8.2 Write property tests for turn management
    - **Property 14: Exactly one active player per turn**
    - **Property 17: Turn resolution advances to next player**
    - **Validates: Requirements 6.1, 6.3, 6.5**
  
  - [x] 8.3 Implement turn permission enforcement
    - Create permission validation for action submissions
    - Reject out-of-turn actions
    - _Requirements: 6.4, 13.2_
  
  - [ ]* 8.4 Write property test for turn permissions
    - **Property 16: Only active player can submit actions**
    - **Validates: Requirements 6.4, 13.2**
  
  - [x] 8.5 Create Turn model API routes
    - Create `app/api/game/[gameId]/current-turn/route.ts`
    - Return current turn state and active player
    - _Requirements: 6.6_

- [ ] 9. AI Dungeon Master system
  - [x] 9.1 Implement DM prompt construction
    - Create `lib/ai/dungeon-master.ts`
    - Build prompt template with game context
    - Include active player's Power Sheet
    - Include all characters and recent events
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 9.2 Write property tests for AI context
    - **Property 18: AI context includes active player's Power_Sheet**
    - **Property 19: AI context completeness**
    - **Validates: Requirements 7.1, 7.2**
  
  - [~] 9.3 Implement turn narrative generation
    - Call GPT-4 with constructed prompt
    - Parse response for narrative, choices, and stat updates
    - Validate response structure (exactly 4 choices)
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [ ]* 9.4 Write property tests for turn output
    - **Property 15: Turn generates exactly four choices**
    - **Property 20: Turn output structure completeness**
    - **Validates: Requirements 6.2, 7.3, 7.4, 7.5**
  
  - [~] 9.5 Implement action validation
    - Create `lib/ai/action-validator.ts`
    - Validate actions against Power Sheet
    - Check for unreasonable power scaling
    - Generate refusal messages for invalid actions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 9.6 Write property tests for action validation
    - **Property 21: Invalid action rejection**
    - **Property 22: Action validation against Power_Sheet**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
  
  - [~] 9.7 Implement stat update logic
    - Create `lib/ai/stat-updater.ts`
    - Apply stat changes from turn resolution
    - Handle level-ups with perk generation
    - Handle status effects
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [~] 9.8 Create turn processing API route
    - Create `app/api/game/[gameId]/turn/route.ts`
    - Validate permissions (active player only)
    - Process action through DM
    - Update game state
    - Broadcast updates
    - Store turn and events
    - _Requirements: 6.3, 7.6_

- [ ] 10. Stats tracking and character death
  - [~] 10.1 Implement stats tracker
    - Create `lib/stats-tracker.ts`
    - Create stat snapshots after events
    - Track character progression history
    - _Requirements: 9.4_
  
  - [ ]* 10.2 Write property test for stat tracking
    - **Property 24: Stat updates are broadcast and stored**
    - **Validates: Requirements 9.3, 9.4, 11.4**
  
  - [~] 10.3 Implement character death handling
    - Detect HP reaching zero
    - Mark character as dead
    - Remove from turn order
    - Continue game with remaining players
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 10.4 Write property test for character death
    - **Property 23: Character death updates turn order**
    - **Validates: Requirements 10.1, 10.2, 10.3**
  
  - [~] 10.5 Create stats API routes
    - Create `app/api/characters/[characterId]/stats/route.ts`
    - Return current stats and history
    - _Requirements: 9.5_

- [~] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Security and permissions
  - [~] 12.1 Implement permission validation utilities
    - Create `lib/permissions.ts`
    - Validate host-only actions
    - Validate active-player-only actions
    - Validate general game state modifications
    - _Requirements: 13.1, 13.3_
  
  - [ ]* 12.2 Write property test for permissions
    - **Property 28: Permission validation for state modifications**
    - **Validates: Requirements 13.3**
  
  - [~] 12.3 Implement input sanitization
    - Create `lib/sanitize.ts`
    - Sanitize user inputs before AI prompts
    - Prevent prompt injection
    - _Requirements: 13.6_
  
  - [ ]* 12.4 Write property test for sanitization
    - **Property 30: Input sanitization prevents injection**
    - **Validates: Requirements 13.6**
  
  - [~] 12.5 Implement rate limiting for AI endpoints
    - Add rate limiting middleware
    - Track requests per user
    - Return rate limit errors
    - _Requirements: 13.4_
  
  - [ ]* 12.6 Write property test for AI rate limiting
    - **Property 29: AI endpoint rate limiting**
    - **Validates: Requirements 13.4**

- [ ] 13. Data persistence
  - [~] 13.1 Implement database utilities
    - Create Prisma client singleton
    - Add connection pooling configuration
    - Create transaction utilities
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [ ]* 13.2 Write property test for data persistence
    - **Property 34: Data persistence round-trip**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5, 15.6**

- [ ] 14. Dashboard and game list UI
  - [~] 14.1 Create dashboard page
    - Build `app/dashboard/page.tsx`
    - Fetch and display user's games
    - Show game status for each game
    - Add "Create Game" button
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [ ]* 14.2 Write property tests for dashboard
    - **Property 37: Dashboard displays all user games**
    - **Property 39: Dashboard displays user characters**
    - **Validates: Requirements 17.1, 17.2, 17.5**
  
  - [~] 14.3 Implement dashboard navigation
    - Navigate to lobby for lobby games
    - Navigate to game room for active games
    - Display character info for each game
    - _Requirements: 17.4, 17.5_
  
  - [ ]* 14.4 Write property test for dashboard navigation
    - **Property 38: Dashboard navigation based on game status**
    - **Validates: Requirements 17.4**

- [ ] 15. Game lobby UI
  - [~] 15.1 Create lobby page
    - Build `app/game/[gameId]/lobby/page.tsx`
    - Display invite link and code
    - Display roster with character creation status
    - Add "Start Game" button (host only)
    - _Requirements: 5.1, 5.2_
  
  - [~] 15.2 Implement real-time roster updates
    - Subscribe to player join/leave events
    - Update roster display in real-time
    - Show character creation status
    - _Requirements: 3.3, 5.2_
  
  - [~] 15.3 Implement game start validation
    - Disable start button if characters incomplete
    - Show validation errors
    - Navigate all players on start
    - _Requirements: 5.5, 5.6_

- [ ] 16. Game room UI
  - [~] 16.1 Create game room layout
    - Build `app/game/[gameId]/room/page.tsx`
    - Create left panel for narrative log
    - Create right panel for turn info
    - Create character cards section
    - _Requirements: 14.1, 14.2_
  
  - [~] 16.2 Implement narrative log component
    - Display DM narrative chronologically
    - Auto-scroll to latest
    - Show event types (narrative, action, stat change, death, level up)
    - _Requirements: 7.6_
  
  - [~] 16.3 Implement turn panel component
    - Show active player indicator
    - Display 4 A-D choices with descriptions
    - Show action input (active player only)
    - Show risk levels for choices
    - _Requirements: 6.6, 14.5, 14.6_
  
  - [ ]* 16.4 Write property tests for turn panel
    - **Property 32: Action input visibility restricted to active player**
    - **Property 33: Choice display completeness**
    - **Validates: Requirements 14.5, 14.6**
  
  - [~] 16.5 Implement character cards component
    - Display character image, name, HP, level
    - Show status effects
    - Click to view full Power Sheet
    - Show visual indicator for dead characters
    - _Requirements: 14.3, 14.4, 10.5_
  
  - [ ]* 16.6 Write property test for character cards
    - **Property 31: Character cards display complete information**
    - **Validates: Requirements 14.3**
  
  - [~] 16.7 Implement action submission
    - Handle choice selection (A-D)
    - Handle custom action input
    - Show loading state during resolution
    - Display validation errors
    - _Requirements: 6.3, 8.3_

- [~] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Responsive design and mobile optimization
  - [~] 18.1 Implement responsive layouts
    - Make dashboard responsive
    - Make lobby responsive
    - Make game room responsive (stacked panels on mobile)
    - _Requirements: 16.1, 16.2_
  
  - [ ]* 18.2 Write property test for responsive rendering
    - **Property 35: Responsive rendering across viewports**
    - **Validates: Requirements 16.1**
  
  - [~] 18.3 Optimize for mobile
    - Ensure character cards are readable on mobile
    - Make touch targets minimum 44x44px
    - Test on mobile devices
    - _Requirements: 16.3, 16.4_
  
  - [ ]* 18.4 Write property test for touch targets
    - **Property 36: Touch target minimum size on mobile**
    - **Validates: Requirements 16.4**

- [ ] 19. Game creation UI
  - [~] 19.1 Create game creation page
    - Build `app/game/create/page.tsx`
    - Form for name, max players, difficulty, tone tags, house rules
    - Validate inputs
    - Call game creation API
    - Navigate to lobby on success
    - _Requirements: 2.1, 2.4, 2.5_

- [ ] 20. Landing and marketing page
  - [~] 20.1 Create landing page
    - Build `app/page.tsx`
    - Add hero section with game description
    - Add features section
    - Add call-to-action (Sign Up / Sign In)
    - Make responsive
    - _Requirements: N/A (not in requirements but needed for complete app)_

- [ ] 21. Error handling and edge cases
  - [~] 21.1 Implement error boundaries
    - Create React error boundaries for major sections
    - Display user-friendly error messages
    - Log errors for debugging
    - _Requirements: N/A (general error handling)_
  
  - [~] 21.2 Implement API error handling
    - Standardize error response format
    - Handle AI API failures with retry
    - Handle database errors gracefully
    - Handle real-time connection errors
    - _Requirements: N/A (general error handling)_
  
  - [ ]* 21.3 Write unit tests for error scenarios
    - Test AI generation failures
    - Test database connection errors
    - Test invalid invite codes
    - Test permission violations
    - _Requirements: Various error conditions_

- [ ] 22. Environment configuration and documentation
  - [~] 22.1 Create environment variable documentation
    - Document all required variables
    - Provide example .env.example file
    - Document setup instructions
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [~] 22.2 Create README with setup instructions
    - Installation steps
    - Database setup
    - Environment configuration
    - Running the application
    - Testing instructions
    - _Requirements: N/A (documentation)_

- [ ] 23. Final integration and testing
  - [ ]* 23.1 Write integration tests
    - Test complete game creation flow
    - Test complete character creation flow
    - Test complete turn flow
    - Test multiplayer synchronization
    - _Requirements: All requirements_
  
  - [ ]* 23.2 Write end-to-end tests
    - Test full game from creation to completion
    - Test character death and game continuation
    - Test reconnection scenarios
    - _Requirements: All requirements_
  
  - [~] 23.3 Manual testing and polish
    - Test all flows manually
    - Fix any UI/UX issues
    - Optimize performance
    - Test on multiple browsers and devices
    - _Requirements: All requirements_

- [~] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout development
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration and E2E tests validate complete flows
- The implementation follows a bottom-up approach: infrastructure first, then core systems, then UI
- Real-time communication is integrated early to enable multiplayer features
- AI integration is implemented with proper error handling and retry logic
- Security and permissions are enforced throughout

# Implementation Plan: Game Enhancements

## Overview

This implementation plan breaks down the game enhancements into incremental coding tasks. The approach follows a component-by-component strategy, implementing core functionality first, then adding real-time features, and finally integrating external services. Each task builds on previous work, ensuring no orphaned code.

## Tasks

- [x] 1. Set up database schema and types
  - Create or update Supabase migrations for characters table with description length constraint
  - Create typing_status table for real-time typing indicators
  - Update game_sessions table with current_turn_player_id and turn_order columns
  - Define TypeScript interfaces for Character, GameSession, CharacterStats, and related types
  - _Requirements: 2.1, 2.2, 3.1, 10.1, 11.1, 12.1_

- [ ] 2. Implement authentication UI components
  - [x] 2.1 Create AuthButtons component with conditional login/logout rendering
    - Implement component that checks NextAuth session state
    - Render login button when session is null
    - Render logout button when session exists
    - Wire up NextAuth signIn() and signOut() methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 2.2 Write unit tests for AuthButtons component
    - Test login button renders when not authenticated
    - Test logout button renders when authenticated
    - Test button click handlers
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Implement character attribute generation service
  - [x] 3.1 Create AttributeGeneratorService with AI integration
    - Implement generateAttributes() method that calls AI API with character description
    - Parse AI response into abilities and weaknesses arrays
    - Implement generateFusionAttributes() for character fusion logic
    - Add error handling and retry logic (3 attempts)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 3.2 Write property test for attribute generation
    - **Property 1: Character Attribute Auto-Generation**
    - **Validates: Requirements 2.1, 2.2**
  
  - [ ]* 3.3 Write property test for fusion attributes
    - **Property 2: Fusion Attribute Derivation**
    - **Validates: Requirements 2.3**

- [ ] 4. Implement character creation form with auto-generation
  - [x] 4.1 Create CharacterCreationForm component
    - Implement description textarea with 1000 character limit
    - Add character counter display showing current/remaining characters
    - Remove manual input fields for abilities and weaknesses
    - Call AttributeGeneratorService when description is provided
    - Display generated abilities and weaknesses as read-only
    - Show loading state during AI generation
    - _Requirements: 2.1, 2.2, 2.4, 12.1, 12.2, 12.3, 12.4_
  
  - [ ]* 4.2 Write property test for description length enforcement
    - **Property 24: Description Length Enforcement**
    - **Validates: Requirements 12.1, 12.4**
  
  - [ ]* 4.3 Write property test for character counter display
    - **Property 25: Character Counter Display**
    - **Validates: Requirements 12.2**
  
  - [ ]* 4.4 Write unit tests for character creation form
    - Test character limit at boundary (exactly 1000 chars)
    - Test paste handling with oversized text
    - Test loading states during AI generation
    - _Requirements: 12.3_

- [ ] 5. Implement character summary and ready state
  - [x] 5.1 Create CharacterSummary component
    - Display complete character information (description, abilities, weaknesses, stats)
    - Add edit button that returns to CharacterCreationForm
    - Add "Ready" button that marks player as ready
    - Disable edit button when player is marked ready
    - Show ready state indicator
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.4_
  
  - [ ]* 5.2 Write property test for character summary completeness
    - **Property 3: Character Summary Completeness**
    - **Validates: Requirements 3.1**
  
  - [ ]* 5.3 Write property test for ready state disabling edits
    - **Property 5: Ready State Disables Editing**
    - **Validates: Requirements 4.4**
  
  - [ ]* 5.4 Write unit tests for character summary
    - Test edit button functionality
    - Test ready button marks player as ready
    - Test UI state when all players ready
    - _Requirements: 4.3_

- [ ] 6. Implement character edit persistence
  - [x] 6.1 Add character update mutations
    - Create Supabase mutation functions for updating character attributes
    - Implement optimistic updates for immediate UI feedback
    - Add real-time synchronization for character changes
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 6.2 Write property test for edit persistence
    - **Property 4: Edit Persistence Round-Trip**
    - **Validates: Requirements 3.4**

- [x] 7. Checkpoint - Ensure character creation flow works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement real-time subscription manager
  - [x] 8.1 Create RealtimeSubscriptionManager service
    - Implement subscribeToSession() with Supabase Realtime channels
    - Create session-specific channel naming (session:${sessionId})
    - Implement broadcastAction() for game state updates
    - Implement broadcastTypingStatus() with debounce logic
    - Add presence tracking for player join/leave events
    - Handle connection errors and automatic reconnection
    - _Requirements: 6.1, 6.2, 6.3, 11.1, 11.4_
  
  - [ ]* 8.2 Write property test for real-time update propagation
    - **Property 8: Real-Time Update Propagation**
    - **Validates: Requirements 6.1, 6.2**
  
  - [ ]* 8.3 Write property test for session event broadcasting
    - **Property 9: Session Event Broadcasting**
    - **Validates: Requirements 6.3**
  
  - [ ]* 8.4 Write property test for typing event broadcasting
    - **Property 21: Typing Event Broadcasting**
    - **Validates: Requirements 11.1**
  
  - [ ]* 8.5 Write unit tests for real-time manager
    - Test subscription setup and teardown
    - Test typing debounce (2 second timeout)
    - Test reconnection logic
    - _Requirements: 11.2_

- [ ] 9. Implement typing indicators
  - [x] 9.1 Create TypingIndicator component
    - Display "Player X is typing..." message
    - Add animated indicator (e.g., pulsing dots)
    - Position indicator next to player name or character
    - Hide when no players are typing
    - _Requirements: 11.2, 11.3_
  
  - [x] 9.2 Add typing event handlers to input fields
    - Detect typing start and broadcast to other players
    - Implement 2-second debounce for typing stop
    - Clear typing indicator on input submission
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [ ]* 9.3 Write property test for typing indicator display
    - **Property 22: Typing Indicator Display**
    - **Validates: Requirements 11.3**
  
  - [ ]* 9.4 Write property test for submit clearing indicator
    - **Property 23: Submit Clears Typing Indicator**
    - **Validates: Requirements 11.4**

- [ ] 10. Implement stats display component
  - [x] 10.1 Create StatsDisplay component
    - Render stat bars for all characters in session
    - Display health, energy, and other stats with visual bars
    - Add labels for each stat type and character name
    - Color-code bars based on stat levels (e.g., red for low health)
    - Make visible to all players
    - Subscribe to real-time stat updates
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 10.2 Write property test for stats display completeness
    - **Property 10: Stats Display Completeness**
    - **Validates: Requirements 7.1, 7.3, 7.4**
  
  - [ ]* 10.3 Write property test for stats update reactivity
    - **Property 11: Stats Update Reactivity**
    - **Validates: Requirements 7.2**

- [ ] 11. Implement ability summary component
  - [x] 11.1 Create AbilitySummary component
    - Display abilities for all characters in session
    - Group abilities by character
    - Make visible to all players
    - Subscribe to real-time ability updates
    - Format for readability
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 11.2 Write property test for ability summary visibility
    - **Property 12: Ability Summary Visibility**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ]* 11.3 Write property test for ability update reactivity
    - **Property 13: Ability Update Reactivity**
    - **Validates: Requirements 8.3**

- [ ] 12. Implement turn management system
  - [x] 12.1 Create TurnManager service
    - Maintain current active player state
    - Implement turn order logic
    - Provide methods to advance turn
    - Broadcast turn changes via real-time engine
    - _Requirements: 10.1, 10.3_
  
  - [x] 12.2 Create TurnIndicator component
    - Display prominent visual indicator for current turn
    - Highlight active player
    - Show turn order
    - Visually distinguish active player from others
    - Subscribe to turn change events
    - _Requirements: 10.2, 10.3, 10.4_
  
  - [ ]* 12.3 Write property test for turn state maintenance
    - **Property 17: Turn State Maintenance**
    - **Validates: Requirements 10.1**
  
  - [ ]* 12.4 Write property test for turn indicator display
    - **Property 18: Turn Indicator Display**
    - **Validates: Requirements 10.2**
  
  - [ ]* 12.5 Write property test for turn change reactivity
    - **Property 19: Turn Change Reactivity**
    - **Validates: Requirements 10.3**
  
  - [ ]* 12.6 Write property test for active player distinction
    - **Property 20: Active Player Visual Distinction**
    - **Validates: Requirements 10.4**

- [x] 13. Checkpoint - Ensure real-time features work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement AI move generation service
  - [x] 14.1 Create MoveGeneratorService
    - Implement generateMoves() method that calls AI API
    - Pass character and game context to AI
    - Parse response into 4 distinct move options
    - Label moves as A, B, C, D
    - Add timeout handling (3 seconds)
    - Provide fallback generic moves on failure
    - _Requirements: 9.1, 9.5_
  
  - [ ]* 14.2 Write property test for AI move generation count
    - **Property 14: AI Move Generation Count**
    - **Validates: Requirements 9.1**

- [ ] 15. Implement move selection interface
  - [x] 15.1 Create MoveSelector component
    - Display 4 AI-generated move options with A, B, C, D labels
    - Add custom move input field
    - Enable only during player's turn
    - Handle move selection (AI or custom)
    - Submit selected move to game system
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [ ]* 15.2 Write property test for move options display
    - **Property 15: Move Options Display**
    - **Validates: Requirements 9.2**
  
  - [ ]* 15.3 Write property test for move selection processing
    - **Property 16: Move Selection Processing**
    - **Validates: Requirements 9.4**

- [ ] 16. Implement enhanced character image display
  - [x] 16.1 Create CharacterImageViewer component
    - Render images at larger size (thumbnail mode)
    - Add click handler to open fullscreen modal
    - Implement modal with full-size image display
    - Add close button to modal
    - Maintain aspect ratios at all sizes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 16.2 Write property test for image click modal
    - **Property 6: Image Click Opens Modal**
    - **Validates: Requirements 5.2**
  
  - [ ]* 16.3 Write property test for aspect ratio preservation
    - **Property 7: Image Aspect Ratio Preservation**
    - **Validates: Requirements 5.4**

- [ ] 17. Implement dynamic image generation service
  - [x] 17.1 Create ImageGenerationService
    - Implement generateCharacterImage() that calls image generation API
    - Implement detectAppearanceChange() to scan narrative for appearance keywords
    - Implement regenerateImage() for appearance changes
    - Store generated images in Supabase Storage
    - Return public URLs for images
    - Add error handling with placeholder fallback
    - _Requirements: 14.1, 14.2, 14.3, 14.5_
  
  - [x] 17.2 Add appearance change detection to game loop
    - Monitor narrative updates for appearance keywords
    - Trigger image regeneration when changes detected
    - Update character record with new image URL
    - Broadcast image update to all players via real-time engine
    - _Requirements: 14.1, 14.4_
  
  - [ ]* 17.3 Write property test for appearance change detection
    - **Property 28: Appearance Change Detection**
    - **Validates: Requirements 14.1**
  
  - [ ]* 17.4 Write property test for image update propagation
    - **Property 29: Image Update Propagation**
    - **Validates: Requirements 14.2, 14.3, 14.4**

- [ ] 18. Implement Azure text-to-speech integration
  - [x] 18.1 Create TTSService with Azure Speech SDK
    - Initialize Azure Speech SDK with API key and region
    - Implement speak() method for text playback
    - Implement pause(), resume(), and stop() methods
    - Track playback state (isPlaying)
    - Handle Azure API errors gracefully
    - _Requirements: 13.1, 13.4_
  
  - [x] 18.2 Create TTS UI controls
    - Add enable/disable toggle for TTS
    - Add playback controls (pause, resume, stop)
    - Show playback state indicator
    - Position controls accessibly in gameplay interface
    - _Requirements: 13.2, 13.4_
  
  - [x] 18.3 Integrate TTS with story content
    - Detect new story content appearing in gameplay
    - Trigger TTS when enabled and new content appears
    - Stop playback when TTS is disabled
    - _Requirements: 13.3, 13.5_
  
  - [ ]* 18.4 Write property test for TTS content triggering
    - **Property 26: TTS Content Triggering**
    - **Validates: Requirements 13.3**
  
  - [ ]* 18.5 Write property test for TTS disable stops playback
    - **Property 27: TTS Disable Stops Playback**
    - **Validates: Requirements 13.5**

- [ ] 19. Wire all components into gameplay interface
  - [x] 19.1 Integrate all components into main gameplay page
    - Add AuthButtons to header/navigation
    - Add CharacterCreationForm and CharacterSummary to pre-game flow
    - Add StatsDisplay, AbilitySummary, TurnIndicator to gameplay view
    - Add MoveSelector for active player
    - Add CharacterImageViewer for all character images
    - Add TypingIndicator to appropriate locations
    - Add TTS controls to gameplay interface
    - Wire up all real-time subscriptions
    - _Requirements: All requirements_
  
  - [ ]* 19.2 Write integration tests for complete flows
    - Test character creation to ready state flow
    - Test turn-based gameplay with move selection
    - Test real-time updates across multiple simulated clients
    - Test image regeneration flow
    - Test TTS playback flow
    - _Requirements: All requirements_

- [x] 20. Final checkpoint - Ensure all features work together
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- External service integrations (AI, Azure TTS, Image Gen) require API keys in environment variables
- Real-time features require active Supabase connection
- Consider implementing feature flags for gradual rollout of enhancements

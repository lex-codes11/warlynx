# Implementation Plan: Cinematic UI Redesign

## Overview

This implementation plan transforms the Fusion RPG UI into a cinematic dark anime/Marvel combat console. The approach is incremental: create new components, integrate them alongside existing ones with a feature flag, test thoroughly, then complete the migration. All new components use TypeScript, Tailwind CSS, and framer-motion for animations.

## Tasks

- [x] 1. Setup and configuration
  - Extend Tailwind config with cinematic theme colors, shadows, and blur effects
  - Install and configure framer-motion if not already present
  - Create shared animation variants file for reusable motion presets
  - Create shared theme constants file for colors and effects
  - _Requirements: 1.1, 1.4, 7.6, 9.1_

- [ ] 2. Create AmbientBackground component
  - [x] 2.1 Implement AmbientBackground component with particle or nebula effects
    - Create component with canvas-based or CSS-based particle system
    - Use cinematic background color (#0B0B12)
    - Implement subtle motion with low opacity particles
    - Add intensity prop to control effect strength
    - _Requirements: 1.1, 1.2, 7.4_
  
  - [ ]* 2.2 Write unit tests for AmbientBackground
    - Test component renders without errors
    - Test intensity prop affects particle count or opacity
    - Test component handles missing props gracefully
    - _Requirements: 1.2_

- [ ] 3. Create BattleFeed component
  - [x] 3.1 Implement BattleFeed component structure
    - Create component with TypeScript interface for events
    - Implement full-width glass panel container with glow borders
    - Add cinematic spacing between events
    - Support different event types (narrative, action, ability, death)
    - _Requirements: 2.1, 2.6_
  
  - [x] 3.2 Implement ability highlight rendering
    - Add large typography for ability names (text-3xl or larger)
    - Create distinct visual treatment for ability events
    - Display icon badges when ability has icon property
    - _Requirements: 2.2, 2.4, 2.5_
  
  - [x] 3.3 Add framer-motion animations to BattleFeed
    - Implement fade-in and slide-up animations for new events
    - Add stagger effect for ability name character reveal
    - Configure smooth scroll behavior
    - _Requirements: 2.3_
  
  - [ ]* 3.4 Write property test for BattleFeed event rendering
    - **Property 3: Event rendering with full-width glass panel**
    - **Validates: Requirements 2.1**
  
  - [ ]* 3.5 Write property test for ability name typography
    - **Property 4: Ability name typography**
    - **Validates: Requirements 2.2**
  
  - [ ]* 3.6 Write property test for ability highlight distinction
    - **Property 23: Ability highlight distinction**
    - **Validates: Requirements 2.4**
  
  - [ ]* 3.7 Write property test for icon badge rendering
    - **Property 24: Icon badge rendering**
    - **Validates: Requirements 2.5**
  
  - [ ]* 3.8 Write property test for new content animation
    - **Property 22: New content animation**
    - **Validates: Requirements 2.3**
  
  - [ ]* 3.9 Write unit tests for BattleFeed edge cases
    - Test empty events array displays placeholder
    - Test missing character data handled gracefully
    - Test missing ability data displays as narrative event
    - _Requirements: 2.1, 2.2, 2.4_

- [ ] 4. Create PowerCard component
  - [x] 4.1 Implement PowerCard component structure
    - Create component with TypeScript interface for character data
    - Implement glass panel container with dynamic borders
    - Display character portrait in large format with glowing borders
    - Add overlay badges for HP, Level, and Status effects
    - Display fusion tags under character name when present
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  
  - [x] 4.2 Implement active state animations
    - Add pulse animation for active player
    - Add scale-105 transform for lift effect
    - Add continuous glow animation
    - _Requirements: 3.2_
  
  - [x] 4.3 Implement damage shake animation
    - Create shake keyframe animation with translateX oscillation
    - Trigger animation when onDamage callback is called
    - _Requirements: 3.6_
  
  - [ ]* 4.4 Write property test for character portrait with glow
    - **Property 5: Character portrait with glow**
    - **Validates: Requirements 3.1**
  
  - [ ]* 4.5 Write property test for stat badge completeness
    - **Property 6: Stat badge completeness**
    - **Validates: Requirements 3.3**
  
  - [ ]* 4.6 Write property test for fusion tag display
    - **Property 7: Fusion tag display**
    - **Validates: Requirements 3.4**
  
  - [ ]* 4.7 Write property test for active player animation
    - **Property 25: Active player animation**
    - **Validates: Requirements 3.2, 7.3**
  
  - [ ]* 4.8 Write unit test for damage shake animation
    - **Property 26: Damage shake animation**
    - **Validates: Requirements 3.6, 7.2**
  
  - [ ]* 4.9 Write unit tests for PowerCard edge cases
    - Test missing imageUrl displays placeholder
    - Test missing status effects renders empty container
    - Test missing fusionTags hides fusion tag section
    - _Requirements: 3.1, 3.3, 3.4_

- [ ] 5. Create ChoiceTile and DecisionTerminal components
  - [x] 5.1 Implement ChoiceTile component
    - Create component with letter, title, hint, icon, and onSelect props
    - Implement glass panel styling with hover glow effect
    - Add disabled state with opacity and grayscale
    - Add click animation (scale-98 feedback)
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 5.2 Implement DecisionTerminal component
    - Create component with characterName, isPlayerTurn, aiMoves, onMoveSelected props
    - Display header with "⚡ YOUR TURN — [CHARACTER NAME]" format
    - Render 4 ChoiceTile components in grid layout (2x2 desktop, 1 column mobile)
    - Add optional custom action input field below tiles
    - Implement stagger animation for tile fade-in
    - _Requirements: 4.1, 4.2, 4.4, 4.5_
  
  - [x] 5.3 Implement disabled state for DecisionTerminal
    - Disable all choice tiles when isPlayerTurn is false
    - Show waiting state message
    - _Requirements: 4.6_
  
  - [ ]* 5.4 Write property test for choice tile information completeness
    - **Property 8: Choice tile information completeness**
    - **Validates: Requirements 4.2**
  
  - [ ]* 5.5 Write property test for decision terminal header format
    - **Property 9: Decision terminal header format**
    - **Validates: Requirements 4.5**
  
  - [ ]* 5.6 Write property test for choice tile disabled state
    - **Property 10: Choice tile disabled state**
    - **Validates: Requirements 4.6**
  
  - [ ]* 5.7 Write unit tests for DecisionTerminal
    - Test component renders 4 choice tiles
    - Test custom action input is present
    - Test onMoveSelected called with correct move
    - Test disabled state when not player's turn
    - _Requirements: 4.1, 4.4, 4.6_

- [ ] 6. Create PowerHUD component
  - [x] 6.1 Implement PowerHUD component structure
    - Create component with character and visible props
    - Implement fixed bottom positioning with glass panel styling
    - Display HP bar with gradient fill (red-orange-yellow)
    - Display Level and Energy values
    - Display active buff and debuff icons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_
  
  - [x] 6.2 Implement HP bar animation
    - Add spring animation for HP drain effect (0.8s duration, easeOut)
    - Animate width change on HP value change
    - _Requirements: 5.5_
  
  - [x] 6.3 Add slide-in animation for PowerHUD
    - Implement translateY animation from bottom
    - Add gentle float animation for buff icons
    - _Requirements: 5.1_
  
  - [ ]* 6.4 Write property test for Power HUD stat display
    - **Property 11: Power HUD stat display**
    - **Validates: Requirements 5.2, 5.3, 5.4**
  
  - [ ]* 6.5 Write unit tests for PowerHUD
    - Test component renders at bottom of screen
    - Test HP bar displays correct percentage
    - Test Level and Energy are displayed
    - Test status effect icons are rendered
    - Test component hides when visible is false
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ]* 6.6 Write unit tests for PowerHUD edge cases
    - Test missing character data hides HUD
    - Test invalid HP values are clamped to 0-maxHp
    - _Requirements: 5.2_

- [ ] 7. Enhance TurnIndicator component
  - [x] 7.1 Update TurnIndicator with cinematic styling
    - Apply glass panel styling with neon glow
    - Display player avatars or character portraits
    - Highlight active player with ring and shadow
    - _Requirements: 6.2, 6.3, 6.4_
  
  - [x] 7.2 Implement turn change animations
    - Add flash effect overlay on turn change
    - Add continuous glow pulse for active player
    - Add smooth layout animations for player reordering
    - _Requirements: 6.1, 6.5_
  
  - [ ]* 7.3 Write property test for active player highlighting
    - **Property 12: Active player highlighting**
    - **Validates: Requirements 6.3**
  
  - [ ]* 7.4 Write property test for player avatar rendering
    - **Property 13: Player avatar rendering**
    - **Validates: Requirements 6.4**
  
  - [ ]* 7.5 Write unit test for turn change flash effect
    - **Property 27: Turn change flash effect**
    - **Validates: Requirements 6.1, 7.1**
  
  - [ ]* 7.6 Write unit tests for TurnIndicator
    - Test active player has different styling
    - Test all players have avatars rendered
    - Test turn change triggers flash effect
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 8. Checkpoint - Ensure all new components work independently
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Create shared property tests for consistency
  - [ ]* 9.1 Write property test for glass panel consistency
    - **Property 1: Glass panel consistency**
    - **Validates: Requirements 1.3, 3.5, 5.6, 6.2**
  
  - [ ]* 9.2 Write property test for neon glow color palette
    - **Property 2: Neon glow color palette**
    - **Validates: Requirements 1.4**
  
  - [ ]* 9.3 Write property test for interactive hover states
    - **Property 14: Interactive hover states**
    - **Validates: Requirements 7.5**
  
  - [ ]* 9.4 Write property test for framer-motion usage
    - **Property 28: Framer-motion usage**
    - **Validates: Requirements 7.6**

- [ ] 10. Create responsive design tests
  - [ ]* 10.1 Write property test for responsive layout adaptation
    - **Property 15: Responsive layout adaptation**
    - **Validates: Requirements 8.1, 8.2**
  
  - [ ]* 10.2 Write property test for responsive typography
    - **Property 16: Responsive typography**
    - **Validates: Requirements 8.3**
  
  - [ ]* 10.3 Write property test for touch target sizing
    - **Property 17: Touch target sizing**
    - **Validates: Requirements 8.4**

- [ ] 11. Integrate new components into EnhancedGameplayView
  - [x] 11.1 Add feature flag for cinematic UI
    - Create environment variable or config flag to toggle UI
    - Add conditional rendering logic in EnhancedGameplayView
    - _Requirements: 9.1, 10.6_
  
  - [x] 11.2 Replace story panel with BattleFeed
    - Conditionally render BattleFeed instead of existing story section
    - Pass game events to BattleFeed component
    - Maintain existing event handling logic
    - _Requirements: 10.1_
  
  - [x] 11.3 Replace character displays with PowerCard
    - Conditionally render PowerCard instead of CharacterImageViewer
    - Pass character data to PowerCard components
    - Wire up damage events to trigger shake animation
    - _Requirements: 10.2_
  
  - [x] 11.4 Replace MoveSelector with DecisionTerminal
    - Conditionally render DecisionTerminal instead of MoveSelector
    - Pass aiMoves and onMoveSelected to DecisionTerminal
    - Maintain existing move submission logic
    - _Requirements: 10.3_
  
  - [x] 11.5 Add PowerHUD to layout
    - Render PowerHUD at bottom of screen
    - Pass active player's character data to PowerHUD
    - Show/hide based on game state
    - _Requirements: 10.4_
  
  - [x] 11.6 Replace TurnIndicator with enhanced version
    - Conditionally render enhanced TurnIndicator
    - Pass currentPlayerId and players data
    - Wire up turn change events to trigger flash effect
    - _Requirements: 10.5_
  
  - [x] 11.7 Add AmbientBackground to layout
    - Render AmbientBackground as fixed background layer
    - Ensure it doesn't interfere with interactions
    - _Requirements: 1.2_
  
  - [ ]* 11.8 Write property test for API integration preservation
    - **Property 18: API integration preservation**
    - **Validates: Requirements 9.2**
  
  - [ ]* 11.9 Write property test for component prop compatibility
    - **Property 19: Component prop compatibility**
    - **Validates: Requirements 9.3**
  
  - [ ]* 11.10 Write property test for event handler preservation
    - **Property 20: Event handler preservation**
    - **Validates: Requirements 9.5**
  
  - [ ]* 11.11 Write integration tests for EnhancedGameplayView
    - Test all new components render together
    - Test data flows correctly from parent to children
    - Test event handlers propagate correctly
    - Test feature flag toggles between old and new UI
    - _Requirements: 9.2, 9.3, 9.5, 10.6_

- [x] 12. Checkpoint - Ensure integration works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Add error boundaries and error handling
  - [x] 13.1 Create error boundary component
    - Implement React error boundary with fallback UI
    - Add error logging
    - _Requirements: 9.2_
  
  - [x] 13.2 Wrap new components in error boundaries
    - Wrap BattleFeed, PowerCard, DecisionTerminal, PowerHUD, TurnIndicator
    - Ensure errors don't cascade to entire app
    - _Requirements: 9.2_
  
  - [ ]* 13.3 Write unit tests for error handling
    - Test components handle missing data gracefully
    - Test error boundaries catch component errors
    - Test fallback UI displays correctly
    - _Requirements: 9.2_

- [ ] 14. Implement accessibility features
  - [x] 14.1 Add ARIA labels to interactive elements
    - Add aria-label to ChoiceTile components
    - Add aria-live regions for turn changes
    - Add aria-describedby for stat displays
    - _Requirements: 8.1_
  
  - [x] 14.2 Implement keyboard navigation
    - Add keyboard shortcuts for choice selection (A, B, C, D keys)
    - Ensure all interactive elements are focusable
    - Add visible focus indicators
    - _Requirements: 8.1_
  
  - [x] 14.3 Add reduced motion support
    - Detect prefers-reduced-motion media query
    - Disable animations when reduced motion is preferred
    - Use instant transitions instead
    - _Requirements: 7.6_
  
  - [ ]* 14.4 Write accessibility tests
    - Test ARIA labels are present
    - Test keyboard navigation works
    - Test reduced motion preference is respected
    - _Requirements: 8.1_

- [ ] 15. Performance optimization
  - [x] 15.1 Optimize animations for performance
    - Use transform and opacity for animations (GPU-accelerated)
    - Add will-change sparingly
    - Implement IntersectionObserver for off-screen animations
    - _Requirements: 8.5_
  
  - [x] 15.2 Optimize mobile performance
    - Reduce particle count on mobile devices
    - Simplify glow effects on low-end devices
    - Use matchMedia to detect mobile viewport
    - _Requirements: 8.5_
  
  - [ ]* 15.3 Write performance tests
    - Measure component render times
    - Monitor animation frame rates (target 60fps)
    - Test with large numbers of events
    - Profile memory usage
    - _Requirements: 8.5_

- [ ] 16. Final checkpoint and documentation
  - [x] 16.1 Create migration guide
    - Document how to enable/disable cinematic UI
    - Document component API changes
    - Document breaking changes (if any)
    - _Requirements: 10.6_
  
  - [x] 16.2 Update component documentation
    - Add JSDoc comments to all new components
    - Document props and interfaces
    - Add usage examples
    - _Requirements: 9.1_
  
  - [x] 16.3 Final testing and validation
    - Run all unit tests
    - Run all property tests
    - Run integration tests
    - Test on multiple browsers and devices
    - _Requirements: All_

- [x] 17. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Feature flag allows safe rollout and easy rollback
- All new components maintain backward compatibility with existing game logic

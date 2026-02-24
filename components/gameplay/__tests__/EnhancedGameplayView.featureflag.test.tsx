/**
 * Feature Flag Tests for EnhancedGameplayView
 * Tests the cinematic UI feature flag toggle
 * Validates: Requirements 9.1, 10.6
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnhancedGameplayView } from '../EnhancedGameplayView';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock hooks
jest.mock('@/hooks/useTTSNarration', () => ({
  useTTSNarration: jest.fn(),
}));

jest.mock('@/hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({
    handleTypingStart: jest.fn(),
    handleTypingStop: jest.fn(),
  }),
}));

// Mock realtime
jest.mock('@/lib/realtime/subscription-manager', () => ({
  createSubscriptionManager: () => ({
    subscribeToSession: jest.fn(),
    unsubscribe: jest.fn(),
  }),
}));

jest.mock('@/lib/realtime/supabase', () => ({
  createRealtimeClient: () => null,
  subscribeToGame: () => ({
    unsubscribe: jest.fn(),
  }),
}));

// Mock cinematic components
jest.mock('@/components/cinematic/BattleFeed', () => ({
  BattleFeed: ({ events }: any) => <div data-testid="battle-feed">BattleFeed</div>,
}));

jest.mock('@/components/cinematic/PowerCard', () => ({
  PowerCard: ({ character, isActive }: any) => (
    <div data-testid={`power-card-${character.id}`}>PowerCard: {character.name}</div>
  ),
}));

jest.mock('@/components/cinematic/DecisionTerminal', () => ({
  DecisionTerminal: ({ characterName }: any) => (
    <div data-testid="decision-terminal">DecisionTerminal: {characterName}</div>
  ),
}));

jest.mock('@/components/cinematic/PowerHUD', () => ({
  PowerHUD: ({ character }: any) => (
    <div data-testid="power-hud">PowerHUD: {character.name}</div>
  ),
}));

jest.mock('@/components/cinematic/AmbientBackground', () => ({
  AmbientBackground: ({ intensity }: any) => (
    <div data-testid="ambient-background">AmbientBackground</div>
  ),
}));

// Mock other components to avoid test complexity
jest.mock('../StatsDisplay', () => ({
  StatsDisplay: () => <div data-testid="stats-display">StatsDisplay</div>,
}));

jest.mock('../AbilitySummaryContainer', () => ({
  AbilitySummaryContainer: () => <div data-testid="ability-summary">AbilitySummary</div>,
}));

jest.mock('../TTSControls', () => ({
  TTSControls: () => <div data-testid="tts-controls">TTSControls</div>,
}));

jest.mock('../MoveSelector', () => ({
  MoveSelector: () => <div data-testid="move-selector">MoveSelector</div>,
}));

jest.mock('@/components/character/CharacterImageViewer', () => ({
  CharacterImageViewer: () => <div data-testid="character-image-viewer">CharacterImageViewer</div>,
}));

jest.mock('@/components/realtime/TypingIndicator', () => ({
  TypingIndicator: () => <div data-testid="typing-indicator">TypingIndicator</div>,
}));

describe('EnhancedGameplayView - Feature Flag', () => {
  const mockGame = {
    id: 'game-1',
    events: [
      {
        id: 'event-1',
        type: 'narrative',
        content: 'The adventure begins...',
      },
    ],
    players: [
      {
        id: 'player-1',
        userId: 'user-1',
        user: {
          displayName: 'Player One',
          email: 'player1@example.com',
        },
        character: {
          id: 'char-1',
          name: 'Hero',
          hp: 100,
          maxHp: 100,
          level: 5,
        },
      },
    ],
    turnOrder: ['user-1'],
    currentTurnIndex: 0,
  };

  const defaultProps = {
    game: mockGame,
    userId: 'user-1',
    userCharacterId: 'char-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when NEXT_PUBLIC_ENABLE_CINEMATIC_UI is false', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_CINEMATIC_UI = 'false';
    });

    it('should render the default UI', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      // Default UI should have "Story" heading
      expect(screen.getByText('Story')).toBeInTheDocument();
      
      // Cinematic components should NOT be present
      expect(screen.queryByTestId('battle-feed')).not.toBeInTheDocument();
      expect(screen.queryByTestId('decision-terminal')).not.toBeInTheDocument();
      expect(screen.queryByTestId('power-hud')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ambient-background')).not.toBeInTheDocument();
    });

    it('should render CharacterImageViewer instead of PowerCard', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      // Should have "Characters" heading (default UI)
      expect(screen.getByText('Characters')).toBeInTheDocument();
      
      // PowerCard should NOT be present
      expect(screen.queryByTestId('power-card-char-1')).not.toBeInTheDocument();
    });
  });

  describe('when NEXT_PUBLIC_ENABLE_CINEMATIC_UI is true', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_CINEMATIC_UI = 'true';
    });

    it('should render the cinematic UI', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      // Cinematic components should be present
      expect(screen.getByTestId('battle-feed')).toBeInTheDocument();
      expect(screen.getByTestId('decision-terminal')).toBeInTheDocument();
      expect(screen.getByTestId('power-hud')).toBeInTheDocument();
      expect(screen.getByTestId('ambient-background')).toBeInTheDocument();
    });

    it('should render PowerCard for each character', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      // PowerCard should be present
      expect(screen.getByTestId('power-card-char-1')).toBeInTheDocument();
      expect(screen.getByText('PowerCard: Hero')).toBeInTheDocument();
    });

    it('should render DecisionTerminal with character name', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      expect(screen.getByTestId('decision-terminal')).toBeInTheDocument();
      expect(screen.getByText('DecisionTerminal: Hero')).toBeInTheDocument();
    });

    it('should render PowerHUD with active character', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      expect(screen.getByTestId('power-hud')).toBeInTheDocument();
      expect(screen.getByText('PowerHUD: Hero')).toBeInTheDocument();
    });

    it('should use cinematic background color', () => {
      const { container } = render(<EnhancedGameplayView {...defaultProps} />);

      // Check for cinematic background color class
      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveClass('bg-[#0B0B12]');
    });

    it('should NOT render default UI elements', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      // Default UI "Story" heading should NOT be present
      expect(screen.queryByText('Story')).not.toBeInTheDocument();
      
      // Default UI "Characters" heading should NOT be present
      expect(screen.queryByText('Characters')).not.toBeInTheDocument();
    });
  });

  describe('when NEXT_PUBLIC_ENABLE_CINEMATIC_UI is undefined', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_ENABLE_CINEMATIC_UI;
    });

    it('should default to the original UI', () => {
      render(<EnhancedGameplayView {...defaultProps} />);

      // Should render default UI
      expect(screen.getByText('Story')).toBeInTheDocument();
      
      // Cinematic components should NOT be present
      expect(screen.queryByTestId('battle-feed')).not.toBeInTheDocument();
    });
  });
});

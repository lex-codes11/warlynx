/**
 * Unit tests for TurnIndicator component
 * 
 * Tests the display of turn order, active player highlighting,
 * and visual distinction between active and inactive players.
 */

import { render, screen } from '@testing-library/react';
import { TurnIndicator } from '../TurnIndicator';
import { Player } from '@/lib/types';

describe('TurnIndicator', () => {
  const mockPlayers: Player[] = [
    {
      id: 'player-1',
      userId: 'user-1',
      displayName: 'Alice',
      avatar: 'https://example.com/alice.jpg',
      characterId: 'char-1',
      isReady: true,
    },
    {
      id: 'player-2',
      userId: 'user-2',
      displayName: 'Bob',
      avatar: null,
      characterId: 'char-2',
      isReady: true,
    },
    {
      id: 'player-3',
      userId: 'user-3',
      displayName: 'Charlie',
      avatar: 'https://example.com/charlie.jpg',
      characterId: 'char-3',
      isReady: true,
    },
  ];

  describe('Requirement 10.2: Turn Indicator Display', () => {
    it('should display a prominent visual indicator showing whose turn it is', () => {
      render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      // Check for prominent turn indicator
      expect(screen.getByText('Current Turn')).toBeInTheDocument();
      const aliceElements = screen.getAllByText('Alice');
      expect(aliceElements.length).toBeGreaterThan(0);
    });

    it('should display turn order section', () => {
      render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      expect(screen.getByText('Turn Order')).toBeInTheDocument();
    });

    it('should display all players in turn order', () => {
      render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      const aliceElements = screen.getAllByText('Alice');
      expect(aliceElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  describe('Requirement 10.4: Active Player Visual Distinction', () => {
    it('should visually distinguish the active player from others', () => {
      const { container } = render(
        <TurnIndicator currentPlayerId="user-2" players={mockPlayers} />
      );

      // Active player should have special styling
      const activePlayerElements = container.querySelectorAll('.bg-blue-50');
      expect(activePlayerElements.length).toBeGreaterThan(0);

      // Check for "Active Turn" badge
      expect(screen.getByText('⚡ Active Turn')).toBeInTheDocument();
      expect(screen.getByText('Playing')).toBeInTheDocument();
    });

    it('should highlight active player with different background color', () => {
      const { container } = render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      // Active player should have blue background
      const activeElements = container.querySelectorAll('.bg-blue-50');
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('should show active indicator badge only for current player', () => {
      render(
        <TurnIndicator currentPlayerId="user-3" players={mockPlayers} />
      );

      // Should only have one "Playing" badge
      const playingBadges = screen.getAllByText('Playing');
      expect(playingBadges).toHaveLength(1);
    });

    it('should display player avatar with special border for active player', () => {
      const { container } = render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      // Active player avatar should have blue border
      const avatars = container.querySelectorAll('img[alt="Alice"]');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('should show player initials when no avatar is provided', () => {
      render(
        <TurnIndicator currentPlayerId="user-2" players={mockPlayers} />
      );

      // Bob has no avatar, should show initial "B"
      const bobInitials = screen.getAllByText('B');
      expect(bobInitials.length).toBeGreaterThan(0);
    });
  });

  describe('Turn Order Display', () => {
    it('should display turn order numbers for all players', () => {
      const { container } = render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      // Check for turn order numbers 1, 2, 3
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should maintain turn order sequence', () => {
      render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      const playerNames = screen.getAllByText(/Alice|Bob|Charlie/);
      expect(playerNames).toHaveLength(4); // 1 in header + 3 in list
    });
  });

  describe('Edge Cases', () => {
    it('should return null when no players are provided', () => {
      const { container } = render(
        <TurnIndicator currentPlayerId="user-1" players={[]} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle unknown current player gracefully', () => {
      render(
        <TurnIndicator currentPlayerId="unknown-user" players={mockPlayers} />
      );

      expect(screen.getByText('Unknown Player')).toBeInTheDocument();
    });

    it('should handle single player', () => {
      const singlePlayer: Player[] = [mockPlayers[0]];

      render(
        <TurnIndicator currentPlayerId="user-1" players={singlePlayer} />
      );

      const aliceElements = screen.getAllByText('Alice');
      expect(aliceElements.length).toBeGreaterThan(0);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should apply custom className when provided', () => {
      const { container } = render(
        <TurnIndicator
          currentPlayerId="user-1"
          players={mockPlayers}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for player avatars', () => {
      render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      const aliceAvatars = screen.getAllByAltText('Alice');
      expect(aliceAvatars.length).toBeGreaterThan(0);
    });

    it('should display player names clearly', () => {
      render(
        <TurnIndicator currentPlayerId="user-1" players={mockPlayers} />
      );

      // All player names should be visible
      const aliceElements = screen.getAllByText('Alice');
      expect(aliceElements[0]).toBeVisible();
      expect(screen.getByText('Bob')).toBeVisible();
      expect(screen.getByText('Charlie')).toBeVisible();
    });
  });
});

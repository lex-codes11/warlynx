/**
 * Unit tests for StatsDisplay component
 * 
 * Tests Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { render, screen } from '@testing-library/react';
import { StatsDisplay } from '../StatsDisplay';
import { Character } from '@/lib/types';

describe('StatsDisplay', () => {
  const mockCharacter1: Character = {
    id: 'char-1',
    gameId: 'game-1',
    userId: 'user-1',
    name: 'Warrior',
    fusionIngredients: '',
    description: 'A brave warrior',
    abilities: ['Sword Strike', 'Shield Block'],
    weakness: 'Slow movement',
    alignment: 'good',
    archetype: 'fighter',
    tags: ['melee'],
    powerSheet: {
      level: 5,
      hp: 75,
      maxHp: 100,
      attributes: {
        strength: 18,
        agility: 12,
        intelligence: 10,
        charisma: 14,
        endurance: 16,
      },
      abilities: [],
      weakness: 'Slow movement',
      statuses: [],
      perks: [],
    },
    imageUrl: 'https://example.com/warrior.jpg',
    imagePrompt: 'A brave warrior',
    isReady: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCharacter2: Character = {
    id: 'char-2',
    gameId: 'game-1',
    userId: 'user-2',
    name: 'Mage',
    fusionIngredients: '',
    description: 'A powerful mage',
    abilities: ['Fireball', 'Ice Shield'],
    weakness: 'Low health',
    alignment: 'neutral',
    archetype: 'mage',
    tags: ['magic'],
    powerSheet: {
      level: 4,
      hp: 20,
      maxHp: 60,
      attributes: {
        strength: 8,
        agility: 10,
        intelligence: 20,
        charisma: 15,
        endurance: 9,
      },
      abilities: [],
      weakness: 'Low health',
      statuses: [
        {
          name: 'Burning',
          description: 'Taking fire damage',
          duration: 3,
          effect: 'damage',
        },
      ],
      perks: [],
    },
    imageUrl: 'https://example.com/mage.jpg',
    imagePrompt: 'A powerful mage',
    isReady: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Requirement 7.1: Render stat bars for all characters', () => {
    it('should render stat bars for all characters in session', () => {
      render(<StatsDisplay characters={[mockCharacter1, mockCharacter2]} />);

      // Check both characters are displayed
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();

      // Check health bars are displayed
      expect(screen.getAllByText('Health')).toHaveLength(2);
    });

    it('should display health with current and max values', () => {
      render(<StatsDisplay characters={[mockCharacter1]} />);

      // Check health display format
      expect(screen.getByText('75 / 100')).toBeInTheDocument();
    });

    it('should render nothing when no characters provided', () => {
      const { container } = render(<StatsDisplay characters={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Requirement 7.2: Real-time stat updates', () => {
    it('should update stat bars when character stats change', () => {
      const { rerender } = render(<StatsDisplay characters={[mockCharacter1]} />);

      // Initial health
      expect(screen.getByText('75 / 100')).toBeInTheDocument();

      // Update character health
      const updatedCharacter = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          hp: 50,
        },
      };

      rerender(<StatsDisplay characters={[updatedCharacter]} />);

      // Updated health should be displayed
      expect(screen.getByText('50 / 100')).toBeInTheDocument();
      expect(screen.queryByText('75 / 100')).not.toBeInTheDocument();
    });

    it('should update when new characters are added', () => {
      const { rerender } = render(<StatsDisplay characters={[mockCharacter1]} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.queryByText('Mage')).not.toBeInTheDocument();

      // Add second character
      rerender(<StatsDisplay characters={[mockCharacter1, mockCharacter2]} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();
    });
  });

  describe('Requirement 7.3: Visible to all players', () => {
    it('should display stats for all characters regardless of ownership', () => {
      // Both characters from different users should be visible
      render(<StatsDisplay characters={[mockCharacter1, mockCharacter2]} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();
    });
  });

  describe('Requirement 7.4: Label each stat type and character', () => {
    it('should display character names', () => {
      render(<StatsDisplay characters={[mockCharacter1, mockCharacter2]} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();
    });

    it('should label stat types', () => {
      render(<StatsDisplay characters={[mockCharacter1]} />);

      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Level')).toBeInTheDocument();
      expect(screen.getByText('Strength:')).toBeInTheDocument();
      expect(screen.getByText('Agility:')).toBeInTheDocument();
      expect(screen.getByText('Intelligence:')).toBeInTheDocument();
      expect(screen.getByText('Charisma:')).toBeInTheDocument();
      expect(screen.getByText('Endurance:')).toBeInTheDocument();
    });

    it('should display attribute values', () => {
      render(<StatsDisplay characters={[mockCharacter1]} />);

      expect(screen.getByText('18')).toBeInTheDocument(); // Strength
      expect(screen.getByText('12')).toBeInTheDocument(); // Agility
      expect(screen.getByText('10')).toBeInTheDocument(); // Intelligence
      expect(screen.getByText('14')).toBeInTheDocument(); // Charisma
      expect(screen.getByText('16')).toBeInTheDocument(); // Endurance
    });
  });

  describe('Color-coding based on stat levels', () => {
    it('should apply red color for low health (<=25%)', () => {
      const lowHealthCharacter = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          hp: 20,
          maxHp: 100,
        },
      };

      const { container } = render(<StatsDisplay characters={[lowHealthCharacter]} />);
      const healthBar = container.querySelector('.bg-red-600');
      expect(healthBar).toBeInTheDocument();
    });

    it('should apply orange color for medium-low health (26-50%)', () => {
      const mediumHealthCharacter = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          hp: 40,
          maxHp: 100,
        },
      };

      const { container } = render(<StatsDisplay characters={[mediumHealthCharacter]} />);
      const healthBar = container.querySelector('.bg-orange-500');
      expect(healthBar).toBeInTheDocument();
    });

    it('should apply yellow color for medium health (51-75%)', () => {
      const mediumHealthCharacter = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          hp: 60,
          maxHp: 100,
        },
      };

      const { container } = render(<StatsDisplay characters={[mediumHealthCharacter]} />);
      const healthBar = container.querySelector('.bg-yellow-500');
      expect(healthBar).toBeInTheDocument();
    });

    it('should apply green color for high health (>75%)', () => {
      const highHealthCharacter = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          hp: 90,
          maxHp: 100,
        },
      };

      const { container } = render(<StatsDisplay characters={[highHealthCharacter]} />);
      const healthBar = container.querySelector('.bg-green-600');
      expect(healthBar).toBeInTheDocument();
    });
  });

  describe('Active statuses display', () => {
    it('should display active status effects', () => {
      render(<StatsDisplay characters={[mockCharacter2]} />);

      expect(screen.getByText('Active Effects:')).toBeInTheDocument();
      expect(screen.getByText('Burning (3)')).toBeInTheDocument();
    });

    it('should not display status section when no active statuses', () => {
      render(<StatsDisplay characters={[mockCharacter1]} />);

      expect(screen.queryByText('Active Effects:')).not.toBeInTheDocument();
    });
  });

  describe('Character images', () => {
    it('should display character images', () => {
      render(<StatsDisplay characters={[mockCharacter1]} />);

      const image = screen.getByAltText('Warrior');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/warrior.jpg');
    });
  });

  describe('Level display', () => {
    it('should display character level', () => {
      render(<StatsDisplay characters={[mockCharacter1]} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});

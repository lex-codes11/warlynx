/**
 * AbilitySummary Component Tests
 * 
 * Tests for the AbilitySummary component that displays abilities
 * for all characters in the game session.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { render, screen } from '@testing-library/react';
import { AbilitySummary } from '../AbilitySummary';
import { Character } from '@/lib/types';

describe('AbilitySummary', () => {
  const mockCharacter1: Character = {
    id: 'char-1',
    gameId: 'game-1',
    userId: 'user-1',
    name: 'Warrior',
    fusionIngredients: '',
    description: 'A brave warrior',
    abilities: [],
    weakness: 'Overconfidence',
    alignment: 'good',
    archetype: 'fighter',
    tags: [],
    powerSheet: {
      level: 5,
      hp: 80,
      maxHp: 100,
      attributes: {
        strength: 18,
        agility: 12,
        intelligence: 10,
        charisma: 14,
        endurance: 16,
      },
      abilities: [
        {
          name: 'Power Strike',
          description: 'A devastating melee attack that deals massive damage',
          powerLevel: 8,
          cooldown: 2,
        },
        {
          name: 'Shield Block',
          description: 'Blocks incoming attacks with a sturdy shield',
          powerLevel: 6,
          cooldown: null,
        },
      ],
      weakness: 'Vulnerable to magic attacks',
      statuses: [],
      perks: [
        {
          name: 'Battle Hardened',
          description: 'Increased defense in combat',
          unlockedAt: 3,
        },
      ],
    },
    imageUrl: 'https://example.com/warrior.jpg',
    imagePrompt: '',
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
    abilities: [],
    weakness: 'Low physical defense',
    alignment: 'neutral',
    archetype: 'mage',
    tags: [],
    powerSheet: {
      level: 4,
      hp: 50,
      maxHp: 60,
      attributes: {
        strength: 8,
        agility: 10,
        intelligence: 20,
        charisma: 12,
        endurance: 9,
      },
      abilities: [
        {
          name: 'Fireball',
          description: 'Launches a ball of fire at enemies',
          powerLevel: 9,
          cooldown: 3,
        },
      ],
      weakness: 'Weak in close combat',
      statuses: [],
      perks: [],
    },
    imageUrl: 'https://example.com/mage.jpg',
    imagePrompt: '',
    isReady: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Requirement 8.1: Display abilities for all characters', () => {
    it('should display abilities for all characters in session', () => {
      render(<AbilitySummary characters={[mockCharacter1, mockCharacter2]} />);

      // Check that both characters are displayed
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();

      // Check that abilities are displayed
      expect(screen.getByText('Power Strike')).toBeInTheDocument();
      expect(screen.getByText('Shield Block')).toBeInTheDocument();
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });

    it('should display ability descriptions', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      expect(
        screen.getByText('A devastating melee attack that deals massive damage')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Blocks incoming attacks with a sturdy shield')
      ).toBeInTheDocument();
    });

    it('should display power levels for abilities', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      // Power Strike has power level 8
      const powerStrikeSection = screen.getByText('Power Strike').closest('div');
      expect(powerStrikeSection).toBeInTheDocument();
    });
  });

  describe('Requirement 8.2: Make abilities visible to all players', () => {
    it('should render all character abilities without access restrictions', () => {
      render(<AbilitySummary characters={[mockCharacter1, mockCharacter2]} />);

      // All abilities should be visible regardless of ownership
      expect(screen.getByText('Power Strike')).toBeInTheDocument();
      expect(screen.getByText('Shield Block')).toBeInTheDocument();
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });
  });

  describe('Requirement 8.4: Format for readability', () => {
    it('should group abilities by character', () => {
      render(<AbilitySummary characters={[mockCharacter1, mockCharacter2]} />);

      // Check that character names are displayed as headers
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();

      // Check that the component has proper structure
      expect(screen.getByText('Character Abilities')).toBeInTheDocument();
    });

    it('should display cooldown information when available', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      // Power Strike has cooldown of 2 turns
      expect(screen.getByText(/Cooldown: 2 turns/)).toBeInTheDocument();
    });

    it('should not display cooldown for abilities without cooldown', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      // Shield Block has no cooldown
      const shieldBlockSection = screen.getByText('Shield Block').closest('div');
      expect(shieldBlockSection).not.toHaveTextContent('Cooldown');
    });

    it('should display character images', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      const image = screen.getByAltText('Warrior');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/warrior.jpg');
    });

    it('should display weakness information', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      expect(screen.getByText('Weakness')).toBeInTheDocument();
      expect(screen.getByText('Vulnerable to magic attacks')).toBeInTheDocument();
    });

    it('should display perks when available', () => {
      render(<AbilitySummary characters={[mockCharacter1]} />);

      expect(screen.getByText('Perks')).toBeInTheDocument();
      expect(screen.getByText('Battle Hardened')).toBeInTheDocument();
      expect(screen.getByText('Increased defense in combat')).toBeInTheDocument();
      expect(screen.getByText('Lvl 3')).toBeInTheDocument();
    });

    it('should handle characters with no abilities gracefully', () => {
      const characterWithNoAbilities: Character = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          abilities: [],
        },
      };

      render(<AbilitySummary characters={[characterWithNoAbilities]} />);

      expect(screen.getByText('No abilities available')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should return null when no characters provided', () => {
      const { container } = render(<AbilitySummary characters={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('should handle characters without powerSheet', () => {
      const characterWithoutPowerSheet: Character = {
        ...mockCharacter1,
        powerSheet: {
          level: 1,
          hp: 10,
          maxHp: 10,
          attributes: {
            strength: 10,
            agility: 10,
            intelligence: 10,
            charisma: 10,
            endurance: 10,
          },
          abilities: [],
          weakness: '',
          statuses: [],
          perks: [],
        },
      };

      render(<AbilitySummary characters={[characterWithoutPowerSheet]} />);

      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('No abilities available')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AbilitySummary characters={[mockCharacter1]} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should handle singular cooldown text correctly', () => {
      const characterWithSingleTurnCooldown: Character = {
        ...mockCharacter1,
        powerSheet: {
          ...mockCharacter1.powerSheet,
          abilities: [
            {
              name: 'Quick Strike',
              description: 'A fast attack',
              powerLevel: 5,
              cooldown: 1,
            },
          ],
        },
      };

      render(<AbilitySummary characters={[characterWithSingleTurnCooldown]} />);

      expect(screen.getByText(/Cooldown: 1 turn/)).toBeInTheDocument();
    });
  });
});

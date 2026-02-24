/**
 * AbilitySummaryContainer Component Tests
 * 
 * Tests for the AbilitySummaryContainer component that provides
 * real-time ability updates.
 * 
 * Requirement: 8.3 (Real-time ability updates)
 */

import { render, screen, waitFor } from '@testing-library/react';
import { AbilitySummaryContainer } from '../AbilitySummaryContainer';
import { Character } from '@/lib/types';
import * as useCharacterSyncModule from '@/hooks/useCharacterSync';

// Mock the useCharacterList hook
jest.mock('@/hooks/useCharacterSync', () => ({
  useCharacterList: jest.fn(),
}));

describe('AbilitySummaryContainer', () => {
  const mockCharacter: Character = {
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
          description: 'A devastating melee attack',
          powerLevel: 8,
          cooldown: 2,
        },
      ],
      weakness: 'Vulnerable to magic',
      statuses: [],
      perks: [],
    },
    imageUrl: 'https://example.com/warrior.jpg',
    imagePrompt: '',
    isReady: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 8.3: Subscribe to real-time ability updates', () => {
    it('should subscribe to character updates on mount', () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      // Verify that useCharacterList was called with correct parameters
      expect(mockUseCharacterList).toHaveBeenCalledWith({
        gameId: 'game-1',
        initialCharacters: [mockCharacter],
      });
    });

    it('should display abilities from real-time updated characters', () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      // Verify that abilities are displayed
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Power Strike')).toBeInTheDocument();
    });

    it('should update display when characters change via real-time', async () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      
      // Initial render with one ability
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      const { rerender } = render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      expect(screen.getByText('Power Strike')).toBeInTheDocument();

      // Simulate real-time update with new ability
      const updatedCharacter: Character = {
        ...mockCharacter,
        powerSheet: {
          ...mockCharacter.powerSheet,
          abilities: [
            ...mockCharacter.powerSheet.abilities,
            {
              name: 'Shield Bash',
              description: 'Bash enemies with shield',
              powerLevel: 6,
              cooldown: 1,
            },
          ],
        },
      };

      mockUseCharacterList.mockReturnValue({
        characters: [updatedCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      rerender(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      // Verify new ability is displayed
      await waitFor(() => {
        expect(screen.getByText('Shield Bash')).toBeInTheDocument();
      });
    });

    it('should show reconnecting indicator when connection is lost', () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: false,
        error: null,
      });

      render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });

    it('should not show reconnecting indicator when connected', () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument();
    });

    it('should handle connection errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: false,
        error: 'Connection failed',
      });

      render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      // Verify error is logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Real-time connection error:',
        'Connection failed'
      );

      // Component should still render with available data
      expect(screen.getByText('Warrior')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should pass className to AbilitySummary', () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      const { container } = render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
          className="custom-class"
        />
      );

      // The className should be applied to the AbilitySummary component
      const abilitySummary = container.querySelector('.custom-class');
      expect(abilitySummary).toBeInTheDocument();
    });
  });

  describe('Integration with real-time system', () => {
    it('should handle multiple character updates', async () => {
      const mockUseCharacterList = jest.spyOn(useCharacterSyncModule, 'useCharacterList');
      
      const character2: Character = {
        ...mockCharacter,
        id: 'char-2',
        name: 'Mage',
        powerSheet: {
          ...mockCharacter.powerSheet,
          abilities: [
            {
              name: 'Fireball',
              description: 'Cast a fireball',
              powerLevel: 9,
              cooldown: 3,
            },
          ],
        },
      };

      mockUseCharacterList.mockReturnValue({
        characters: [mockCharacter, character2],
        setCharacters: jest.fn(),
        updateCharacter: jest.fn(),
        isConnected: true,
        error: null,
      });

      render(
        <AbilitySummaryContainer
          gameId="game-1"
          initialCharacters={[mockCharacter]}
        />
      );

      // Both characters should be displayed
      expect(screen.getByText('Warrior')).toBeInTheDocument();
      expect(screen.getByText('Mage')).toBeInTheDocument();
      expect(screen.getByText('Power Strike')).toBeInTheDocument();
      expect(screen.getByText('Fireball')).toBeInTheDocument();
    });
  });
});

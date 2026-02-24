/**
 * Unit tests for AttributeGeneratorService
 * Tests attribute generation, fusion logic, and error handling
 */

import { generateAttributes, generateFusionAttributes, resetOpenAIClient } from '../attribute-generator';
import { Character } from '@/types/game-enhancements';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('AttributeGeneratorService', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetOpenAIClient();
    
    // Setup OpenAI mock
    mockCreate = jest.fn();
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    } as any));
  });

  describe('generateAttributes', () => {
    it('should generate abilities and weaknesses from valid description', async () => {
      const mockResponse = {
        abilities: ['Stealth and lockpicking', 'Persuasive negotiation', 'Quick reflexes'],
        weaknesses: ['Haunted by past', 'Distrusts authority'],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      const result = await generateAttributes('A nimble thief with a silver tongue');

      expect(result.success).toBe(true);
      expect(result.abilities).toHaveLength(3);
      expect(result.weaknesses).toHaveLength(2);
      expect(result.abilities).toEqual(mockResponse.abilities);
      expect(result.weaknesses).toEqual(mockResponse.weaknesses);
    });

    it('should reject empty description', async () => {
      const result = await generateAttributes('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Description cannot be empty');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject description exceeding 1000 characters', async () => {
      const longDescription = 'a'.repeat(1001);
      const result = await generateAttributes(longDescription);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Description exceeds maximum length of 1000 characters');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should retry on API failure and eventually succeed', async () => {
      const mockResponse = {
        abilities: ['Fire magic', 'Ancient wisdom', 'Dragon flight'],
        weaknesses: ['Arrogant', 'Slow on ground'],
      };

      // First call fails, second succeeds
      mockCreate
        .mockRejectedValueOnce(new Error('API timeout'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        });

      const result = await generateAttributes('An ancient dragon');

      expect(result.success).toBe(true);
      expect(result.abilities).toEqual(mockResponse.abilities);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should fail after 3 retry attempts', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await generateAttributes('A mysterious wizard');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should validate response has correct number of abilities', async () => {
      const invalidResponse = {
        abilities: ['Only one ability'], // Too few
        weaknesses: ['Weakness 1', 'Weakness 2'],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generateAttributes('A character');

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have 3-6 abilities');
    });

    it('should validate response has correct number of weaknesses', async () => {
      const invalidResponse = {
        abilities: ['Ability 1', 'Ability 2', 'Ability 3'],
        weaknesses: ['Only one'], // Too few
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(invalidResponse),
            },
          },
        ],
      });

      const result = await generateAttributes('A character');

      expect(result.success).toBe(false);
      expect(result.error).toContain('must have 2-4 weaknesses');
    });

    it('should trim whitespace from abilities and weaknesses', async () => {
      const mockResponse = {
        abilities: ['  Stealth  ', ' Lockpicking ', 'Quick reflexes  '],
        weaknesses: [' Haunted  ', '  Distrusts  '],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      const result = await generateAttributes('A thief');

      expect(result.success).toBe(true);
      expect(result.abilities).toEqual(['Stealth', 'Lockpicking', 'Quick reflexes']);
      expect(result.weaknesses).toEqual(['Haunted', 'Distrusts']);
    });
  });

  describe('generateFusionAttributes', () => {
    const mockChar1: Character = {
      id: 'char1',
      gameId: 'game1',
      userId: 'user1',
      name: 'Fire Mage',
      fusionIngredients: 'Fire + Magic',
      description: 'A powerful fire mage',
      abilities: ['Fire magic', 'Spell casting', 'Elemental control'],
      weakness: 'Weak to water',
      alignment: 'neutral',
      archetype: 'mage',
      tags: ['fire', 'magic'],
      powerSheet: {} as any,
      imageUrl: 'http://example.com/image.png',
      imagePrompt: 'A fire mage',
      isReady: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockChar2: Character = {
      id: 'char2',
      gameId: 'game1',
      userId: 'user2',
      name: 'Ice Warrior',
      fusionIngredients: 'Ice + Warrior',
      description: 'A fierce ice warrior',
      abilities: ['Ice magic', 'Sword combat', 'Cold resistance'],
      weakness: 'Weak to fire',
      alignment: 'good',
      archetype: 'warrior',
      tags: ['ice', 'warrior'],
      powerSheet: {} as any,
      imageUrl: 'http://example.com/image2.png',
      imagePrompt: 'An ice warrior',
      isReady: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should generate fusion attributes from two characters', async () => {
      const mockResponse = {
        abilities: [
          'Steam magic fusion',
          'Elemental mastery',
          'Combat spellcasting',
          'Temperature control',
        ],
        weaknesses: ['Unstable fusion', 'Energy drain', 'Conflicting elements'],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      const result = await generateFusionAttributes(mockChar1, mockChar2);

      expect(result.success).toBe(true);
      expect(result.abilities).toHaveLength(4);
      expect(result.weaknesses).toHaveLength(3);
      expect(result.abilities).toEqual(mockResponse.abilities);
    });

    it('should reject fusion with missing character', async () => {
      const result = await generateFusionAttributes(mockChar1, null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Both characters are required for fusion');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject fusion with character missing abilities', async () => {
      const charWithoutAbilities = { ...mockChar1, abilities: [] };
      const result = await generateFusionAttributes(charWithoutAbilities, mockChar2);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Character 1 must have abilities');
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should retry on API failure for fusion', async () => {
      const mockResponse = {
        abilities: ['Fusion ability 1', 'Fusion ability 2', 'Fusion ability 3', 'Fusion ability 4'],
        weaknesses: ['Fusion weakness 1', 'Fusion weakness 2'],
      };

      mockCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponse),
              },
            },
          ],
        });

      const result = await generateFusionAttributes(mockChar1, mockChar2);

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('should fail fusion after 3 retry attempts', async () => {
      mockCreate.mockRejectedValue(new Error('Persistent API error'));

      const result = await generateFusionAttributes(mockChar1, mockChar2);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('should include both character contexts in fusion prompt', async () => {
      const mockResponse = {
        abilities: ['Ability 1', 'Ability 2', 'Ability 3', 'Ability 4'],
        weaknesses: ['Weakness 1', 'Weakness 2'],
      };

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      });

      await generateFusionAttributes(mockChar1, mockChar2);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Fire Mage'),
            }),
          ]),
        })
      );

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
      expect(userMessage.content).toContain('Ice Warrior');
      expect(userMessage.content).toContain('Fire magic');
      expect(userMessage.content).toContain('Ice magic');
    });
  });

  describe('Error handling', () => {
    it('should handle malformed JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Not valid JSON',
            },
          },
        ],
      });

      const result = await generateAttributes('A character');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing response content', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {},
          },
        ],
      });

      const result = await generateAttributes('A character');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty choices array', async () => {
      mockCreate.mockResolvedValue({
        choices: [],
      });

      const result = await generateAttributes('A character');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

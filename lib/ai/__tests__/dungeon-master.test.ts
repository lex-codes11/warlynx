/**
 * Unit tests for AI Dungeon Master prompt construction
 * Tests: Requirements 7.1, 7.2
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { fetchDMContext, buildDMPrompt, buildActionValidationPrompt, DMPromptContext } from '../dungeon-master';
import { prisma } from '../../prisma';
import { PowerSheet } from '../../turn-manager';

// Mock Prisma
jest.mock('../../prisma', () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('fetchDMContext', () => {
  const mockPowerSheet: PowerSheet = {
    level: 5,
    hp: 80,
    maxHp: 100,
    attributes: {
      strength: 60,
      agility: 50,
      intelligence: 70,
      charisma: 40,
      endurance: 55,
    },
    abilities: [
      {
        name: 'Fire Blast',
        description: 'Shoots a powerful fireball',
        powerLevel: 7,
        cooldown: 2,
      },
      {
        name: 'Quick Dodge',
        description: 'Evades incoming attacks',
        powerLevel: 4,
        cooldown: null,
      },
    ],
    weakness: 'Vulnerable to water attacks',
    statuses: [
      {
        name: 'Burning',
        description: 'Taking fire damage',
        duration: 2,
        effect: '-5 HP per turn',
      },
    ],
    perks: [
      {
        name: 'Fire Mastery',
        description: '+20% fire damage',
        unlockedAt: 3,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch complete DM context with all required fields', async () => {
    const mockGame = {
      id: 'game-1',
      status: 'active',
      toneTags: ['anime', 'action'],
      difficultyCurve: 'medium',
      houseRules: 'No instant kills',
      turnOrder: ['user-1', 'user-2'],
      currentTurnIndex: 0,
      players: [
        {
          userId: 'user-1',
          user: { id: 'user-1', displayName: 'Player One' },
          character: {
            id: 'char-1',
            name: 'Blazekin',
            fusionIngredients: 'Charizard + Ryu',
            description: 'A fire-breathing martial artist',
            powerSheet: mockPowerSheet,
          },
        },
        {
          userId: 'user-2',
          user: { id: 'user-2', displayName: 'Player Two' },
          character: {
            id: 'char-2',
            name: 'Aquaman Jr',
            fusionIngredients: 'Aquaman + Squirtle',
            description: 'A water-controlling hero',
            powerSheet: { ...mockPowerSheet, hp: 90 },
          },
        },
      ],
      events: [
        {
          type: 'action',
          content: 'Blazekin used Fire Blast',
          characterId: 'char-1',
          createdAt: new Date('2024-01-01T10:05:00Z'),
        },
        {
          type: 'narrative',
          content: 'The adventure begins in a dark forest',
          characterId: null,
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      turns: [
        {
          turnIndex: 0,
        },
      ],
    };

    mockedPrisma.game.findUnique.mockResolvedValue(mockGame as any);

    const context = await fetchDMContext('game-1');

    // Validate game settings
    expect(context.gameSettings).toEqual({
      toneTags: ['anime', 'action'],
      difficultyCurve: 'medium',
      houseRules: 'No instant kills',
    });

    // Validate active player
    expect(context.activePlayer).toEqual({
      id: 'user-1',
      displayName: 'Player One',
      character: {
        id: 'char-1',
        name: 'Blazekin',
        fusionIngredients: 'Charizard + Ryu',
        description: 'A fire-breathing martial artist',
        powerSheet: mockPowerSheet,
      },
    });

    // Validate all characters
    expect(context.allCharacters).toHaveLength(2);
    expect(context.allCharacters[0].name).toBe('Blazekin');
    expect(context.allCharacters[1].name).toBe('Aquaman Jr');

    // Validate recent events (should be in chronological order)
    expect(context.recentEvents).toHaveLength(2);
    expect(context.recentEvents[0].content).toBe('The adventure begins in a dark forest');
    expect(context.recentEvents[1].content).toBe('Blazekin used Fire Blast');

    // Validate current turn
    expect(context.currentTurn).toBe(1);
  });

  it('should throw error if game not found', async () => {
    mockedPrisma.game.findUnique.mockResolvedValue(null);

    await expect(fetchDMContext('invalid-game')).rejects.toThrow('GAME_NOT_FOUND');
  });

  it('should throw error if game is not active', async () => {
    const mockGame = {
      id: 'game-1',
      status: 'lobby',
      turnOrder: ['user-1'],
      currentTurnIndex: 0,
      players: [],
      events: [],
      turns: [],
    };

    mockedPrisma.game.findUnique.mockResolvedValue(mockGame as any);

    await expect(fetchDMContext('game-1')).rejects.toThrow('GAME_NOT_ACTIVE');
  });

  it('should throw error if turn order is empty', async () => {
    const mockGame = {
      id: 'game-1',
      status: 'active',
      turnOrder: [],
      currentTurnIndex: 0,
      players: [],
      events: [],
      turns: [],
    };

    mockedPrisma.game.findUnique.mockResolvedValue(mockGame as any);

    await expect(fetchDMContext('game-1')).rejects.toThrow('EMPTY_TURN_ORDER');
  });

  it('should throw error if active player not found', async () => {
    const mockGame = {
      id: 'game-1',
      status: 'active',
      turnOrder: ['user-1'],
      currentTurnIndex: 0,
      players: [],
      events: [],
      turns: [],
    };

    mockedPrisma.game.findUnique.mockResolvedValue(mockGame as any);

    await expect(fetchDMContext('game-1')).rejects.toThrow('ACTIVE_PLAYER_NOT_FOUND');
  });

  it('should handle game with no previous events', async () => {
    const mockGame = {
      id: 'game-1',
      status: 'active',
      toneTags: ['fantasy'],
      difficultyCurve: 'easy',
      houseRules: null,
      turnOrder: ['user-1'],
      currentTurnIndex: 0,
      players: [
        {
          userId: 'user-1',
          user: { id: 'user-1', displayName: 'Player One' },
          character: {
            id: 'char-1',
            name: 'Hero',
            fusionIngredients: 'Link + Cloud',
            description: 'A brave warrior',
            powerSheet: mockPowerSheet,
          },
        },
      ],
      events: [],
      turns: [],
    };

    mockedPrisma.game.findUnique.mockResolvedValue(mockGame as any);

    const context = await fetchDMContext('game-1');

    expect(context.recentEvents).toHaveLength(0);
    expect(context.currentTurn).toBe(1);
  });
});

describe('buildDMPrompt', () => {
  const mockContext: DMPromptContext = {
    gameSettings: {
      toneTags: ['anime', 'action'],
      difficultyCurve: 'medium',
      houseRules: 'No instant kills',
    },
    turnOrder: ['user-1', 'user-2'],
    activePlayer: {
      id: 'user-1',
      displayName: 'Player One',
      character: {
        id: 'char-1',
        name: 'Blazekin',
        fusionIngredients: 'Charizard + Ryu',
        description: 'A fire-breathing martial artist',
        powerSheet: {
          level: 5,
          hp: 80,
          maxHp: 100,
          attributes: {
            strength: 60,
            agility: 50,
            intelligence: 70,
            charisma: 40,
            endurance: 55,
          },
          abilities: [
            {
              name: 'Fire Blast',
              description: 'Shoots a powerful fireball',
              powerLevel: 7,
              cooldown: 2,
            },
          ],
          weakness: 'Vulnerable to water attacks',
          statuses: [],
          perks: [],
        },
      },
    },
    allCharacters: [
      {
        id: 'char-1',
        name: 'Blazekin',
        fusionIngredients: 'Charizard + Ryu',
        powerSheet: {
          level: 5,
          hp: 80,
          maxHp: 100,
          attributes: {
            strength: 60,
            agility: 50,
            intelligence: 70,
            charisma: 40,
            endurance: 55,
          },
          abilities: [
            {
              name: 'Fire Blast',
              description: 'Shoots a powerful fireball',
              powerLevel: 7,
              cooldown: 2,
            },
          ],
          weakness: 'Vulnerable to water attacks',
          statuses: [],
          perks: [],
        },
        userId: 'user-1',
        displayName: 'Player One',
      },
    ],
    recentEvents: [
      {
        type: 'narrative',
        content: 'The adventure begins',
        characterId: null,
        createdAt: new Date(),
      },
    ],
    currentTurn: 1,
  };

  it('should include all game settings in prompt', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('Tone Tags: anime, action');
    expect(prompt).toContain('Difficulty: medium');
    expect(prompt).toContain('House Rules: No instant kills');
  });

  it('should include active player information', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('Active Player: Player One playing as Blazekin');
    expect(prompt).toContain('Fusion: Charizard + Ryu');
    expect(prompt).toContain('Description: A fire-breathing martial artist');
  });

  it('should include active player Power Sheet', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('ACTIVE PLAYER\'S POWER SHEET:');
    expect(prompt).toContain('Level: 5');
    expect(prompt).toContain('HP: 80/100');
    expect(prompt).toContain('Strength: 60');
    expect(prompt).toContain('Fire Blast (Power Level: 7)');
    expect(prompt).toContain('Weakness: Vulnerable to water attacks');
  });

  it('should include all characters in the game', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('ALL CHARACTERS IN THE GAME:');
    expect(prompt).toContain('Blazekin (Player One)');
  });

  it('should include recent events', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('RECENT EVENTS:');
    expect(prompt).toContain('[narrative] The adventure begins');
  });

  it('should handle no recent events', () => {
    const contextWithNoEvents = {
      ...mockContext,
      recentEvents: [],
    };

    const prompt = buildDMPrompt(contextWithNoEvents);

    expect(prompt).toContain('No previous events - this is the beginning of the adventure');
  });

  it('should include custom action validation instructions when provided', () => {
    const customAction = 'I summon a meteor from space';
    const prompt = buildDMPrompt(mockContext, customAction);

    expect(prompt).toContain('PLAYER\'S CUSTOM ACTION:');
    expect(prompt).toContain(customAction);
    expect(prompt).toContain('validate if this action is within the active player\'s Power Sheet');
  });

  it('should include JSON response format', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('"valid": true');
    expect(prompt).toContain('"narrative"');
    expect(prompt).toContain('"choices"');
    expect(prompt).toContain('"statUpdates"');
    expect(prompt).toContain('"validationError"');
  });

  it('should include critical rules', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('ALWAYS generate exactly 4 choices labeled A, B, C, D');
    expect(prompt).toContain('NEVER allow actions outside the active player\'s Power Sheet');
    expect(prompt).toContain('NEVER provide plot armor');
    expect(prompt).toContain('characters can die if HP reaches 0');
  });

  it('should format Power Sheet with statuses and perks', () => {
    const contextWithStatusesAndPerks: DMPromptContext = {
      ...mockContext,
      activePlayer: {
        ...mockContext.activePlayer,
        character: {
          ...mockContext.activePlayer.character,
          powerSheet: {
            ...mockContext.activePlayer.character.powerSheet,
            statuses: [
              {
                name: 'Burning',
                description: 'Taking fire damage',
                duration: 2,
                effect: '-5 HP per turn',
              },
            ],
            perks: [
              {
                name: 'Fire Mastery',
                description: '+20% fire damage',
                unlockedAt: 3,
              },
            ],
          },
        },
      },
    };

    const prompt = buildDMPrompt(contextWithStatusesAndPerks);

    expect(prompt).toContain('Active Statuses:');
    expect(prompt).toContain('Burning: Taking fire damage (2 turns remaining)');
    expect(prompt).toContain('Perks:');
    expect(prompt).toContain('Fire Mastery: +20% fire damage');
  });

  it('should mark dead characters in all characters list', () => {
    const contextWithDeadCharacter: DMPromptContext = {
      ...mockContext,
      allCharacters: [
        ...mockContext.allCharacters,
        {
          id: 'char-2',
          name: 'Dead Hero',
          fusionIngredients: 'Someone + Someone',
          powerSheet: {
            ...mockContext.allCharacters[0].powerSheet,
            hp: 0,
          },
          userId: 'user-2',
          displayName: 'Player Two',
        },
      ],
    };

    const prompt = buildDMPrompt(contextWithDeadCharacter);

    expect(prompt).toContain('Dead Hero (Player Two) [DEAD]');
  });

  it('should include turn number', () => {
    const prompt = buildDMPrompt(mockContext);

    expect(prompt).toContain('Turn: 1');
  });

  it('should handle null house rules', () => {
    const contextWithoutHouseRules = {
      ...mockContext,
      gameSettings: {
        ...mockContext.gameSettings,
        houseRules: null,
      },
    };

    const prompt = buildDMPrompt(contextWithoutHouseRules);

    expect(prompt).not.toContain('House Rules:');
  });
});

describe('buildActionValidationPrompt', () => {
  const mockPowerSheet: PowerSheet = {
    level: 5,
    hp: 80,
    maxHp: 100,
    attributes: {
      strength: 60,
      agility: 50,
      intelligence: 70,
      charisma: 40,
      endurance: 55,
    },
    abilities: [
      {
        name: 'Fire Blast',
        description: 'Shoots a powerful fireball',
        powerLevel: 7,
        cooldown: 2,
      },
      {
        name: 'Quick Dodge',
        description: 'Evades incoming attacks',
        powerLevel: 4,
        cooldown: null,
      },
    ],
    weakness: 'Vulnerable to water attacks',
    statuses: [
      {
        name: 'Stunned',
        description: 'Cannot act',
        duration: 1,
        effect: 'Skip turn',
      },
    ],
    perks: [],
  };

  it('should include character name and action', () => {
    const action = 'I use Fire Blast on the enemy';
    const prompt = buildActionValidationPrompt(action, mockPowerSheet, 'Blazekin');

    expect(prompt).toContain('CHARACTER: Blazekin');
    expect(prompt).toContain('ACTION: "I use Fire Blast on the enemy"');
  });

  it('should include Power Sheet details', () => {
    const action = 'I attack';
    const prompt = buildActionValidationPrompt(action, mockPowerSheet, 'Hero');

    expect(prompt).toContain('Level: 5');
    expect(prompt).toContain('HP: 80/100');
    expect(prompt).toContain('Strength 60');
    expect(prompt).toContain('Fire Blast (Power 7)');
    expect(prompt).toContain('Weakness: Vulnerable to water attacks');
  });

  it('should include active statuses', () => {
    const action = 'I move';
    const prompt = buildActionValidationPrompt(action, mockPowerSheet, 'Hero');

    expect(prompt).toContain('Active Statuses: Stunned');
  });

  it('should include validation questions', () => {
    const action = 'I summon a dragon';
    const prompt = buildActionValidationPrompt(action, mockPowerSheet, 'Hero');

    expect(prompt).toContain('Is this action within the character\'s abilities?');
    expect(prompt).toContain('Is the power scaling reasonable');
    expect(prompt).toContain('Are there any weaknesses or statuses that would prevent this action?');
    expect(prompt).toContain('What are the likely consequences');
  });

  it('should specify JSON response format', () => {
    const action = 'I do something';
    const prompt = buildActionValidationPrompt(action, mockPowerSheet, 'Hero');

    expect(prompt).toContain('"valid": true | false');
    expect(prompt).toContain('"reason"');
    expect(prompt).toContain('"suggestedAlternatives"');
  });

  it('should handle Power Sheet with no statuses', () => {
    const powerSheetNoStatuses = {
      ...mockPowerSheet,
      statuses: [],
    };

    const action = 'I attack';
    const prompt = buildActionValidationPrompt(action, powerSheetNoStatuses, 'Hero');

    expect(prompt).not.toContain('Active Statuses:');
  });
});

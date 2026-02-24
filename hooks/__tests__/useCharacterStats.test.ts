/**
 * Unit tests for useCharacterStats hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCharacterStats } from '../useCharacterStats';
import { useRealtimeGame } from '../useRealtimeGame';

// Mock the useRealtimeGame hook
jest.mock('../useRealtimeGame');

// Mock fetch
global.fetch = jest.fn();

describe('useCharacterStats', () => {
  const mockGameId = 'game-123';
  const mockCharacterId = 'char-1';
  const mockCharacterData = {
    id: mockCharacterId,
    gameId: mockGameId,
    userId: 'user-1',
    name: 'Test Character',
    fusionIngredients: 'Goku + Pikachu',
    description: 'A powerful fusion',
    imageUrl: 'https://example.com/image.png',
    powerSheet: {
      level: 1,
      hp: 100,
      maxHp: 100,
      attributes: {
        strength: 50,
        agility: 60,
        intelligence: 40,
        charisma: 30,
        endurance: 70,
      },
      abilities: [
        {
          name: 'Thunder Punch',
          description: 'Electric punch',
          powerLevel: 7,
          cooldown: null,
        },
      ],
      weakness: 'Water attacks',
      statuses: [],
      perks: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCharactersData = {
    characters: [
      mockCharacterData,
      {
        id: 'char-2',
        gameId: mockGameId,
        userId: 'user-2',
        name: 'Another Character',
        fusionIngredients: 'Naruto + Charizard',
        description: 'Another fusion',
        imageUrl: 'https://example.com/image2.png',
        powerSheet: {
          level: 1,
          hp: 90,
          maxHp: 90,
          attributes: {
            strength: 70,
            agility: 50,
            intelligence: 60,
            charisma: 40,
            endurance: 30,
          },
          abilities: [],
          weakness: 'Ice attacks',
          statuses: [],
          perks: [],
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useRealtimeGame to return connected state
    (useRealtimeGame as jest.Mock).mockReturnValue({
      isConnected: true,
      reconnect: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch all characters for a game', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(`/api/games/${mockGameId}/characters`);
    expect(result.current.characters.size).toBe(2);
    expect(result.current.getCharacter('char-1')?.name).toBe('Test Character');
    expect(result.current.getCharacter('char-2')?.name).toBe('Another Character');
  });

  it('should fetch a specific character when characterId is provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharacterData,
    });

    const { result } = renderHook(() => 
      useCharacterStats({ gameId: mockGameId, characterId: mockCharacterId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(`/api/characters/${mockCharacterId}`);
    expect(result.current.characters.size).toBe(1);
    expect(result.current.getCharacter(mockCharacterId)?.name).toBe('Test Character');
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValue(mockError);

    const onError = jest.fn();
    const { result } = renderHook(() => 
      useCharacterStats({ gameId: mockGameId, onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should not fetch when enabled is false', async () => {
    renderHook(() => 
      useCharacterStats({ gameId: mockGameId, enabled: false })
    );

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('should subscribe to real-time updates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(useRealtimeGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: mockGameId,
        enabled: true,
      })
    );
  });

  it('should handle character updated event', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    let onCharacterUpdated: ((character: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onCharacterUpdated = options.onCharacterUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate character update
    const updatedCharacter = {
      ...mockCharacterData,
      name: 'Updated Character',
      powerSheet: {
        ...mockCharacterData.powerSheet,
        level: 2,
      },
    };
    onCharacterUpdated?.(updatedCharacter);

    await waitFor(() => {
      const character = result.current.getCharacter(mockCharacterId);
      expect(character?.name).toBe('Updated Character');
      expect(character?.powerSheet.level).toBe(2);
    });
  });

  it('should handle stats updated event', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    let onStatsUpdated: ((update: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onStatsUpdated = options.onStatsUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialHp = result.current.getCharacter(mockCharacterId)?.powerSheet.hp;
    expect(initialHp).toBe(100);

    // Simulate stat update
    const statUpdate = {
      characterId: mockCharacterId,
      changes: {
        hp: 80,
        level: 2,
      },
    };
    onStatsUpdated?.(statUpdate);

    await waitFor(() => {
      const character = result.current.getCharacter(mockCharacterId);
      expect(character?.powerSheet.hp).toBe(80);
      expect(character?.powerSheet.level).toBe(2);
    });
  });

  it('should handle attribute updates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    let onStatsUpdated: ((update: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onStatsUpdated = options.onStatsUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate attribute update
    const statUpdate = {
      characterId: mockCharacterId,
      changes: {
        attributes: {
          strength: 60,
          agility: 70,
        },
      },
    };
    onStatsUpdated?.(statUpdate);

    await waitFor(() => {
      const character = result.current.getCharacter(mockCharacterId);
      expect(character?.powerSheet.attributes.strength).toBe(60);
      expect(character?.powerSheet.attributes.agility).toBe(70);
      // Other attributes should remain unchanged
      expect(character?.powerSheet.attributes.intelligence).toBe(40);
    });
  });

  it('should handle status updates', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    let onStatsUpdated: ((update: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onStatsUpdated = options.onStatsUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate status update
    const newStatuses = [
      {
        name: 'Poisoned',
        description: 'Taking damage over time',
        duration: 3,
        effect: '-5 HP per turn',
      },
    ];
    const statUpdate = {
      characterId: mockCharacterId,
      changes: {
        statuses: newStatuses,
      },
    };
    onStatsUpdated?.(statUpdate);

    await waitFor(() => {
      const character = result.current.getCharacter(mockCharacterId);
      expect(character?.powerSheet.statuses).toEqual(newStatuses);
    });
  });

  it('should handle new perks', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    let onStatsUpdated: ((update: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onStatsUpdated = options.onStatsUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.getCharacter(mockCharacterId)?.powerSheet.perks).toHaveLength(0);

    // Simulate new perk
    const newPerks = [
      {
        name: 'Lightning Reflexes',
        description: '+10 agility',
        unlockedAt: 2,
      },
    ];
    const statUpdate = {
      characterId: mockCharacterId,
      changes: {
        newPerks,
      },
    };
    onStatsUpdated?.(statUpdate);

    await waitFor(() => {
      const character = result.current.getCharacter(mockCharacterId);
      expect(character?.powerSheet.perks).toHaveLength(1);
      expect(character?.powerSheet.perks[0].name).toBe('Lightning Reflexes');
    });
  });

  it('should ignore stat updates for unknown characters', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    let onStatsUpdated: ((update: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onStatsUpdated = options.onStatsUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialSize = result.current.characters.size;

    // Simulate stat update for unknown character
    const statUpdate = {
      characterId: 'unknown-char',
      changes: {
        hp: 50,
      },
    };
    onStatsUpdated?.(statUpdate);

    await waitFor(() => {
      expect(result.current.characters.size).toBe(initialSize);
    });
  });

  it('should provide refetch function', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call refetch
    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should expose connection state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should provide reconnect function', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCharactersData,
    });

    const mockReconnect = jest.fn();
    (useRealtimeGame as jest.Mock).mockReturnValue({
      isConnected: false,
      reconnect: mockReconnect,
    });

    const { result } = renderHook(() => useCharacterStats({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.reconnect();

    expect(mockReconnect).toHaveBeenCalled();
  });
});

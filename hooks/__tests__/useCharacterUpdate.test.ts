/**
 * Character Update Hook Tests
 * 
 * Tests for useCharacterUpdate and useCharacterUpdateOptimistic hooks.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCharacterUpdate, useCharacterUpdateOptimistic } from '../useCharacterUpdate';
import type { Character } from '@/types/game-enhancements';

// Mock fetch
global.fetch = jest.fn();

describe('useCharacterUpdate', () => {
  const mockCharacter: Character = {
    id: 'char-123',
    gameId: 'game-123',
    userId: 'user-123',
    name: 'Test Character',
    fusionIngredients: '',
    description: 'A test character',
    abilities: ['Ability 1'],
    weakness: 'Test weakness',
    alignment: null,
    archetype: null,
    tags: [],
    powerSheet: {
      level: 1,
      hp: 100,
      maxHp: 100,
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        charisma: 10,
        endurance: 10,
      },
      abilities: [],
      weakness: 'Test weakness',
      statuses: [],
      perks: [],
    },
    imageUrl: '',
    imagePrompt: '',
    isReady: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update character successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, character: mockCharacter }),
    });

    const { result } = renderHook(() => useCharacterUpdate());

    let updatedCharacter: Character | undefined;

    await act(async () => {
      updatedCharacter = await result.current.updateCharacter({
        characterId: 'char-123',
        updates: { description: 'New description' },
      });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/characters/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: 'char-123',
        updates: { description: 'New description' },
      }),
    });

    expect(updatedCharacter).toEqual(mockCharacter);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle update errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    });

    const { result } = renderHook(() => useCharacterUpdate());

    await act(async () => {
      try {
        await result.current.updateCharacter({
          characterId: 'char-123',
          updates: { description: 'New description' },
        });
      } catch (err) {
        // Expected error
      }
    });

    expect(result.current.error).toBe('Update failed');
    expect(result.current.isUpdating).toBe(false);
  });

  it('should clear error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    });

    const { result } = renderHook(() => useCharacterUpdate());

    await act(async () => {
      try {
        await result.current.updateCharacter({
          characterId: 'char-123',
          updates: { description: 'New description' },
        });
      } catch (err) {
        // Expected error
      }
    });

    expect(result.current.error).toBe('Update failed');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should set isUpdating during update', async () => {
    let resolveUpdate: (value: any) => void;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValueOnce(
      updatePromise.then(() => ({
        ok: true,
        json: async () => ({ success: true, character: mockCharacter }),
      }))
    );

    const { result } = renderHook(() => useCharacterUpdate());

    act(() => {
      result.current.updateCharacter({
        characterId: 'char-123',
        updates: { description: 'New description' },
      });
    });

    // Should be updating
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(true);
    });

    // Resolve the update
    act(() => {
      resolveUpdate!(null);
    });

    // Should finish updating
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });
});

describe('useCharacterUpdateOptimistic', () => {
  const mockCharacter: Character = {
    id: 'char-123',
    gameId: 'game-123',
    userId: 'user-123',
    name: 'Test Character',
    fusionIngredients: '',
    description: 'Original description',
    abilities: ['Ability 1'],
    weakness: 'Test weakness',
    alignment: null,
    archetype: null,
    tags: [],
    powerSheet: {
      level: 1,
      hp: 100,
      maxHp: 100,
      attributes: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        charisma: 10,
        endurance: 10,
      },
      abilities: [],
      weakness: 'Test weakness',
      statuses: [],
      perks: [],
    },
    imageUrl: '',
    imagePrompt: '',
    isReady: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should optimistically update character', async () => {
    const onUpdate = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        character: { ...mockCharacter, description: 'New description' },
      }),
    });

    const { result } = renderHook(() =>
      useCharacterUpdateOptimistic(mockCharacter, onUpdate)
    );

    await act(async () => {
      await result.current.updateCharacterOptimistic({
        description: 'New description',
      });
    });

    // Should call onUpdate twice: once optimistically, once with server response
    expect(onUpdate).toHaveBeenCalledTimes(2);

    // First call: optimistic update
    expect(onUpdate).toHaveBeenNthCalledWith(1, {
      ...mockCharacter,
      description: 'New description',
      updatedAt: expect.any(Date),
    });

    // Second call: server response
    expect(onUpdate).toHaveBeenNthCalledWith(2, {
      ...mockCharacter,
      description: 'New description',
    });
  });

  it('should rollback on error', async () => {
    const onUpdate = jest.fn();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    });

    const { result } = renderHook(() =>
      useCharacterUpdateOptimistic(mockCharacter, onUpdate)
    );

    await act(async () => {
      try {
        await result.current.updateCharacterOptimistic({
          description: 'New description',
        });
      } catch (err) {
        // Expected error
      }
    });

    // Should call onUpdate twice: once optimistically, once to rollback
    expect(onUpdate).toHaveBeenCalledTimes(2);

    // First call: optimistic update
    expect(onUpdate).toHaveBeenNthCalledWith(1, {
      ...mockCharacter,
      description: 'New description',
      updatedAt: expect.any(Date),
    });

    // Second call: rollback to original
    expect(onUpdate).toHaveBeenNthCalledWith(2, mockCharacter);

    expect(result.current.error).toBe('Update failed');
  });

  it('should throw error if no character provided', async () => {
    const onUpdate = jest.fn();

    const { result } = renderHook(() =>
      useCharacterUpdateOptimistic(null, onUpdate)
    );

    await act(async () => {
      await expect(
        result.current.updateCharacterOptimistic({
          description: 'New description',
        })
      ).rejects.toThrow('No character to update');
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });
});

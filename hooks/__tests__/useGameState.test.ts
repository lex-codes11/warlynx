/**
 * Unit tests for useGameState hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGameState } from '../useGameState';
import { useRealtimeGame } from '../useRealtimeGame';

// Mock the useRealtimeGame hook
jest.mock('../useRealtimeGame');

// Mock fetch
global.fetch = jest.fn();

describe('useGameState', () => {
  const mockGameId = 'game-123';
  const mockGameData = {
    id: mockGameId,
    name: 'Test Game',
    hostId: 'user-1',
    status: 'lobby',
    maxPlayers: 4,
    difficultyCurve: 'medium',
    toneTags: ['anime', 'marvel'],
    houseRules: 'No flying',
    turnOrder: [],
    currentTurnIndex: 0,
    startedAt: null,
    completedAt: null,
    players: [
      {
        id: 'player-1',
        userId: 'user-1',
        role: 'host',
        characterId: null,
        joinedAt: '2024-01-01T00:00:00Z',
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

    // Mock successful fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockGameData,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch initial game state on mount', async () => {
    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(`/api/games/${mockGameId}`);
    expect(result.current.gameState).toEqual({
      id: mockGameId,
      name: 'Test Game',
      hostId: 'user-1',
      status: 'lobby',
      maxPlayers: 4,
      difficultyCurve: 'medium',
      toneTags: ['anime', 'marvel'],
      houseRules: 'No flying',
      turnOrder: [],
      currentTurnIndex: 0,
      startedAt: null,
      completedAt: null,
    });
    expect(result.current.players).toHaveLength(1);
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValue(mockError);

    const onError = jest.fn();
    const { result } = renderHook(() => 
      useGameState({ gameId: mockGameId, onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should not fetch when enabled is false', async () => {
    renderHook(() => useGameState({ gameId: mockGameId, enabled: false }));

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('should subscribe to real-time updates', async () => {
    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

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

  it('should handle game updated event', async () => {
    let onGameUpdated: ((data: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onGameUpdated = options.onGameUpdated;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate game update
    const updatedData = { status: 'active', startedAt: '2024-01-01T12:00:00Z' };
    onGameUpdated?.(updatedData);

    await waitFor(() => {
      expect(result.current.gameState?.status).toBe('active');
      expect(result.current.gameState?.startedAt).toBeInstanceOf(Date);
    });
  });

  it('should handle player joined event', async () => {
    let onPlayerJoined: ((player: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onPlayerJoined = options.onPlayerJoined;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.players).toHaveLength(1);

    // Simulate player joined
    const newPlayer = {
      id: 'player-2',
      userId: 'user-2',
      role: 'player',
      characterId: null,
      joinedAt: '2024-01-01T01:00:00Z',
    };
    onPlayerJoined?.(newPlayer);

    await waitFor(() => {
      expect(result.current.players).toHaveLength(2);
      expect(result.current.players[1].userId).toBe('user-2');
    });
  });

  it('should handle player left event', async () => {
    let onPlayerLeft: ((playerId: string) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onPlayerLeft = options.onPlayerLeft;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.players).toHaveLength(1);

    // Simulate player left
    onPlayerLeft?.('player-1');

    await waitFor(() => {
      expect(result.current.players).toHaveLength(0);
    });
  });

  it('should not add duplicate players', async () => {
    let onPlayerJoined: ((player: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onPlayerJoined = options.onPlayerJoined;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.players).toHaveLength(1);

    // Try to add the same player again
    const duplicatePlayer = {
      id: 'player-1',
      userId: 'user-1',
      role: 'host',
      characterId: null,
      joinedAt: '2024-01-01T00:00:00Z',
    };
    onPlayerJoined?.(duplicatePlayer);

    await waitFor(() => {
      expect(result.current.players).toHaveLength(1);
    });
  });

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call refetch
    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should expose connection state', async () => {
    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should provide reconnect function', async () => {
    const mockReconnect = jest.fn();
    (useRealtimeGame as jest.Mock).mockReturnValue({
      isConnected: false,
      reconnect: mockReconnect,
    });

    const { result } = renderHook(() => useGameState({ gameId: mockGameId }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.reconnect();

    expect(mockReconnect).toHaveBeenCalled();
  });
});

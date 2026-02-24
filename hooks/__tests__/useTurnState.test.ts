/**
 * Unit tests for useTurnState hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useTurnState } from '../useTurnState';
import { useRealtimeGame } from '../useRealtimeGame';

// Mock the useRealtimeGame hook
jest.mock('../useRealtimeGame');

// Mock fetch
global.fetch = jest.fn();

describe('useTurnState', () => {
  const mockGameId = 'game-123';
  const mockUserId = 'user-1';
  const mockTurnData = {
    turn: {
      id: 'turn-1',
      gameId: mockGameId,
      turnIndex: 1,
      activePlayerId: mockUserId,
      phase: 'choosing',
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: null,
    },
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
      json: async () => mockTurnData,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch initial turn state on mount', async () => {
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(`/api/games/${mockGameId}/current-turn`);
    expect(result.current.currentTurn).toEqual({
      id: 'turn-1',
      gameId: mockGameId,
      turnIndex: 1,
      activePlayerId: mockUserId,
      phase: 'choosing',
      startedAt: expect.any(Date),
      completedAt: null,
    });
  });

  it('should handle 404 when no turn exists', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentTurn).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    (global.fetch as jest.Mock).mockRejectedValue(mockError);

    const onError = jest.fn();
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId, onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(mockError);
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('should correctly determine if it is the user\'s turn', async () => {
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMyTurn).toBe(true);
  });

  it('should correctly determine if it is not the user\'s turn', async () => {
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: 'user-2' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isMyTurn).toBe(false);
  });

  it('should not fetch when enabled is false', async () => {
    renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId, enabled: false })
    );

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('should subscribe to real-time updates', async () => {
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

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

  it('should handle turn started event', async () => {
    let onTurnStarted: ((turn: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onTurnStarted = options.onTurnStarted;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate new turn started
    const newTurn = {
      id: 'turn-2',
      gameId: mockGameId,
      turnIndex: 2,
      activePlayerId: 'user-2',
      phase: 'choosing',
      startedAt: '2024-01-01T01:00:00Z',
      completedAt: null,
    };
    onTurnStarted?.(newTurn);

    await waitFor(() => {
      expect(result.current.currentTurn?.turnIndex).toBe(2);
      expect(result.current.currentTurn?.activePlayerId).toBe('user-2');
      expect(result.current.isMyTurn).toBe(false);
    });
  });

  it('should handle turn resolved event by refetching', async () => {
    let onTurnResolved: ((response: any) => void) | undefined;

    (useRealtimeGame as jest.Mock).mockImplementation((options) => {
      onTurnResolved = options.onTurnResolved;
      return { isConnected: true, reconnect: jest.fn() };
    });

    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Simulate turn resolved
    const turnResponse = {
      success: true,
      narrative: 'The action was successful',
      choices: [],
      statUpdates: [],
      events: [],
      validationError: null,
    };
    onTurnResolved?.(turnResponse);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should provide refetch function', async () => {
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call refetch
    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should expose connection state', async () => {
    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

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

    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    result.current.reconnect();

    expect(mockReconnect).toHaveBeenCalled();
  });

  it('should handle turn with completedAt date', async () => {
    const completedTurnData = {
      turn: {
        ...mockTurnData.turn,
        phase: 'completed',
        completedAt: '2024-01-01T00:05:00Z',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => completedTurnData,
    });

    const { result } = renderHook(() => 
      useTurnState({ gameId: mockGameId, userId: mockUserId })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentTurn?.completedAt).toBeInstanceOf(Date);
    expect(result.current.currentTurn?.phase).toBe('completed');
  });
});

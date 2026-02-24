/**
 * Unit tests for useTypingIndicator hook
 * 
 * Tests typing event broadcasting, debounce behavior, and cleanup
 * Requirements: 11.1, 11.2, 11.4
 */

import { renderHook, act } from '@testing-library/react';
import { useTypingIndicator } from '../useTypingIndicator';
import { RealtimeSubscriptionManager } from '@/lib/realtime/subscription-manager';

// Mock the subscription manager
jest.mock('@/lib/realtime/subscription-manager');

describe('useTypingIndicator', () => {
  let mockSubscriptionManager: jest.Mocked<RealtimeSubscriptionManager>;
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock subscription manager
    mockSubscriptionManager = {
      broadcastTypingStatus: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('handleTypingStart', () => {
    it('should broadcast typing status when user starts typing (Requirement 11.1)', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      await act(async () => {
        result.current.handleTypingStart();
      });

      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledWith(
        mockUserId,
        true
      );
    });

    it('should not broadcast if disabled', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: false,
        })
      );

      await act(async () => {
        result.current.handleTypingStart();
      });

      expect(mockSubscriptionManager.broadcastTypingStatus).not.toHaveBeenCalled();
    });

    it('should not broadcast if subscription manager is null', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: null,
          userId: mockUserId,
          enabled: true,
        })
      );

      await act(async () => {
        result.current.handleTypingStart();
      });

      expect(mockSubscriptionManager.broadcastTypingStatus).not.toHaveBeenCalled();
    });

    it('should set 2-second debounce timeout (Requirement 11.2)', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      await act(async () => {
        result.current.handleTypingStart();
      });

      // Should broadcast start immediately
      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledWith(
        mockUserId,
        true
      );

      // Clear the mock to check for stop broadcast
      mockSubscriptionManager.broadcastTypingStatus.mockClear();

      // Fast-forward 2 seconds
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should broadcast stop after 2 seconds
      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledWith(
        mockUserId,
        false
      );
    });

    it('should reset debounce timeout on subsequent typing', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      // First typing event
      await act(async () => {
        result.current.handleTypingStart();
      });

      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledTimes(1);
      mockSubscriptionManager.broadcastTypingStatus.mockClear();

      // Advance 1 second
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Second typing event (resets timeout)
      await act(async () => {
        result.current.handleTypingStart();
      });

      // Should not broadcast start again (already typing)
      expect(mockSubscriptionManager.broadcastTypingStatus).not.toHaveBeenCalled();

      // Advance another 1.5 seconds (total 2.5s from first, 1.5s from second)
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      // Should not have stopped yet (timeout was reset)
      expect(mockSubscriptionManager.broadcastTypingStatus).not.toHaveBeenCalled();

      // Advance final 0.5 seconds (2s from second event)
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Now should broadcast stop
      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledWith(
        mockUserId,
        false
      );
    });
  });

  describe('handleTypingStop', () => {
    it('should immediately clear typing indicator (Requirement 11.4)', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      // Start typing
      await act(async () => {
        result.current.handleTypingStart();
      });

      mockSubscriptionManager.broadcastTypingStatus.mockClear();

      // Stop typing
      await act(async () => {
        result.current.handleTypingStop();
      });

      // Should broadcast stop immediately
      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledWith(
        mockUserId,
        false
      );

      // Advance time to ensure debounce timeout was cleared
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Should not broadcast again
      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledTimes(1);
    });

    it('should not broadcast if not currently typing', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      await act(async () => {
        result.current.handleTypingStop();
      });

      expect(mockSubscriptionManager.broadcastTypingStatus).not.toHaveBeenCalled();
    });
  });

  describe('handleInputChange', () => {
    it('should trigger typing start and execute callback', async () => {
      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      const mockCallback = jest.fn();

      await act(async () => {
        result.current.handleInputChange(mockCallback);
      });

      expect(mockSubscriptionManager.broadcastTypingStatus).toHaveBeenCalledWith(
        mockUserId,
        true
      );
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle broadcast errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSubscriptionManager.broadcastTypingStatus.mockRejectedValue(
        new Error('Broadcast failed')
      );

      const { result } = renderHook(() =>
        useTypingIndicator({
          subscriptionManager: mockSubscriptionManager,
          userId: mockUserId,
          enabled: true,
        })
      );

      await act(async () => {
        result.current.handleTypingStart();
        // Wait for promise rejection to be handled
        await Promise.resolve();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to broadcast typing start:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

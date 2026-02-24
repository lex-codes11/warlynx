/**
 * useTypingIndicator Hook
 * 
 * Manages typing indicator broadcasting for input fields.
 * Implements 2-second debounce for typing stop detection.
 * 
 * Requirements: 11.1, 11.2, 11.4
 */

import { useCallback, useRef } from 'react';
import { RealtimeSubscriptionManager } from '@/lib/realtime/subscription-manager';

interface UseTypingIndicatorOptions {
  subscriptionManager: RealtimeSubscriptionManager | null;
  userId: string;
  enabled?: boolean;
}

interface UseTypingIndicatorReturn {
  handleTypingStart: () => void;
  handleTypingStop: () => void;
  handleInputChange: (callback: () => void) => void;
}

/**
 * Hook to manage typing indicator broadcasting
 * 
 * @param options - Configuration options
 * @returns Typing event handlers
 */
export function useTypingIndicator({
  subscriptionManager,
  userId,
  enabled = true,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  /**
   * Handle typing start - broadcasts typing status
   * Requirement 11.1: Broadcast typing indicator when player begins typing
   */
  const handleTypingStart = useCallback(() => {
    if (!enabled || !subscriptionManager || !userId) {
      return;
    }

    // Only broadcast if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      subscriptionManager.broadcastTypingStatus(userId, true).catch((error) => {
        console.error('Failed to broadcast typing start:', error);
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set 2-second debounce timeout
    // Requirement 11.2: Remove typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        subscriptionManager.broadcastTypingStatus(userId, false).catch((error) => {
          console.error('Failed to broadcast typing stop:', error);
        });
      }
    }, 2000);
  }, [enabled, subscriptionManager, userId]);

  /**
   * Handle typing stop - immediately clears typing indicator
   * Requirement 11.4: Clear typing indicator on input submission
   */
  const handleTypingStop = useCallback(() => {
    if (!enabled || !subscriptionManager || !userId) {
      return;
    }

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Broadcast stop if currently typing
    if (isTypingRef.current) {
      isTypingRef.current = false;
      subscriptionManager.broadcastTypingStatus(userId, false).catch((error) => {
        console.error('Failed to broadcast typing stop:', error);
      });
    }
  }, [enabled, subscriptionManager, userId]);

  /**
   * Wrapper for input change handlers
   * Automatically triggers typing start and executes the provided callback
   */
  const handleInputChange = useCallback(
    (callback: () => void) => {
      handleTypingStart();
      callback();
    },
    [handleTypingStart]
  );

  return {
    handleTypingStart,
    handleTypingStop,
    handleInputChange,
  };
}

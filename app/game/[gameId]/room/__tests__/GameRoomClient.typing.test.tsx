/**
 * Integration tests for typing indicators in GameRoomClient
 * 
 * Tests typing event handlers and real-time broadcasting
 * Requirements: 11.1, 11.2, 11.4
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameRoomClient from '../GameRoomClient';
import * as subscriptionManager from '@/lib/realtime/subscription-manager';

// Mock the subscription manager
jest.mock('@/lib/realtime/subscription-manager');

describe('GameRoomClient - Typing Indicators', () => {
  const mockGame = {
    id: 'game-123',
    name: 'Test Game',
    status: 'active',
    players: [
      {
        id: 'player-1',
        userId: 'user-1',
        user: {
          id: 'user-1',
          displayName: 'Player One',
          email: 'player1@test.com',
        },
        character: {
          id: 'char-1',
          name: 'Hero',
          imageUrl: null,
          powerSheet: {},
        },
      },
      {
        id: 'player-2',
        userId: 'user-2',
        user: {
          id: 'user-2',
          displayName: 'Player Two',
          email: 'player2@test.com',
        },
        character: {
          id: 'char-2',
          name: 'Villain',
          imageUrl: null,
          powerSheet: {},
        },
      },
    ],
    events: [],
  };

  let mockSubscriptionManagerInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock subscription manager instance
    mockSubscriptionManagerInstance = {
      subscribeToSession: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      broadcastTypingStatus: jest.fn().mockResolvedValue(undefined),
    };

    // Mock the factory function
    (subscriptionManager.createSubscriptionManager as jest.Mock).mockReturnValue(
      mockSubscriptionManagerInstance
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize subscription manager on mount', () => {
    render(
      <GameRoomClient
        game={mockGame}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    expect(subscriptionManager.createSubscriptionManager).toHaveBeenCalled();
    expect(mockSubscriptionManagerInstance.subscribeToSession).toHaveBeenCalledWith({
      sessionId: 'game-123',
      callbacks: expect.objectContaining({
        onPlayerTyping: expect.any(Function),
      }),
    });
  });

  it('should broadcast typing status when user types (Requirement 11.1)', async () => {
    render(
      <GameRoomClient
        game={mockGame}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    const textarea = screen.getByPlaceholderText('What do you want to do?');

    // Type in the textarea
    fireEvent.change(textarea, { target: { value: 'I attack the dragon' } });

    await waitFor(() => {
      expect(mockSubscriptionManagerInstance.broadcastTypingStatus).toHaveBeenCalledWith(
        'user-1',
        true
      );
    });
  });

  it('should clear typing indicator on form submission (Requirement 11.4)', async () => {
    // Mock fetch for form submission
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <GameRoomClient
        game={mockGame}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    const textarea = screen.getByPlaceholderText('What do you want to do?');
    const submitButton = screen.getByText('Submit Action');

    // Type in the textarea
    fireEvent.change(textarea, { target: { value: 'I attack the dragon' } });

    // Clear the mock to check for stop broadcast
    mockSubscriptionManagerInstance.broadcastTypingStatus.mockClear();

    // Submit the form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubscriptionManagerInstance.broadcastTypingStatus).toHaveBeenCalledWith(
        'user-1',
        false
      );
    });
  });

  it('should display typing indicator when other players are typing (Requirement 11.3)', async () => {
    render(
      <GameRoomClient
        game={mockGame}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    // Get the onPlayerTyping callback
    const subscribeCall = mockSubscriptionManagerInstance.subscribeToSession.mock.calls[0][0];
    const onPlayerTyping = subscribeCall.callbacks.onPlayerTyping;

    // Simulate another player typing
    await waitFor(() => {
      onPlayerTyping('user-2', true);
    });

    // Should display typing indicator
    await waitFor(() => {
      expect(screen.getByText(/Player Two is typing/i)).toBeInTheDocument();
    });
  });

  it('should hide typing indicator when player stops typing', async () => {
    render(
      <GameRoomClient
        game={mockGame}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    // Get the onPlayerTyping callback
    const subscribeCall = mockSubscriptionManagerInstance.subscribeToSession.mock.calls[0][0];
    const onPlayerTyping = subscribeCall.callbacks.onPlayerTyping;

    // Simulate another player typing
    await waitFor(() => {
      onPlayerTyping('user-2', true);
    });

    // Should display typing indicator
    await waitFor(() => {
      expect(screen.getByText(/Player Two is typing/i)).toBeInTheDocument();
    });

    // Simulate player stopping typing
    await waitFor(() => {
      onPlayerTyping('user-2', false);
    });

    // Should hide typing indicator
    await waitFor(() => {
      expect(screen.queryByText(/Player Two is typing/i)).not.toBeInTheDocument();
    });
  });

  it('should display multiple typing players', async () => {
    const gameWithMorePlayers = {
      ...mockGame,
      players: [
        ...mockGame.players,
        {
          id: 'player-3',
          userId: 'user-3',
          user: {
            id: 'user-3',
            displayName: 'Player Three',
            email: 'player3@test.com',
          },
          character: {
            id: 'char-3',
            name: 'Wizard',
            imageUrl: null,
            powerSheet: {},
          },
        },
      ],
    };

    render(
      <GameRoomClient
        game={gameWithMorePlayers}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    // Get the onPlayerTyping callback
    const subscribeCall = mockSubscriptionManagerInstance.subscribeToSession.mock.calls[0][0];
    const onPlayerTyping = subscribeCall.callbacks.onPlayerTyping;

    // Simulate two players typing
    await waitFor(() => {
      onPlayerTyping('user-2', true);
      onPlayerTyping('user-3', true);
    });

    // Should display both players typing
    await waitFor(() => {
      expect(screen.getByText(/Player Two and Player Three are typing/i)).toBeInTheDocument();
    });
  });

  it('should cleanup subscription on unmount', () => {
    const { unmount } = render(
      <GameRoomClient
        game={mockGame}
        userId="user-1"
        userCharacterId="char-1"
      />
    );

    unmount();

    expect(mockSubscriptionManagerInstance.unsubscribe).toHaveBeenCalled();
  });
});

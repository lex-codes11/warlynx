/**
 * Enhanced Gameplay View
 * Integrates all game enhancement components
 * Validates: All requirements
 */

'use client';

import { useState, useEffect } from 'react';
import { StatsDisplay } from './StatsDisplay';
import { AbilitySummaryContainer } from './AbilitySummaryContainer';
import { TurnIndicator } from './TurnIndicator';
import { MoveSelector } from './MoveSelector';
import { TTSControls } from './TTSControls';
import { CharacterImageViewer } from '@/components/character/CharacterImageViewer';
import { TypingIndicator } from '@/components/realtime/TypingIndicator';
import { useTTSNarration } from '@/hooks/useTTSNarration';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { createSubscriptionManager } from '@/lib/realtime/subscription-manager';
import { MoveOptions } from '@/types/game-enhancements';
import { Player } from '@/lib/types';

interface EnhancedGameplayViewProps {
  game: any;
  userId: string;
  userCharacterId?: string;
  onMoveSubmit?: (move: string) => Promise<void>;
}

/**
 * Enhanced Gameplay View Component
 * Integrates all game enhancement features (Requirement 19.1)
 */
export function EnhancedGameplayView({
  game,
  userId,
  userCharacterId,
  onMoveSubmit,
}: EnhancedGameplayViewProps) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [aiMoves, setAiMoves] = useState<MoveOptions>({
    A: 'Assess the situation carefully',
    B: 'Take a defensive stance',
    C: 'Attempt to negotiate',
    D: 'Act boldly and decisively',
  });
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [typingPlayers, setTypingPlayers] = useState<string[]>([]);
  const [subscriptionManager] = useState(() => createSubscriptionManager());

  // Get story content for TTS
  const storyContent = (game.events || [])
    .filter((e: any) => e.type === 'narrative')
    .map((e: any) => e.content)
    .join('\n\n');

  // TTS narration hook (Requirements 13.3, 13.5)
  useTTSNarration({
    enabled: ttsEnabled,
    storyContent,
  });

  // Typing indicator hook (Requirements 11.1, 11.2, 11.4)
  const { handleTypingStart, handleTypingStop } = useTypingIndicator({
    subscriptionManager,
    userId,
    enabled: true,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    subscriptionManager.subscribeToSession({
      sessionId: game.id,
      callbacks: {
        onPlayerTyping: (playerId: string, isTyping: boolean) => {
          const player = (game.players || []).find((p: any) => p.userId === playerId);
          const playerName = player?.user?.displayName || 'Unknown Player';

          setTypingPlayers((prev) => {
            if (isTyping) {
              return prev.includes(playerName) ? prev : [...prev, playerName];
            } else {
              return prev.filter((name) => name !== playerName);
            }
          });
        },
      },
    });

    return () => {
      subscriptionManager.unsubscribe();
    };
  }, [game.id, subscriptionManager]);

  // Load AI-generated moves when it's the player's turn
  useEffect(() => {
    const isPlayerTurn = game.turnOrder?.[game.currentTurnIndex] === userId;

    if (isPlayerTurn && !isLoadingMoves) {
      loadAIMoves();
    }
  }, [game.currentTurnIndex, userId]);

  const loadAIMoves = async () => {
    setIsLoadingMoves(true);

    try {
      const response = await fetch(`/api/game/${game.id}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: userCharacterId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.moves) {
          setAiMoves(data.moves);
        }
      }
    } catch (error) {
      console.error('Failed to load AI moves:', error);
    } finally {
      setIsLoadingMoves(false);
    }
  };

  const handleMoveSelected = async (move: string) => {
    handleTypingStop(); // Clear typing indicator (Requirement 11.4)
    
    try {
      const response = await fetch(`/api/game/${game.id}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: move }),
      });

      if (response.ok) {
        // Reload the page to get updated game state
        window.location.reload();
      } else {
        const data = await response.json();
        console.error('Move submission failed:', data.error?.message);
        alert(data.error?.message || 'Failed to submit move');
      }
    } catch (error) {
      console.error('Move submission error:', error);
      alert('Failed to submit move. Please try again.');
    }
  };

  // Convert game data to component-friendly format
  const players: Player[] = (game.players || []).map((p: any) => ({
    id: p.id,
    userId: p.userId,
    displayName: p.user?.displayName || p.user?.email || 'Unknown',
    avatar: p.user?.avatar || null,
    characterId: p.character?.id || null,
    isReady: true,
  }));

  const characters = (game.players || [])
    .filter((p: any) => p.character)
    .map((p: any) => p.character);

  const currentPlayerId = game.turnOrder?.[game.currentTurnIndex] || '';
  const isPlayerTurn = currentPlayerId === userId;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Story and Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* TTS Controls (Requirements 13.2, 13.4) */}
            <TTSControls
              enabled={ttsEnabled}
              onEnabledChange={setTtsEnabled}
            />

            {/* Story Content */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Story
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {!game.events || game.events.length === 0 ? (
                  <p className="text-gray-600 italic">
                    The adventure is about to begin...
                  </p>
                ) : (
                  game.events.map((event: any) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-md ${
                        event.type === 'narrative'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : event.type === 'action'
                          ? 'bg-green-50 border-l-4 border-green-500'
                          : event.type === 'death'
                          ? 'bg-red-50 border-l-4 border-red-500'
                          : 'bg-gray-50 border-l-4 border-gray-500'
                      }`}
                    >
                      {event.character && (
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {event.character.name}
                        </p>
                      )}
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {event.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Move Selector (Requirements 9.2, 9.3, 9.4) */}
            <MoveSelector
              aiMoves={aiMoves}
              onMoveSelected={handleMoveSelected}
              isPlayerTurn={isPlayerTurn}
              isLoading={isLoadingMoves}
            />

            {/* Typing Indicator (Requirement 11.3) */}
            <TypingIndicator typingPlayers={typingPlayers} />
          </div>

          {/* Right Column: Game State */}
          <div className="space-y-6">
            {/* Turn Indicator (Requirements 10.2, 10.3, 10.4) */}
            <TurnIndicator
              currentPlayerId={currentPlayerId}
              players={players}
            />

            {/* Character Images (Requirements 5.1, 5.2, 5.3, 5.4) */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Characters
              </h3>
              <div className="space-y-4">
                {characters.map((char: any) => (
                  <CharacterImageViewer
                    key={char.id}
                    imageUrl={char.imageUrl}
                    characterName={char.name}
                    size="large"
                  />
                ))}
              </div>
            </div>

            {/* Stats Display (Requirements 7.1, 7.2, 7.3, 7.4) */}
            <StatsDisplay characters={characters} />

            {/* Ability Summary (Requirements 8.1, 8.2, 8.3, 8.4) */}
            <AbilitySummaryContainer 
              gameId={game.id}
              initialCharacters={characters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

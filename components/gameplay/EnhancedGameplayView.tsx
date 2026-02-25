/**
 * Enhanced Gameplay View
 * Integrates all game enhancement components
 * Validates: All requirements
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StatsDisplay } from './StatsDisplay';
import { AbilitySummaryContainer } from './AbilitySummaryContainer';
import { TurnIndicator } from './TurnIndicator';
import { MoveSelector } from './MoveSelector';
import { CharacterImageViewer } from '@/components/character/CharacterImageViewer';
import { TypingIndicator } from '@/components/realtime/TypingIndicator';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { createSubscriptionManager } from '@/lib/realtime/subscription-manager';
import { createRealtimeClient, subscribeToGame } from '@/lib/realtime/supabase';
import { MoveOptions } from '@/types/game-enhancements';
import { Player } from '@/lib/types';

// Cinematic UI components
import { BattleFeed } from '@/components/cinematic/BattleFeed';
import { PowerCard } from '@/components/cinematic/PowerCard';
import { DecisionTerminal } from '@/components/cinematic/DecisionTerminal';
import { PowerHUD } from '@/components/cinematic/PowerHUD';
import { AmbientBackground } from '@/components/cinematic/AmbientBackground';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  game: initialGame,
  userId,
  userCharacterId,
  onMoveSubmit,
}: EnhancedGameplayViewProps) {
  const router = useRouter();
  const [game, setGame] = useState(initialGame);
  const [aiMoves, setAiMoves] = useState<MoveOptions>({
    A: 'Assess the situation carefully',
    B: 'Take a defensive stance',
    C: 'Attempt to negotiate',
    D: 'Act boldly and decisively',
  });
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [isSubmittingMove, setIsSubmittingMove] = useState(false);
  const [typingPlayers, setTypingPlayers] = useState<string[]>([]);
  const [subscriptionManager] = useState(() => createSubscriptionManager());

  // Feature flag for cinematic UI (Requirement 9.1, 10.6)
  const useCinematicUI = process.env.NEXT_PUBLIC_ENABLE_CINEMATIC_UI === 'true';

  // Typing indicator hook (Requirements 11.1, 11.2, 11.4)
  const { handleTypingStart, handleTypingStop } = useTypingIndicator({
    subscriptionManager,
    userId,
    enabled: true,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const supabaseClient = createRealtimeClient();
    if (!supabaseClient) {
      console.warn('Supabase client not available for real-time updates');
      return;
    }

    console.log('Setting up real-time subscriptions for game:', game.id);

    // Subscribe to typing indicators
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

    // Subscribe to game events (turn resolved, stats updated, etc.)
    const gameChannel = subscribeToGame(supabaseClient, game.id, {
      onTurnResolved: async (response: any) => {
        console.log('Turn resolved event received:', {
          turnId: response.turnId,
          nextActivePlayer: response.nextActivePlayer,
        });
        // Use Next.js router to refresh server data without full page reload
        router.refresh();
        setIsSubmittingMove(false);
        // Force reload moves for new turn
        setIsLoadingMoves(false);
      },
      onStatsUpdated: (update: any) => {
        console.log('Stats updated event received:', update);
        // Stats will be updated via router.refresh()
        router.refresh();
      },
      onCharacterUpdated: (character: any) => {
        console.log('Character updated event received:', character);
        // Character will be updated via router.refresh()
        router.refresh();
      },
      onGameUpdated: (gameUpdate: any) => {
        console.log('Game updated event received:', gameUpdate);
        router.refresh();
      },
    });

    return () => {
      console.log('Cleaning up real-time subscriptions');
      subscriptionManager.unsubscribe();
      gameChannel.unsubscribe();
    };
  }, [game.id, userId, router, subscriptionManager]);

  // Load AI-generated moves when it's the player's turn
  useEffect(() => {
    const isPlayerTurn = game.turnOrder?.[game.currentTurnIndex] === userId;

    if (isPlayerTurn && !isLoadingMoves && !isSubmittingMove) {
      loadAIMoves();
    }
  }, [game.currentTurnIndex, userId, isLoadingMoves, isSubmittingMove]);

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
    // Double-check it's actually the player's turn before submitting
    const currentActivePlayer = game.turnOrder?.[game.currentTurnIndex];
    if (currentActivePlayer !== userId) {
      console.warn('Move submission blocked: not your turn', {
        currentActivePlayer,
        userId,
        currentTurnIndex: game.currentTurnIndex,
      });
      alert('It is not your turn. Please wait for the other player.');
      return;
    }

    handleTypingStop(); // Clear typing indicator (Requirement 11.4)
    setIsSubmittingMove(true);
    
    try {
      const response = await fetch(`/api/game/${game.id}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: move }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Move submission failed:', data.error?.message);
        
        // If it's a "not your turn" or "turn already completed" error, refresh the page
        if (data.error?.code === 'NOT_YOUR_TURN' || data.error?.code === 'TURN_ALREADY_COMPLETED') {
          alert(data.error.message + ' Refreshing...');
          router.refresh();
        } else {
          alert(data.error?.message || 'Failed to submit move');
        }
        setIsSubmittingMove(false);
      }
      // Don't reload - real-time subscription will update the UI
    } catch (error) {
      console.error('Move submission error:', error);
      alert('Failed to submit move. Please try again.');
      setIsSubmittingMove(false);
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

  // Get active player's character for PowerHUD
  const activePlayer = players.find((p) => p.userId === currentPlayerId);
  const activeCharacter = characters.find((c: any) => c.id === activePlayer?.characterId);

  // Render cinematic UI if feature flag is enabled
  if (useCinematicUI) {
    return (
      <div className="min-h-screen bg-[#0B0B12] relative">
        {/* Ambient Background (Requirement 1.2) */}
        <AmbientBackground intensity="medium" />

        <div className="max-w-[1800px] mx-auto py-4 px-4 relative z-10">
          {/* Compact Turn Indicator at top */}
          <div className="mb-4">
            <ErrorBoundary
              fallback={
                <div className="bg-gray-900/60 backdrop-blur-lg border border-red-500/30 rounded-lg p-2">
                  <p className="text-red-400 text-center text-xs">
                    Unable to load turn indicator
                  </p>
                </div>
              }
            >
              <div className="bg-gray-900/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 text-sm font-semibold">Current Turn:</span>
                    <span className="text-gray-200 text-sm">
                      {players.find((p) => p.userId === currentPlayerId)?.displayName || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {players.map((player) => {
                      const isActive = player.userId === currentPlayerId;
                      return (
                        <div
                          key={player.userId}
                          className={`px-3 py-1 rounded-full text-xs ${
                            isActive
                              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                              : 'bg-gray-800/50 border border-gray-700/50 text-gray-400'
                          }`}
                        >
                          {player.displayName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          </div>

          <div className="grid lg:grid-cols-12 gap-4">
            {/* Mobile: Chat first, then stats/abilities, then character cards */}
            {/* Desktop: Stats left, chat middle, character cards right */}
            
            {/* Middle Column: Story and Actions - Shows first on mobile */}
            <div className="lg:col-span-6 lg:order-2 order-1 space-y-4">
              {/* Battle Feed (Requirement 10.1) */}
              <ErrorBoundary
                fallback={
                  <div className="bg-gray-900/40 backdrop-blur-md border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-400 text-center">
                      Unable to load battle feed. Please refresh the page.
                    </p>
                  </div>
                }
              >
                <BattleFeed events={game.events || []} />
              </ErrorBoundary>

              {/* Decision Terminal (Requirement 10.3) */}
              <ErrorBoundary
                fallback={
                  <div className="bg-gray-900/40 backdrop-blur-md border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-400 text-center">
                      Unable to load decision terminal. Please refresh the page.
                    </p>
                  </div>
                }
              >
                <DecisionTerminal
                  characterName={activeCharacter?.name || 'Unknown'}
                  isPlayerTurn={isPlayerTurn}
                  aiMoves={aiMoves}
                  onMoveSelected={handleMoveSelected}
                  isLoading={isLoadingMoves || isSubmittingMove}
                />
              </ErrorBoundary>

              {/* Typing Indicator */}
              <TypingIndicator typingPlayers={typingPlayers} />
            </div>

            {/* Left Column: Stats and Abilities - Shows second on mobile */}
            <div className="lg:col-span-3 lg:order-1 order-2 space-y-4">
              {/* Stats Display */}
              <StatsDisplay characters={characters} />

              {/* Ability Summary */}
              <AbilitySummaryContainer 
                gameId={game.id}
                initialCharacters={characters}
              />
            </div>

            {/* Right Column: Character Cards with Images - Shows third on mobile */}
            <div className="lg:col-span-3 lg:order-3 order-3 space-y-4">
              {/* Power Cards (Requirement 10.2) */}
              {characters.map((char: any) => {
                const charPlayer = players.find((p) => p.characterId === char.id);
                const isActive = charPlayer?.userId === currentPlayerId;
                
                return (
                  <ErrorBoundary
                    key={char.id}
                    fallback={
                      <div className="bg-gray-900/60 backdrop-blur-lg border border-red-500/30 rounded-xl p-4">
                        <p className="text-red-400 text-center text-sm">
                          Unable to load character card
                        </p>
                      </div>
                    }
                  >
                    <PowerCard
                      character={char}
                      isActive={isActive}
                    />
                  </ErrorBoundary>
                );
              })}
            </div>
          </div>
        </div>

        {/* Power HUD (Requirement 10.4) */}
        {activeCharacter && (
          <ErrorBoundary
            fallback={
              <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/80 backdrop-blur-xl border-t border-red-500/30 p-4">
                <p className="text-red-400 text-center text-sm">
                  Unable to load power HUD
                </p>
              </div>
            }
          >
            <PowerHUD
              character={activeCharacter}
              visible={true}
            />
          </ErrorBoundary>
        )}
      </div>
    );
  }

  // Default UI (original)
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Story and Actions */}
          <div className="lg:col-span-2 space-y-6">
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
              isLoading={isLoadingMoves || isSubmittingMove}
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createSubscriptionManager, RealtimeSubscriptionManager } from "@/lib/realtime/subscription-manager";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/realtime/TypingIndicator";

type Character = {
  id: string;
  name: string;
  imageUrl: string | null;
  powerSheet: any;
};

type Player = {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string | null;
    email: string;
  };
  character: Character | null;
};

type GameEvent = {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  character: {
    name: string;
  } | null;
};

type Game = {
  id: string;
  name: string;
  status: string;
  players: Player[];
  events: GameEvent[];
};

export default function GameRoomClient({
  game: initialGame,
  userId,
  userCharacterId,
}: {
  game: any;
  userId: string;
  userCharacterId?: string;
}) {
  const [game] = useState(initialGame);
  const [customAction, setCustomAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingPlayers, setTypingPlayers] = useState<string[]>([]);
  const [subscriptionManager, setSubscriptionManager] = useState<RealtimeSubscriptionManager | null>(null);
  const [generatingScene, setGeneratingScene] = useState(false);
  const [sceneImageUrl, setSceneImageUrl] = useState<string | null>(null);
  const [showSceneModal, setShowSceneModal] = useState(false);

  // Initialize subscription manager
  useEffect(() => {
    const manager = createSubscriptionManager();
    setSubscriptionManager(manager);

    // Subscribe to session for real-time updates
    manager.subscribeToSession({
      sessionId: game.id,
      callbacks: {
        onPlayerTyping: (playerId: string, isTyping: boolean) => {
          // Find player name
          const player = game.players.find((p: any) => p.userId === playerId);
          const playerName = player?.user?.displayName || player?.user?.email || 'Unknown Player';
          
          setTypingPlayers((prev) => {
            if (isTyping) {
              // Add player if not already in list
              return prev.includes(playerName) ? prev : [...prev, playerName];
            } else {
              // Remove player from list
              return prev.filter((name) => name !== playerName);
            }
          });
        },
      },
    });

    // Cleanup on unmount
    return () => {
      manager.unsubscribe();
    };
  }, [game.id, game.players]);

  // Typing indicator hook
  const { handleTypingStart, handleTypingStop } = useTypingIndicator({
    subscriptionManager,
    userId,
    enabled: true,
  });

  const handleSubmitAction = async () => {
    if (!customAction.trim()) return;

    // Requirement 11.4: Clear typing indicator on input submission
    handleTypingStop();

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${game.id}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: customAction.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to submit action");
      }

      // Reset form
      setCustomAction("");
      
      // Refresh page to show new turn
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit action");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateScene = async () => {
    setGeneratingScene(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${game.id}/generate-scene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to generate scene");
      }

      setSceneImageUrl(data.imageUrl);
      setShowSceneModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate scene");
    } finally {
      setGeneratingScene(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">{game.name}</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Narrative Log */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Story
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {game.events.length === 0 ? (
                  <p className="text-gray-600 italic">
                    The adventure is about to begin...
                  </p>
                ) : (
                  game.events.map((event: any) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-md ${
                        event.type === "narrative"
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : event.type === "action"
                          ? "bg-green-50 border-l-4 border-green-500"
                          : event.type === "death"
                          ? "bg-red-50 border-l-4 border-red-500"
                          : event.type === "level_up"
                          ? "bg-purple-50 border-l-4 border-purple-500"
                          : "bg-gray-50 border-l-4 border-gray-500"
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

            {/* Turn Panel */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Take Action
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe your action:
                </label>
                <textarea
                  value={customAction}
                  onChange={(e) => {
                    setCustomAction(e.target.value);
                    // Requirement 11.1: Detect typing start and broadcast to other players
                    handleTypingStart();
                  }}
                  onKeyDown={(e) => {
                    // Requirement 11.4: Clear typing on Enter (if submitting)
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleSubmitAction();
                    }
                  }}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What do you want to do?"
                />
                {/* Requirement 11.3: Display typing indicator */}
                <TypingIndicator typingPlayers={typingPlayers} className="mt-2" />
              </div>

              <button
                onClick={handleSubmitAction}
                disabled={submitting || !customAction.trim()}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Action"}
              </button>

              <button
                onClick={handleGenerateScene}
                disabled={generatingScene}
                className="w-full mt-3 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generatingScene ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Scene...
                  </>
                ) : (
                  <>
                    🎨 Generate Battle Scene
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Scene Image Modal */}
          {showSceneModal && sceneImageUrl && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
              onClick={() => setShowSceneModal(false)}
            >
              <div 
                className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">Battle Scene</h3>
                  <button
                    onClick={() => setShowSceneModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="p-4">
                  <img
                    src={sceneImageUrl}
                    alt="Battle Scene"
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="mt-4 flex gap-2">
                    <a
                      href={sceneImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-center"
                    >
                      Open in New Tab
                    </a>
                    <button
                      onClick={() => setShowSceneModal(false)}
                      className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right: Character Cards */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Characters</h2>
            {game.players.map((player: any) => {
              if (!player.character) return null;
              const char = player.character;
              const isUser = player.userId === userId;

              return (
                <div
                  key={player.id}
                  className={`bg-white shadow rounded-lg p-4 ${
                    isUser ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  {char.imageUrl && (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {char.name}
                    {isUser && (
                      <span className="ml-2 text-xs font-normal text-blue-600">
                        (You)
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {player.user.displayName || player.user.email}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

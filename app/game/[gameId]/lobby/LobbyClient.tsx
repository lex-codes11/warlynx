"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Player = {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string | null;
    email: string;
  };
  character: {
    id: string;
    name: string;
  } | null;
};

type Game = {
  id: string;
  name: string;
  inviteCode: string;
  maxPlayers: number;
  status: string;
  hostId: string;
  players: Player[];
};

export default function LobbyClient({
  game: initialGame,
  isHost,
  userId,
  hasCharacter,
}: {
  game: Game;
  isHost: boolean;
  userId: string;
  hasCharacter: boolean;
}) {
  const router = useRouter();
  const [game, setGame] = useState(initialGame);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/game/join/${game.inviteCode}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    setStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${game.id}/start`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to start game");
      }

      router.push(`/game/${game.id}/room`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStarting(false);
    }
  };

  const allPlayersHaveCharacters = game.players.every((p) => p.character);
  const canStart = isHost && allPlayersHaveCharacters && game.players.length >= 2;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{game.name}</h1>
        <p className="text-gray-600 mb-8">Waiting for players to join...</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invite Players
            </h2>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={game.inviteCode}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Share this code or link with friends to invite them to your game.
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Game Info
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Players:</dt>
                <dd className="font-medium">
                  {game.players.length}/{game.maxPlayers}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Status:</dt>
                <dd className="font-medium capitalize">{game.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Your Role:</dt>
                <dd className="font-medium">{isHost ? "Host" : "Player"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Players ({game.players.length}/{game.maxPlayers})
          </h2>
          <div className="space-y-3">
            {game.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">
                      {player.user.displayName || player.user.email}
                    </p>
                    {player.userId === game.hostId && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        Host
                      </span>
                    )}
                    {player.userId === userId && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        You
                      </span>
                    )}
                  </div>
                  {player.character ? (
                    <p className="text-sm text-gray-600 mt-1">
                      ✓ Character: {player.character.name}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ No character created
                    </p>
                  )}
                </div>
                {player.userId === userId && !player.character && (
                  <Link
                    href={`/game/${game.id}/character/create`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Create Character
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Start Game
            </h2>
            {!allPlayersHaveCharacters && (
              <p className="text-sm text-amber-600 mb-4">
                ⚠️ All players must create their characters before starting
              </p>
            )}
            {game.players.length < 2 && (
              <p className="text-sm text-amber-600 mb-4">
                ⚠️ At least 2 players are required to start
              </p>
            )}
            <button
              onClick={handleStartGame}
              disabled={!canStart || starting}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {starting ? "Starting..." : "Start Game"}
            </button>
          </div>
        )}

        {!isHost && !hasCharacter && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="text-amber-800 font-medium mb-2">
              Create your character to get ready!
            </p>
            <Link
              href={`/game/${game.id}/character/create`}
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Create Character
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteGame = async () => {
    if (!confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${game.id}/delete`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to delete game");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete game");
      setDeleting(false);
    }
  };

  const allPlayersHaveCharacters = game.players.every((p) => p.character);
  const canStart = isHost && allPlayersHaveCharacters && game.players.length >= 2;

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white py-12 relative">
      {/* Ambient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-cyan-400 hover:text-cyan-300 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          {game.name}
        </h1>
        <p className="text-gray-400 mb-8">Waiting for players to join...</p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              Invite Players
            </h2>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Invite Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={game.inviteCode}
                  className="flex-1 px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-md font-mono text-cyan-400"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400">
              Share this code or link with friends to invite them to your game.
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              Game Info
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-400">Players:</dt>
                <dd className="font-medium text-cyan-400">
                  {game.players.length}/{game.maxPlayers}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Status:</dt>
                <dd className="font-medium text-cyan-400 capitalize">{game.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Your Role:</dt>
                <dd className="font-medium text-cyan-400">{isHost ? "Host" : "Player"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">
            Players ({game.players.length}/{game.maxPlayers})
          </h2>
          <div className="space-y-3">
            {game.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 bg-gray-800/40 border border-gray-700 rounded-md"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-200">
                      {player.user.displayName || player.user.email}
                    </p>
                    {player.userId === game.hostId && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                        Host
                      </span>
                    )}
                    {player.userId === userId && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
                        You
                      </span>
                    )}
                  </div>
                  {player.character ? (
                    <p className="text-sm text-green-400 mt-1">
                      ✓ Character: {player.character.name}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-400 mt-1">
                      ⚠️ No character created
                    </p>
                  )}
                </div>
                {player.userId === userId && !player.character && (
                  <Link
                    href={`/game/${game.id}/character/create`}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
                  >
                    Create Character
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">
              Host Controls
            </h2>
            {!allPlayersHaveCharacters && (
              <p className="text-sm text-amber-400 mb-4">
                ⚠️ All players must create their characters before starting
              </p>
            )}
            {game.players.length < 2 && (
              <p className="text-sm text-amber-400 mb-4">
                ⚠️ At least 2 players are required to start
              </p>
            )}
            <div className="space-y-3">
              <button
                onClick={handleStartGame}
                disabled={!canStart || starting || deleting}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-green-500/50"
              >
                {starting ? "Starting..." : "Start Game"}
              </button>
              <button
                onClick={handleDeleteGame}
                disabled={starting || deleting}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-red-500/50"
              >
                {deleting ? "Deleting..." : "Delete Game"}
              </button>
            </div>
          </div>
        )}

        {!isHost && !hasCharacter && (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl p-6">
            <p className="text-amber-400 font-medium mb-2">
              Create your character to get ready!
            </p>
            <Link
              href={`/game/${game.id}/character/create`}
              className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
            >
              Create Character
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

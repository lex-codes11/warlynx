"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type LibraryCharacter = {
  id: string;
  name: string;
  fusionIngredients: string;
  description: string;
  abilities: string[];
  weakness: string;
  imageUrl: string;
  createdAt: string;
};

export function CharacterLibraryClient() {
  const [characters, setCharacters] = useState<LibraryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const response = await fetch("/api/characters/library");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch characters");
      }

      setCharacters(data.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load characters");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (characterId: string) => {
    if (!confirm("Are you sure you want to delete this character? This action cannot be undone.")) {
      return;
    }

    setDeletingId(characterId);
    setError(null);

    try {
      const response = await fetch(`/api/characters/library/${characterId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete character");
      }

      setCharacters(characters.filter((c) => c.id !== characterId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete character");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B12] text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
            <p className="mt-4 text-gray-400">Loading your character library...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white py-12 relative">
      {/* Ambient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-cyan-400 hover:text-cyan-300 text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Character Library
          </h1>
          <p className="text-gray-400">
            Your saved characters that can be reused in any game
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {characters.length === 0 ? (
          <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-200 mb-2">
              No Saved Characters Yet
            </h2>
            <p className="text-gray-400 mb-6">
              Create a character in a game and save it to your library to reuse it later
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <div
                key={character.id}
                className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all"
              >
                {/* Character Image */}
                <div className="relative h-48 bg-gray-800">
                  {character.imageUrl ? (
                    <img
                      src={character.imageUrl}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      No Image
                    </div>
                  )}
                </div>

                {/* Character Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-200 mb-1">
                    {character.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {character.fusionIngredients}
                  </p>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {character.description}
                    </p>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-400 mb-1">
                      Abilities:
                    </h4>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      {character.abilities.slice(0, 2).map((ability, i) => (
                        <li key={i} className="truncate">
                          • {ability}
                        </li>
                      ))}
                      {character.abilities.length > 2 && (
                        <li className="text-cyan-400">
                          +{character.abilities.length - 2} more
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(character.id)}
                      disabled={deletingId === character.id}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
                    >
                      {deletingId === character.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

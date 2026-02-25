"use client";

import { CharacterBuilder } from "@/components/character/CharacterBuilder";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function CharacterCreateClient({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [showLibrary, setShowLibrary] = useState(false);

  const handleUseLibraryCharacter = async (characterId: string) => {
    try {
      const response = await fetch(`/api/characters/library/${characterId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.error?.message || "Failed to use character");
        return;
      }

      router.push(`/game/${gameId}/lobby`);
    } catch (err) {
      alert("An error occurred while using the character");
    }
  };

  if (showLibrary) {
    return (
      <div className="min-h-screen bg-[#0B0B12] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => setShowLibrary(false)}
            className="mb-6 text-cyan-400 hover:text-cyan-300 text-sm"
          >
            ← Back to Create New
          </button>
          <CharacterLibrarySelector
            gameId={gameId}
            onSelect={handleUseLibraryCharacter}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Create Character
          </h1>
          <button
            onClick={() => setShowLibrary(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-all hover:shadow-lg hover:shadow-purple-500/50"
          >
            Use Saved Character
          </button>
        </div>
        <CharacterBuilder
          gameId={gameId}
          onCharacterCreated={() => {
            router.push(`/game/${gameId}/lobby`);
          }}
        />
      </div>
    </div>
  );
}

function CharacterLibrarySelector({
  gameId,
  onSelect,
}: {
  gameId: string;
  onSelect: (characterId: string) => void;
}) {
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        <p className="mt-4 text-gray-400">Loading your saved characters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-md">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-xl font-semibold text-gray-200 mb-2">
          No Saved Characters
        </h2>
        <p className="text-gray-400">
          You don't have any saved characters yet. Create a new character and save it to your library!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-200 mb-4">
        Select a Character from Your Library
      </h2>
      <div className="grid md:grid-cols-2 gap-4">
        {characters.map((character) => (
          <div
            key={character.id}
            className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all"
          >
            <div className="flex gap-4 p-4">
              {character.imageUrl && (
                <div className="w-24 h-24 flex-shrink-0">
                  <img
                    src={character.imageUrl}
                    alt={character.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-200 mb-1 truncate">
                  {character.name}
                </h3>
                <p className="text-sm text-gray-400 mb-2 truncate">
                  {character.fusionIngredients}
                </p>
                <button
                  onClick={() => onSelect(character.id)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
                >
                  Use This Character
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface CharacterFormData {
  fusionIngredients: string;
  description: string;
}

interface CharacterBuilderProps {
  gameId: string;
  onCharacterCreated?: (character: any) => void;
}

export function CharacterBuilder({
  gameId,
  onCharacterCreated,
}: CharacterBuilderProps) {
  const [formData, setFormData] = useState<CharacterFormData>({
    fusionIngredients: "",
    description: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  const handleInputChange = (
    field: keyof CharacterFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/characters/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to create character");
        return;
      }

      setCreatedCharacter(data.character);
      if (onCharacterCreated) {
        onCharacterCreated(data.character);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!createdCharacter?.id) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/characters/${createdCharacter.id}/regenerate-image`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (response.status === 429) {
          setError(
            data.details ||
              "Rate limit exceeded. Please wait before regenerating again."
          );
        } else {
          setError(data.error || "Failed to regenerate image");
        }
        return;
      }

      setCreatedCharacter(data.character);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!createdCharacter) return;

    setIsSavingToLibrary(true);
    setError(null);

    try {
      const response = await fetch("/api/characters/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createdCharacter.name,
          fusionIngredients: createdCharacter.fusionIngredients,
          description: createdCharacter.description,
          abilities: createdCharacter.abilities,
          weakness: createdCharacter.weakness,
          imageUrl: createdCharacter.imageUrl,
          imagePrompt: createdCharacter.imagePrompt,
          powerSheet: createdCharacter.powerSheet,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "Failed to save character to library");
        return;
      }

      setSavedToLibrary(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  // Show success view with character preview
  if (createdCharacter) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Character Created!
        </h2>

        <div className="space-y-6">
          {/* Character Image */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 mb-4">
              <img
                src={createdCharacter.imageUrl}
                alt={createdCharacter.name}
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
              {isRegenerating && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                  <div className="text-white text-sm">Regenerating...</div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRegenerateImage}
                disabled={isRegenerating || isSavingToLibrary}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isRegenerating ? "Regenerating..." : "Regenerate Image"}
              </button>
              <button
                onClick={handleSaveToLibrary}
                disabled={isRegenerating || isSavingToLibrary || savedToLibrary}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSavingToLibrary ? "Saving..." : savedToLibrary ? "✓ Saved to Library" : "Save to Library"}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {savedToLibrary && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">Character saved to your library! You can reuse it in future games.</p>
            </div>
          )}

          {/* Character Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {createdCharacter.name}
              </h3>
              <p className="text-sm text-gray-600">
                {createdCharacter.fusionIngredients}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Description
              </h4>
              <p className="text-sm text-gray-600">
                {createdCharacter.description}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Abilities
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-600">
                {createdCharacter.abilities.map((ability: string, i: number) => (
                  <li key={i}>{ability}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                Weakness
              </h4>
              <p className="text-sm text-gray-600">
                {createdCharacter.weakness}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show character creation form
  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Create Your Character
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Fusion Ingredients */}
        <div>
          <label
            htmlFor="fusionIngredients"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Fusion Ingredients <span className="text-red-500">*</span>
          </label>
          <input
            id="fusionIngredients"
            type="text"
            value={formData.fusionIngredients}
            onChange={(e) =>
              handleInputChange("fusionIngredients", e.target.value)
            }
            required
            disabled={isLoading}
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., Homelander + Charizard + Rikishi"
          />
          <p className="mt-1 text-xs text-gray-500">
            The characters you're fusing together ({formData.fusionIngredients.length}/200)
          </p>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            required
            disabled={isLoading}
            maxLength={1000}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            placeholder="Describe your character's appearance, personality, backstory, and what makes them unique. The AI will infer abilities and weaknesses from this description and the fusion ingredients."
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/1000 characters
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Character...
            </span>
          ) : (
            "Create Character"
          )}
        </button>
      </form>

      {/* Epic Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Forging Your Character...
            </h3>
            
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-shimmer"></div>
              </div>

              {/* Loading Steps */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Analyzing fusion ingredients...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-100"></div>
                  <span>Generating abilities and weaknesses...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse delay-200"></div>
                  <span>Creating character image...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-300"></div>
                  <span>Calculating power sheet...</span>
                </div>
              </div>

              <p className="text-center text-gray-500 text-xs mt-4">
                This may take 30-60 seconds...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

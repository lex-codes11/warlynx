"use client";

import { useState } from "react";

interface CharacterFormData {
  name: string;
  fusionIngredients: string;
  description: string;
  abilities: string[];
  weakness: string;
  alignment: string;
  archetype: string;
  tags: string[];
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
    name: "",
    fusionIngredients: "",
    description: "",
    abilities: ["", "", ""],
    weakness: "",
    alignment: "",
    archetype: "",
    tags: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [createdCharacter, setCreatedCharacter] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleInputChange = (
    field: keyof CharacterFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setValidationErrors([]);
  };

  const handleAbilityChange = (index: number, value: string) => {
    const newAbilities = [...formData.abilities];
    newAbilities[index] = value;
    setFormData((prev) => ({ ...prev, abilities: newAbilities }));
    setError(null);
    setValidationErrors([]);
  };

  const addAbility = () => {
    if (formData.abilities.length < 6) {
      setFormData((prev) => ({
        ...prev,
        abilities: [...prev.abilities, ""],
      }));
    }
  };

  const removeAbility = (index: number) => {
    if (formData.abilities.length > 3) {
      const newAbilities = formData.abilities.filter((_, i) => i !== index);
      setFormData((prev) => ({ ...prev, abilities: newAbilities }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors([]);

    try {
      const response = await fetch("/api/characters/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId,
          ...formData,
          alignment: formData.alignment || null,
          archetype: formData.archetype || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          setValidationErrors(data.details);
        } else {
          setError(data.error || "Failed to create character");
        }

        // Preserve input on failure (Requirement 4.8)
        if (data.preservedInput) {
          setFormData(data.preservedInput);
        }
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
    if (!createdCharacter) return;

    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/characters/${createdCharacter.id}/regenerate-image`,
        {
          method: "POST",
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

            <button
              onClick={handleRegenerateImage}
              disabled={isRegenerating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate Image"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
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

            {createdCharacter.alignment && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Alignment
                </h4>
                <p className="text-sm text-gray-600">
                  {createdCharacter.alignment}
                </p>
              </div>
            )}

            {createdCharacter.archetype && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">
                  Archetype
                </h4>
                <p className="text-sm text-gray-600">
                  {createdCharacter.archetype}
                </p>
              </div>
            )}

            {createdCharacter.tags && createdCharacter.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {createdCharacter.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-600 mb-2">
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-sm text-red-600">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Character Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Character Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            required
            disabled={isLoading}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., Charizard Prime"
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.name.length}/100 characters
          </p>
        </div>

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
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            placeholder="Describe your character's appearance, personality, and backstory..."
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.description.length}/500 characters
          </p>
        </div>

        {/* Abilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Abilities <span className="text-red-500">*</span> (3-6 required)
          </label>
          <div className="space-y-2">
            {formData.abilities.map((ability, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={ability}
                  onChange={(e) => handleAbilityChange(index, e.target.value)}
                  required
                  disabled={isLoading}
                  maxLength={100}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder={`Ability ${index + 1}`}
                />
                {formData.abilities.length > 3 && (
                  <button
                    type="button"
                    onClick={() => removeAbility(index)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {formData.abilities.length < 6 && (
            <button
              type="button"
              onClick={addAbility}
              disabled={isLoading}
              className="mt-2 px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Add Ability
            </button>
          )}
        </div>

        {/* Weakness */}
        <div>
          <label
            htmlFor="weakness"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Weakness <span className="text-red-500">*</span>
          </label>
          <input
            id="weakness"
            type="text"
            value={formData.weakness}
            onChange={(e) => handleInputChange("weakness", e.target.value)}
            required
            disabled={isLoading}
            maxLength={200}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="e.g., Vulnerable to water attacks"
          />
          <p className="mt-1 text-xs text-gray-500">
            {formData.weakness.length}/200 characters
          </p>
        </div>

        {/* Optional Fields */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Optional Details
          </h3>

          {/* Alignment */}
          <div className="mb-4">
            <label
              htmlFor="alignment"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Alignment
            </label>
            <input
              id="alignment"
              type="text"
              value={formData.alignment}
              onChange={(e) => handleInputChange("alignment", e.target.value)}
              disabled={isLoading}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., Chaotic Good"
            />
          </div>

          {/* Archetype */}
          <div className="mb-4">
            <label
              htmlFor="archetype"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Archetype
            </label>
            <input
              id="archetype"
              type="text"
              value={formData.archetype}
              onChange={(e) => handleInputChange("archetype", e.target.value)}
              disabled={isLoading}
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="e.g., Tank, Healer, DPS"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={isLoading}
                maxLength={30}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-2"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      disabled={isLoading}
                      className="text-blue-700 hover:text-blue-900 focus:outline-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Creating Character..." : "Create Character"}
        </button>
      </form>
    </div>
  );
}

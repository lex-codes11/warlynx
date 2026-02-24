"use client";

import { useState, useEffect, useRef } from "react";
import { generateAttributes } from "@/lib/ai/attribute-generator";
import { GAME_ENHANCEMENT_CONSTANTS } from "@/types/game-enhancements";
import { createSubscriptionManager, RealtimeSubscriptionManager } from "@/lib/realtime/subscription-manager";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface CharacterCreationFormProps {
  gameId: string;
  userId?: string; // Optional: for typing indicators
  enableTypingIndicators?: boolean; // Optional: enable real-time typing
  onCharacterCreated?: (character: any) => void;
}

export function CharacterCreationForm({
  gameId,
  userId,
  enableTypingIndicators = false,
  onCharacterCreated,
}: CharacterCreationFormProps) {
  const [description, setDescription] = useState("");
  const [abilities, setAbilities] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxLength = GAME_ENHANCEMENT_CONSTANTS.MAX_DESCRIPTION_LENGTH;
  const currentLength = description.length;
  const remainingChars = maxLength - currentLength;

  // Real-time subscription manager (optional)
  const subscriptionManagerRef = useRef<RealtimeSubscriptionManager | null>(null);

  // Initialize subscription manager if typing indicators are enabled
  useEffect(() => {
    if (!enableTypingIndicators || !userId) {
      return;
    }

    const manager = createSubscriptionManager();
    subscriptionManagerRef.current = manager;

    // Subscribe to session for typing indicators
    manager.subscribeToSession({
      sessionId: gameId,
      callbacks: {
        // We don't need to handle incoming typing events in this form
        // but we need the subscription to broadcast our typing status
      },
    });

    // Cleanup on unmount
    return () => {
      manager.unsubscribe();
    };
  }, [gameId, userId, enableTypingIndicators]);

  // Typing indicator hook (only active if enabled)
  const { handleTypingStart, handleTypingStop } = useTypingIndicator({
    subscriptionManager: subscriptionManagerRef.current,
    userId: userId || '',
    enabled: enableTypingIndicators && !!userId,
  });

  // Handle description change with character limit enforcement
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let value = e.target.value;
    
    // Enforce 1000 character limit (Requirement 12.1, 12.3)
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }
    
    setDescription(value);
    setError(null);
    
    // Requirement 11.1: Broadcast typing status when user types
    if (enableTypingIndicators) {
      handleTypingStart();
    }
    
    // Reset generated attributes when description changes
    if (hasGenerated) {
      setHasGenerated(false);
      setAbilities([]);
      setWeaknesses([]);
    }
  };

  // Handle paste with truncation (Requirement 12.4)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const currentText = description;
    const selectionStart = e.currentTarget.selectionStart;
    const selectionEnd = e.currentTarget.selectionEnd;

    // Calculate new text after paste
    const beforeSelection = currentText.substring(0, selectionStart);
    const afterSelection = currentText.substring(selectionEnd);
    const newText = beforeSelection + pastedText + afterSelection;

    // Truncate to max length if needed
    if (newText.length > maxLength) {
      const truncated = newText.substring(0, maxLength);
      setDescription(truncated);
    } else {
      setDescription(newText);
    }

    // Reset generated attributes
    if (hasGenerated) {
      setHasGenerated(false);
      setAbilities([]);
      setWeaknesses([]);
    }
  };

  // Generate attributes from description
  const handleGenerateAttributes = async () => {
    if (!description.trim()) {
      setError("Please provide a character description");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Call AttributeGeneratorService (Requirements 2.1, 2.2)
      const result = await generateAttributes(description);

      if (!result.success) {
        setError(result.error || "Failed to generate attributes");
        return;
      }

      setAbilities(result.abilities);
      setWeaknesses(result.weaknesses);
      setHasGenerated(true);
    } catch (err) {
      setError("An unexpected error occurred while generating attributes");
      console.error("Attribute generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit character creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasGenerated) {
      setError("Please generate abilities and weaknesses first");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // TODO: Call API to create character with generated attributes
      // This will be implemented when the character creation API is ready
      const characterData = {
        gameId,
        description,
        abilities,
        weaknesses,
      };

      console.log("Creating character:", characterData);

      // Placeholder for API call
      // const response = await fetch("/api/characters/create-enhanced", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(characterData),
      // });

      // For now, simulate success
      if (onCharacterCreated) {
        onCharacterCreated(characterData);
      }
    } catch (err) {
      setError("Failed to create character");
      console.error("Character creation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {/* Character Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Character Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={handleDescriptionChange}
            onPaste={handlePaste}
            required
            disabled={isGenerating || isSubmitting}
            maxLength={maxLength}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            placeholder="Describe your character's appearance, personality, backstory, and unique traits..."
          />
          {/* Character Counter (Requirements 12.2) */}
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-gray-500">
              {currentLength} / {maxLength} characters
            </span>
            <span
              className={`font-medium ${
                remainingChars < 100
                  ? "text-orange-600"
                  : remainingChars === 0
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {remainingChars} remaining
            </span>
          </div>
        </div>

        {/* Generate Button */}
        {!hasGenerated && (
          <button
            type="button"
            onClick={handleGenerateAttributes}
            disabled={!description.trim() || isGenerating}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
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
                Generating Attributes...
              </span>
            ) : (
              "Generate Abilities & Weaknesses"
            )}
          </button>
        )}

        {/* Generated Abilities (Read-only, Requirement 2.4) */}
        {hasGenerated && abilities.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Generated Abilities
            </label>
            <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-md">
              {abilities.map((ability, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="font-medium text-green-700">
                    {index + 1}.
                  </span>
                  <span>{ability}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Weaknesses (Read-only, Requirement 2.4) */}
        {hasGenerated && weaknesses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Generated Weaknesses
            </label>
            <div className="space-y-2 p-4 bg-red-50 border border-red-200 rounded-md">
              {weaknesses.map((weakness, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="font-medium text-red-700">
                    {index + 1}.
                  </span>
                  <span>{weakness}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regenerate Button */}
        {hasGenerated && (
          <button
            type="button"
            onClick={handleGenerateAttributes}
            disabled={isGenerating || isSubmitting}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? "Regenerating..." : "Regenerate Attributes"}
          </button>
        )}

        {/* Submit Button */}
        {hasGenerated && (
          <button
            type="submit"
            disabled={isSubmitting || isGenerating}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Creating Character..." : "Create Character"}
          </button>
        )}
      </form>
    </div>
  );
}

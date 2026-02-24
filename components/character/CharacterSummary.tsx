"use client";

import { Character } from "@/types/game-enhancements";

interface CharacterSummaryProps {
  character: Character;
  onEdit: () => void;
  onReady: () => void;
  isEditable?: boolean;
}

/**
 * CharacterSummary Component
 * 
 * Displays complete character information after creation.
 * Provides edit functionality and ready state management.
 * 
 * Requirements:
 * - 3.1: Display complete character summary
 * - 3.2: Provide edit functionality
 * - 4.1: Display "Ready" button
 * - 4.2: Mark player as ready
 * - 4.4: Disable edit when ready
 */
export function CharacterSummary({
  character,
  onEdit,
  onReady,
  isEditable = true,
}: CharacterSummaryProps) {
  const isReady = character.isReady;
  const canEdit = isEditable && !isReady;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Character Summary
        </h2>
        
        {/* Ready State Indicator (Requirement 4.4) */}
        {isReady && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 border border-green-300 rounded-full">
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-green-700">Ready</span>
          </div>
        )}
      </div>

      {/* Character Image */}
      {character.imageUrl && (
        <div className="mb-6">
          <img
            src={character.imageUrl}
            alt={character.name || "Character"}
            className="w-full h-64 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Character Name */}
      {character.name && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Name</h3>
          <p className="text-lg font-semibold text-gray-900">{character.name}</p>
        </div>
      )}

      {/* Character Description (Requirement 3.1) */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {character.description}
        </p>
      </div>

      {/* Abilities (Requirement 3.1) */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Abilities</h3>
        <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-md">
          {character.abilities && character.abilities.length > 0 ? (
            character.abilities.map((ability, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="font-medium text-green-700">
                  {index + 1}.
                </span>
                <span>{ability}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No abilities generated</p>
          )}
        </div>
      </div>

      {/* Weaknesses (Requirement 3.1) */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Weaknesses</h3>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          {character.weakness ? (
            <p className="text-sm text-gray-700">{character.weakness}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No weaknesses generated</p>
          )}
        </div>
      </div>

      {/* Statistics (Requirement 3.1) */}
      {character.powerSheet && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Statistics</h3>
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div>
              <p className="text-xs text-gray-600">Health</p>
              <p className="text-lg font-semibold text-gray-900">
                {character.powerSheet.hp} / {character.powerSheet.maxHp}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Level</p>
              <p className="text-lg font-semibold text-gray-900">
                {character.powerSheet.level}
              </p>
            </div>
          </div>
          
          {/* Attributes */}
          {character.powerSheet.attributes && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="text-sm">
                <span className="text-gray-600">Strength:</span>{" "}
                <span className="font-medium text-gray-900">
                  {character.powerSheet.attributes.strength}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Agility:</span>{" "}
                <span className="font-medium text-gray-900">
                  {character.powerSheet.attributes.agility}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Intelligence:</span>{" "}
                <span className="font-medium text-gray-900">
                  {character.powerSheet.attributes.intelligence}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Charisma:</span>{" "}
                <span className="font-medium text-gray-900">
                  {character.powerSheet.attributes.charisma}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Endurance:</span>{" "}
                <span className="font-medium text-gray-900">
                  {character.powerSheet.attributes.endurance}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {/* Edit Button (Requirements 3.2, 4.4) */}
        <button
          onClick={onEdit}
          disabled={!canEdit}
          className={`flex-1 py-3 px-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
            canEdit
              ? "bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          title={isReady ? "Cannot edit after marking ready" : "Edit character"}
        >
          Edit Character
        </button>

        {/* Ready Button (Requirements 4.1, 4.2) */}
        {!isReady && (
          <button
            onClick={onReady}
            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            I'm Ready!
          </button>
        )}
      </div>

      {/* Ready State Message */}
      {isReady && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700 text-center">
            You're ready! Waiting for other players...
          </p>
        </div>
      )}
    </div>
  );
}

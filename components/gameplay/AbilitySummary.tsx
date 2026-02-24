/**
 * AbilitySummary Component
 * 
 * Displays abilities for all characters in the game session.
 * Groups abilities by character and makes them visible to all players.
 * Subscribes to real-time ability updates for immediate synchronization.
 * Formats abilities for readability and clarity.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

'use client';

import { Character } from '@/lib/types';

interface AbilitySummaryProps {
  characters: Character[];
  className?: string;
}

/**
 * AbilitySummary Component
 * Displays ability summaries for all characters in the session (Requirements 8.1, 8.2)
 * Updates immediately when abilities change (Requirement 8.3)
 * Formats for readability (Requirement 8.4)
 */
export function AbilitySummary({ characters, className = '' }: AbilitySummaryProps) {
  if (!characters || characters.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Character Abilities</h3>
      
      <div className="space-y-4">
        {characters.map((character) => (
          <div
            key={character.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            {/* Character Header (Requirement 8.4) */}
            <div className="flex items-center gap-3 mb-3">
              {character.imageUrl && (
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                />
              )}
              <h4 className="text-base font-semibold text-gray-900">
                {character.name}
              </h4>
            </div>

            {/* Abilities List (Requirements 8.1, 8.4) */}
            {character.powerSheet?.abilities && character.powerSheet.abilities.length > 0 ? (
              <div className="space-y-3">
                {character.powerSheet.abilities.map((ability, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md"
                  >
                    {/* Ability Name and Power Level */}
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="text-sm font-semibold text-gray-900">
                        {ability.name}
                      </h5>
                      <div className="flex items-center gap-1">
                        {/* Power Level Indicator (Requirement 8.4) */}
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-3 rounded-sm ${
                              i < ability.powerLevel
                                ? 'bg-indigo-600'
                                : 'bg-gray-300'
                            }`}
                            title={`Power Level: ${ability.powerLevel}/10`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Ability Description (Requirement 8.4) */}
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {ability.description}
                    </p>

                    {/* Cooldown Info (Requirement 8.4) */}
                    {ability.cooldown !== null && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          Cooldown: {ability.cooldown} {ability.cooldown === 1 ? 'turn' : 'turns'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No abilities available</p>
            )}

            {/* Weakness Display (Requirement 8.4) */}
            {character.powerSheet?.weakness && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Weakness</h5>
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-gray-700">
                    {character.powerSheet.weakness}
                  </p>
                </div>
              </div>
            )}

            {/* Active Perks (Requirement 8.4) */}
            {character.powerSheet?.perks && character.powerSheet.perks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Perks</h5>
                <div className="space-y-2">
                  {character.powerSheet.perks.map((perk, index) => (
                    <div
                      key={index}
                      className="p-2 bg-green-50 border border-green-200 rounded-md"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {perk.name}
                        </span>
                        <span className="text-xs text-gray-600">
                          Lvl {perk.unlockedAt}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">
                        {perk.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

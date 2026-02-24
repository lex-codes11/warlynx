/**
 * StatsDisplay Component
 * 
 * Renders stat bars for all characters in the game session.
 * Displays health, energy, and other stats with visual bars.
 * Color-codes bars based on stat levels (e.g., red for low health).
 * Visible to all players with real-time stat updates.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

'use client';

import { Character } from '@/lib/types';

interface StatsDisplayProps {
  characters: Character[];
  className?: string;
}

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  color: 'health' | 'energy' | 'neutral';
}

/**
 * StatBar Component
 * Renders a single stat bar with label and percentage fill
 */
function StatBar({ label, current, max, color }: StatBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  
  // Color-code based on stat level (Requirement 7.1)
  const getBarColor = () => {
    if (color === 'health') {
      if (percentage <= 25) return 'bg-red-600';
      if (percentage <= 50) return 'bg-orange-500';
      if (percentage <= 75) return 'bg-yellow-500';
      return 'bg-green-600';
    }
    
    if (color === 'energy') {
      if (percentage <= 25) return 'bg-purple-400';
      if (percentage <= 50) return 'bg-purple-500';
      return 'bg-purple-600';
    }
    
    return 'bg-blue-600';
  };

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-600">
          {current} / {max}
        </span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * StatsDisplay Component
 * Displays stat bars for all characters in the session (Requirements 7.1, 7.3)
 */
export function StatsDisplay({ characters, className = '' }: StatsDisplayProps) {
  if (!characters || characters.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Character Stats</h3>
      
      <div className="space-y-4">
        {characters.map((character) => (
          <div
            key={character.id}
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            {/* Character Name (Requirement 7.4) */}
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

            {/* Health Bar (Requirement 7.1, 7.4) */}
            <StatBar
              label="Health"
              current={character.powerSheet.hp}
              max={character.powerSheet.maxHp}
              color="health"
            />

            {/* Level Display */}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">Level</span>
              <span className="font-semibold text-gray-900">
                {character.powerSheet.level}
              </span>
            </div>

            {/* Attributes (Requirement 7.1, 7.4) */}
            {character.powerSheet.attributes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Strength:</span>
                    <span className="font-medium text-gray-900">
                      {character.powerSheet.attributes.strength}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Agility:</span>
                    <span className="font-medium text-gray-900">
                      {character.powerSheet.attributes.agility}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Intelligence:</span>
                    <span className="font-medium text-gray-900">
                      {character.powerSheet.attributes.intelligence}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Charisma:</span>
                    <span className="font-medium text-gray-900">
                      {character.powerSheet.attributes.charisma}
                    </span>
                  </div>
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-600">Endurance:</span>
                    <span className="font-medium text-gray-900">
                      {character.powerSheet.attributes.endurance}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Statuses */}
            {character.powerSheet.statuses && character.powerSheet.statuses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Active Effects:</p>
                <div className="flex flex-wrap gap-1">
                  {character.powerSheet.statuses.map((status, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                      title={status.description}
                    >
                      {status.name} ({status.duration})
                    </span>
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

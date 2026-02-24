/**
 * AbilitySummaryContainer Component
 * 
 * Container component that wraps AbilitySummary with real-time updates.
 * Subscribes to character updates and automatically refreshes ability data.
 * 
 * Requirements: 8.3 (Real-time ability updates)
 */

'use client';

import { useCharacterList } from '@/hooks/useCharacterSync';
import { AbilitySummary } from './AbilitySummary';
import { Character } from '@/lib/types';

interface AbilitySummaryContainerProps {
  gameId: string;
  initialCharacters: Character[];
  className?: string;
}

/**
 * Container component that provides real-time ability updates
 * 
 * This component uses the useCharacterList hook to subscribe to character updates,
 * which includes ability changes. When abilities are updated in the database,
 * the real-time subscription automatically updates the local state and re-renders
 * the AbilitySummary component.
 * 
 * Requirement 8.3: Subscribe to real-time ability updates
 */
export function AbilitySummaryContainer({
  gameId,
  initialCharacters,
  className,
}: AbilitySummaryContainerProps) {
  // Subscribe to real-time character updates (includes ability updates)
  const { characters, isConnected, error } = useCharacterList({
    gameId,
    initialCharacters,
  });

  // Show connection status for debugging (optional)
  if (error) {
    console.error('Real-time connection error:', error);
  }

  return (
    <div className="relative">
      {/* Optional: Connection indicator */}
      {!isConnected && (
        <div className="absolute top-0 right-0 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
          Reconnecting...
        </div>
      )}
      
      {/* Render AbilitySummary with real-time updated characters */}
      <AbilitySummary characters={characters} className={className} />
    </div>
  );
}

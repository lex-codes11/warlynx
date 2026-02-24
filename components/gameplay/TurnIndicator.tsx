/**
 * TurnIndicator Component
 * 
 * Displays a prominent visual indicator showing whose turn it is.
 * Highlights the active player and shows turn order.
 * Visually distinguishes the active player from others.
 * Subscribes to turn change events for real-time updates.
 * 
 * Requirements: 10.2, 10.3, 10.4
 */

'use client';

import { Player } from '@/lib/types';

interface TurnIndicatorProps {
  currentPlayerId: string;
  players: Player[];
  className?: string;
}

/**
 * TurnIndicator Component
 * 
 * Displays turn order with prominent highlighting of the active player.
 * Updates immediately when turn changes (Requirement 10.3).
 */
export function TurnIndicator({
  currentPlayerId,
  players,
  className = '',
}: TurnIndicatorProps) {
  if (!players || players.length === 0) {
    return null;
  }

  // Find the current player
  const currentPlayer = players.find((p) => p.userId === currentPlayerId);

  return (
    <div className={`w-full ${className}`}>
      {/* Prominent Turn Indicator (Requirement 10.2) */}
      <div className="mb-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium text-blue-100">Current Turn</p>
              <p className="text-xl font-bold text-white">
                {currentPlayer?.displayName || 'Unknown Player'}
              </p>
            </div>
          </div>
          {currentPlayer?.avatar && (
            <img
              src={currentPlayer.avatar}
              alt={currentPlayer.displayName}
              className="w-12 h-12 rounded-full border-3 border-white shadow-md object-cover"
            />
          )}
        </div>
      </div>

      {/* Turn Order Display (Requirement 10.2) */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Turn Order</h3>
        <div className="space-y-2">
          {players.map((player, index) => {
            const isActive = player.userId === currentPlayerId;

            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? 'bg-blue-50 border-2 border-blue-500 shadow-md scale-105'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }
                `}
              >
                {/* Turn Order Number */}
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                    ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 text-gray-700'
                    }
                  `}
                >
                  {index + 1}
                </div>

                {/* Player Avatar */}
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.displayName}
                    className={`
                      w-10 h-10 rounded-full object-cover
                      ${
                        isActive
                          ? 'border-2 border-blue-500 ring-2 ring-blue-200'
                          : 'border-2 border-gray-300'
                      }
                    `}
                  />
                ) : (
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                      ${
                        isActive
                          ? 'bg-blue-500 text-white border-2 border-blue-600'
                          : 'bg-gray-300 text-gray-700 border-2 border-gray-400'
                      }
                    `}
                  >
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Player Name (Requirement 10.4 - Visual Distinction) */}
                <div className="flex-1">
                  <p
                    className={`
                      font-semibold
                      ${isActive ? 'text-blue-900 text-lg' : 'text-gray-700 text-base'}
                    `}
                  >
                    {player.displayName}
                  </p>
                  {isActive && (
                    <p className="text-xs text-blue-600 font-medium">
                      ⚡ Active Turn
                    </p>
                  )}
                </div>

                {/* Active Indicator Badge (Requirement 10.4) */}
                {isActive && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-green-600">
                      Playing
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

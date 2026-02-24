/**
 * MoveSelector Component
 * 
 * Displays 4 AI-generated move options with A, B, C, D labels.
 * Provides custom move input field for player creativity.
 * Enables only during player's turn.
 * Handles move selection (AI or custom) and submission.
 * 
 * Requirements: 9.2, 9.3, 9.4
 */

'use client';

import { useState } from 'react';
import { MoveOptions } from '@/types/game-enhancements';

interface MoveSelectorProps {
  aiMoves: MoveOptions;
  onMoveSelected: (move: string) => void;
  isPlayerTurn: boolean;
  isLoading?: boolean;
  className?: string;
}

/**
 * MoveSelector Component
 * 
 * Displays AI-generated move options and custom input.
 * Submits selected or custom move to game system (Requirement 9.4).
 */
export function MoveSelector({
  aiMoves,
  onMoveSelected,
  isPlayerTurn,
  isLoading = false,
  className = '',
}: MoveSelectorProps) {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | 'custom' | null>(null);
  const [customMove, setCustomMove] = useState('');

  const handleOptionSelect = (option: 'A' | 'B' | 'C' | 'D') => {
    setSelectedOption(option);
    setCustomMove(''); // Clear custom input when selecting AI option
  };

  const handleCustomSelect = () => {
    setSelectedOption('custom');
  };

  const handleSubmit = () => {
    if (!isPlayerTurn || isLoading) return;

    if (selectedOption === 'custom') {
      if (customMove.trim().length === 0) {
        alert('Please enter a custom move');
        return;
      }
      onMoveSelected(customMove.trim());
    } else if (selectedOption) {
      onMoveSelected(aiMoves[selectedOption]);
    } else {
      alert('Please select a move option');
    }

    // Reset state after submission
    setSelectedOption(null);
    setCustomMove('');
  };

  if (!isPlayerTurn) {
    return (
      <div className={`w-full ${className}`}>
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
          <p className="text-gray-600 font-medium">
            Waiting for your turn...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Choose Your Move
        </h3>

        {/* AI-Generated Move Options (Requirement 9.2) */}
        <div className="space-y-3 mb-6">
          {(['A', 'B', 'C', 'D'] as const).map((option) => (
            <button
              key={option}
              onClick={() => handleOptionSelect(option)}
              disabled={isLoading}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${
                  selectedOption === option
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Option Label */}
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm flex-shrink-0
                    ${
                      selectedOption === option
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  {option}
                </div>

                {/* Move Text */}
                <div className="flex-1 pt-1">
                  <p
                    className={`
                      text-sm
                      ${
                        selectedOption === option
                          ? 'text-blue-900 font-medium'
                          : 'text-gray-700'
                      }
                    `}
                  >
                    {aiMoves[option]}
                  </p>
                </div>

                {/* Selected Indicator */}
                {selectedOption === option && (
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Custom Move Input (Requirement 9.3) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Or enter your own move:
          </label>
          <div
            className={`
              border-2 rounded-lg transition-all duration-200
              ${
                selectedOption === 'custom'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
              }
            `}
          >
            <textarea
              value={customMove}
              onChange={(e) => {
                setCustomMove(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setSelectedOption('custom');
                }
              }}
              onFocus={handleCustomSelect}
              disabled={isLoading}
              placeholder="Describe your custom action..."
              rows={3}
              className={`
                w-full p-3 rounded-lg resize-none focus:outline-none
                ${
                  selectedOption === 'custom'
                    ? 'bg-blue-50'
                    : 'bg-white'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {customMove.length} characters
          </p>
        </div>

        {/* Submit Button (Requirement 9.4) */}
        <button
          onClick={handleSubmit}
          disabled={!selectedOption || isLoading}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200
            ${
              selectedOption && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5 text-white"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Submit Move'
          )}
        </button>
      </div>
    </div>
  );
}

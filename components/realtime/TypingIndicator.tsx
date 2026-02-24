/**
 * Typing Indicator Component
 * 
 * Displays "Player X is typing..." message with animated indicator
 * when players are actively typing in input fields.
 * 
 * Requirements: 11.2, 11.3
 */

'use client';

interface TypingIndicatorProps {
  typingPlayers: string[]; // Array of player names currently typing
  className?: string;
}

export function TypingIndicator({
  typingPlayers,
  className = '',
}: TypingIndicatorProps) {
  // Hide when no players are typing
  if (typingPlayers.length === 0) {
    return null;
  }

  // Format the typing message based on number of players
  const getTypingMessage = () => {
    if (typingPlayers.length === 1) {
      return `${typingPlayers[0]} is typing`;
    } else if (typingPlayers.length === 2) {
      return `${typingPlayers[0]} and ${typingPlayers[1]} are typing`;
    } else {
      return `${typingPlayers.length} players are typing`;
    }
  };

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <span>{getTypingMessage()}</span>
      <div className="flex gap-1">
        <span className="animate-pulse animation-delay-0">.</span>
        <span className="animate-pulse animation-delay-200">.</span>
        <span className="animate-pulse animation-delay-400">.</span>
      </div>
    </div>
  );
}

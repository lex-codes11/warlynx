'use client';

/**
 * DecisionTerminal Component Module
 * 
 * Displays action selection interface with choice tiles and optional custom input.
 * Provides tactical terminal-style interface for player decision making.
 * 
 * **Validates Requirements:**
 * - 4.1: A-D choice tiles replacing plain textarea
 * - 4.2: Icon, title, and consequence hint for each option
 * - 4.3: Glow effect on hover
 * - 4.4: Optional custom action input field
 * - 4.5: Header showing "⚡ YOUR TURN — [CHARACTER NAME]"
 * - 4.6: Disabled state when not player's turn
 * - 8.1: Responsive grid layout
 * 
 * @module DecisionTerminal
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChoiceTile } from './ChoiceTile';
import { staggerContainer, staggerItem } from '@/lib/cinematic/animationVariants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { 
  GLASS_PANEL_CLASSES, 
  TYPOGRAPHY,
  cn
} from '@/lib/cinematic/themeConstants';

/**
 * Move options interface mapping letters to descriptions
 */
export interface MoveOptions {
  /** Option A description */
  A: string;
  /** Option B description */
  B: string;
  /** Option C description */
  C: string;
  /** Option D description */
  D: string;
}

/**
 * Props for the DecisionTerminal component
 */
export interface DecisionTerminalProps {
  /** Name of the character making the decision */
  characterName: string;
  /** Whether it's currently the player's turn */
  isPlayerTurn: boolean;
  /** Available move options */
  aiMoves: MoveOptions;
  /** Callback when a move is selected */
  onMoveSelected: (move: string) => void;
  /** Whether the terminal is in loading state */
  isLoading?: boolean;
}

/**
 * Helper function to extract title and hint from move description.
 * Assumes format: "Title - Hint" or just "Title"
 * 
 * @param description - Move description string
 * @returns Object with title and hint
 * 
 * @internal
 */
function parseMoveDescription(description: string): { title: string; hint: string } {
  const parts = description.split(' - ');
  if (parts.length >= 2) {
    return {
      title: parts[0].trim(),
      hint: parts.slice(1).join(' - ').trim(),
    };
  }
  return {
    title: description.trim(),
    hint: 'Execute this action',
  };
}

/**
 * Helper function to get icon for move letter.
 * 
 * @param letter - Move letter (A, B, C, or D)
 * @returns Emoji icon for the move
 * 
 * @internal
 */
function getMoveIcon(letter: 'A' | 'B' | 'C' | 'D'): string {
  const icons = {
    A: '⚔️',
    B: '🛡️',
    C: '✨',
    D: '🎯',
  };
  return icons[letter];
}

/**
 * DecisionTerminal Component
 * 
 * Displays a tactical terminal interface for action selection.
 * Features choice tiles (A-D) and optional custom action input.
 * Supports keyboard navigation (A/B/C/D keys).
 * 
 * **Features:**
 * - Four choice tiles with icons, titles, and hints (4.1, 4.2)
 * - Hover glow effects (4.3)
 * - Custom action text input (4.4)
 * - Dynamic header showing turn status (4.5)
 * - Disabled state when not player's turn (4.6)
 * - Responsive grid layout (8.1)
 * - Keyboard shortcuts (A/B/C/D keys)
 * - Staggered animation for tiles
 * 
 * **Accessibility:**
 * - Keyboard navigation support
 * - ARIA labels for inputs
 * - Focus management
 * - Respects prefers-reduced-motion
 * 
 * **Performance:**
 * - Simplified effects on mobile/low-end devices
 * 
 * @param props - Component props
 * @returns Rendered decision terminal with choice tiles and custom input
 * 
 * @example
 * ```tsx
 * const moves: MoveOptions = {
 *   A: 'Attack - Deal damage to enemy',
 *   B: 'Defend - Reduce incoming damage',
 *   C: 'Cast Spell - Use magical ability',
 *   D: 'Flee - Attempt to escape'
 * };
 * 
 * <DecisionTerminal
 *   characterName="Warrior"
 *   isPlayerTurn={true}
 *   aiMoves={moves}
 *   onMoveSelected={(move) => console.log('Selected:', move)}
 *   isLoading={false}
 * />
 * ```
 */
export function DecisionTerminal({
  characterName,
  isPlayerTurn,
  aiMoves,
  onMoveSelected,
  isLoading = false,
}: DecisionTerminalProps) {
  const [customAction, setCustomAction] = useState('');
  const prefersReducedMotion = useReducedMotion();
  const { isMobile, isLowEndDevice } = useMobileDetection();

  // Simplify effects on mobile/low-end devices
  const simplifyEffects = isMobile || isLowEndDevice;

  const handleChoiceSelect = (letter: 'A' | 'B' | 'C' | 'D') => {
    onMoveSelected(letter);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customAction.trim()) {
      onMoveSelected(customAction.trim());
      setCustomAction('');
    }
  };

  const disabled = !isPlayerTurn || isLoading;

  // Keyboard navigation: A, B, C, D keys for choice selection
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      if (key === 'A' || key === 'B' || key === 'C' || key === 'D') {
        e.preventDefault();
        handleChoiceSelect(key as 'A' | 'B' | 'C' | 'D');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, aiMoves, onMoveSelected]);

  return (
    <div className={cn(
      'w-full',
      GLASS_PANEL_CLASSES.glowCyan,
      'p-8'
    )}>
      {/* Header */}
      <div className="mb-6">
        <h3 className={cn(
          TYPOGRAPHY.header,
          'flex items-center gap-2'
        )}>
          <span className="text-yellow-400">⚡</span>
          {isPlayerTurn ? (
            <>YOUR TURN — {characterName.toUpperCase()}</>
          ) : (
            <>WAITING — {characterName.toUpperCase()}</>
          )}
        </h3>
        {!isPlayerTurn && (
          <p className="text-gray-400 text-sm mt-2">
            Waiting for other players...
          </p>
        )}
      </div>

      {/* Choice tiles grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
        variants={prefersReducedMotion ? undefined : staggerContainer}
        initial={prefersReducedMotion ? false : "initial"}
        animate={prefersReducedMotion ? false : "animate"}
      >
        {(['A', 'B', 'C', 'D'] as const).map((letter) => {
          const moveDescription = aiMoves[letter];
          const { title, hint } = parseMoveDescription(moveDescription);
          const icon = getMoveIcon(letter);

          return (
            <motion.div 
              key={letter} 
              variants={prefersReducedMotion ? undefined : staggerItem}
            >
              <ChoiceTile
                letter={letter}
                title={title}
                hint={hint}
                icon={icon}
                onSelect={() => handleChoiceSelect(letter)}
                disabled={disabled}
                simplifyEffects={simplifyEffects}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Custom action input */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.5, duration: 0.3 }}
      >
        <form onSubmit={handleCustomSubmit}>
          <div className="relative">
            <label htmlFor="custom-action" className="sr-only">
              Custom action
            </label>
            <input
              id="custom-action"
              type="text"
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              disabled={disabled}
              placeholder={disabled ? "Waiting for your turn..." : "Or type a custom action..."}
              className={cn(
                'w-full px-4 py-3 rounded-lg',
                'bg-gray-900/80 backdrop-blur-md',
                'border border-gray-700/50',
                'text-white placeholder-gray-500',
                // Simplify glow on mobile/low-end devices
                simplifyEffects 
                  ? 'focus:outline-none focus:border-cyan-500 transition-all duration-200'
                  : 'focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all duration-200',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label="Custom action input"
            />
            {customAction.trim() && !disabled && (
              <button
                type="submit"
                className={cn(
                  'absolute right-2 top-1/2 -translate-y-1/2',
                  'px-4 py-1.5 rounded-md',
                  'bg-cyan-500/20 border border-cyan-500/50',
                  'text-cyan-400 text-sm font-semibold',
                  // Simplify glow on mobile/low-end devices
                  simplifyEffects
                    ? 'hover:bg-cyan-500/30 transition-all duration-200'
                    : 'hover:bg-cyan-500/30 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900'
                )}
                aria-label="Submit custom action"
              >
                Submit
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

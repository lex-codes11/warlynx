/**
 * TurnIndicator Component Module
 * 
 * Displays a prominent visual indicator showing whose turn it is.
 * Highlights the active player and shows turn order with animations.
 * 
 * **Validates Requirements:**
 * - 6.1: Flash effect on turn change
 * - 6.2: Glass panel styling with neon glow
 * - 6.3: Active player highlighting with accent colors
 * - 6.4: Player avatars or character portraits
 * - 6.5: Animated transitions between turns
 * - 10.2: Enhanced TurnIndicator component
 * - 10.3: Immediate turn change updates
 * - 10.4: Visual distinction of active player
 * 
 * @module TurnIndicator
 */

'use client';

import { Player } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { GLASS_PANEL_CLASSES, cn } from '@/lib/cinematic/themeConstants';
import { glow, flash } from '@/lib/cinematic/animationVariants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useEffect, useState } from 'react';

/**
 * Props for the TurnIndicator component
 */
interface TurnIndicatorProps {
  /** User ID of the current active player */
  currentPlayerId: string;
  /** Array of all players in turn order */
  players: Player[];
  /** Optional CSS class name */
  className?: string;
}

/**
 * TurnIndicator Component
 * 
 * Displays turn order with prominent highlighting of the active player.
 * Features flash effect on turn changes and smooth player reordering animations.
 * 
 * **Features:**
 * - Prominent current turn display with player name (10.2)
 * - Flash effect overlay on turn change (6.1, 7.1)
 * - Glass panel styling with neon glow (6.2)
 * - Active player highlighting with ring and shadow (6.3, 10.4)
 * - Player avatars with fallback initials (6.4)
 * - Continuous glow pulse animation (6.1)
 * - Smooth layout animations for reordering (6.5)
 * - Immediate updates on turn change (10.3)
 * - Turn order numbering
 * 
 * **Accessibility:**
 * - ARIA live region for turn announcements
 * - Semantic HTML structure
 * - Respects prefers-reduced-motion
 * 
 * **Performance:**
 * - GPU-accelerated transforms
 * - Efficient layout animations
 * 
 * @param props - Component props
 * @returns Rendered turn indicator with player list
 * 
 * @example
 * ```tsx
 * const players: Player[] = [
 *   { id: 'p1', userId: 'u1', displayName: 'Alice', avatar: '/alice.png', characterId: 'c1' },
 *   { id: 'p2', userId: 'u2', displayName: 'Bob', avatar: null, characterId: 'c2' }
 * ];
 * 
 * <TurnIndicator
 *   currentPlayerId="u1"
 *   players={players}
 * />
 * ```
 */
export function TurnIndicator({
  currentPlayerId,
  players,
  className = '',
}: TurnIndicatorProps) {
  const [showFlash, setShowFlash] = useState(false);
  const [prevPlayerId, setPrevPlayerId] = useState(currentPlayerId);
  const prefersReducedMotion = useReducedMotion();

  // Trigger flash effect when turn changes (Requirement 6.1, 7.1)
  useEffect(() => {
    if (prevPlayerId !== currentPlayerId && prevPlayerId !== '') {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 500);
      return () => clearTimeout(timer);
    }
    setPrevPlayerId(currentPlayerId);
  }, [currentPlayerId, prevPlayerId]);

  if (!players || players.length === 0) {
    return null;
  }

  // Find the current player
  const currentPlayer = players.find((p) => p.userId === currentPlayerId);

  return (
    <div className={`w-full ${className}`}>
      {/* Flash Effect Overlay on Turn Change (Requirements 6.1, 7.1) */}
      <AnimatePresence>
        {showFlash && !prefersReducedMotion && (
          <motion.div
            className="fixed inset-0 bg-purple-500 pointer-events-none z-50"
            variants={flash}
            initial="initial"
            animate="animate"
            exit="initial"
          />
        )}
      </AnimatePresence>

      {/* Prominent Turn Indicator with Glass Panel (Requirements 6.2, 10.2) */}
      <motion.div 
        className={cn(
          GLASS_PANEL_CLASSES.glowPurple,
          'mb-4 p-6'
        )}
        initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
        animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4 }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Continuous glow pulse for active player indicator (Requirement 6.1) */}
            <motion.div 
              className="w-3 h-3 bg-purple-400 rounded-full"
              variants={prefersReducedMotion ? undefined : glow}
              initial={prefersReducedMotion ? false : "initial"}
              animate={prefersReducedMotion ? false : "animate"}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-purple-300">Current Turn</p>
              <p className="text-2xl font-bold text-white">
                {currentPlayer?.displayName || 'Unknown Player'}
              </p>
            </div>
          </div>
          {/* Player Avatar with glow pulse (Requirement 6.4) */}
          {currentPlayer?.avatar ? (
            <motion.img
              src={currentPlayer.avatar}
              alt={currentPlayer.displayName}
              className="w-16 h-16 rounded-full border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] object-cover"
              variants={prefersReducedMotion ? undefined : glow}
              initial={prefersReducedMotion ? false : "initial"}
              animate={prefersReducedMotion ? false : "animate"}
            />
          ) : (
            <motion.div 
              className="w-16 h-16 rounded-full border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)] bg-purple-900/50 flex items-center justify-center font-bold text-2xl text-purple-300"
              variants={prefersReducedMotion ? undefined : glow}
              initial={prefersReducedMotion ? false : "initial"}
              animate={prefersReducedMotion ? false : "animate"}
            >
              {currentPlayer?.displayName.charAt(0).toUpperCase() || '?'}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Turn Order Display with Glass Panel (Requirements 6.2, 10.2) */}
      <div className={cn(GLASS_PANEL_CLASSES.base, 'p-6')}>
        <h3 className="text-sm font-semibold text-cyan-400 mb-4 uppercase tracking-wider">Turn Order</h3>
        <div className="space-y-3">
          {players.map((player, index) => {
            const isActive = player.userId === currentPlayerId;

            return (
              <motion.div
                key={player.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg transition-all duration-200',
                  'bg-gray-900/40 backdrop-blur-md',
                  isActive
                    ? 'ring-4 ring-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)] scale-105'
                    : 'border border-gray-700/50 hover:border-cyan-500/50'
                )}
                layout={!prefersReducedMotion} // Smooth layout animations for player reordering (Requirement 6.5)
                initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { 
                  delay: index * 0.1,
                  layout: { duration: 0.3, ease: 'easeInOut' } // Smooth reordering animation
                }}
              >
                {/* Turn Order Number */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm',
                    isActive
                      ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                      : 'bg-gray-800 text-gray-400'
                  )}
                >
                  {index + 1}
                </div>

                {/* Player Avatar (Requirement 6.4) */}
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.displayName}
                    className={cn(
                      'w-12 h-12 rounded-full object-cover',
                      isActive
                        ? 'border-2 border-purple-500 ring-2 ring-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                        : 'border-2 border-gray-600'
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
                      isActive
                        ? 'bg-purple-500 text-white border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                        : 'bg-gray-800 text-gray-400 border-2 border-gray-700'
                    )}
                  >
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Player Name (Requirement 10.4 - Visual Distinction, 6.3 - Active Highlighting) */}
                <div className="flex-1">
                  <p
                    className={cn(
                      'font-semibold',
                      isActive ? 'text-white text-lg' : 'text-gray-300 text-base'
                    )}
                  >
                    {player.displayName}
                  </p>
                  {isActive && (
                    <p className="text-xs text-purple-400 font-medium">
                      ⚡ Active Turn
                    </p>
                  )}
                </div>

                {/* Active Indicator Badge with continuous glow pulse (Requirements 10.4, 6.3, 6.1) */}
                {isActive && (
                  <motion.div 
                    className="flex items-center gap-2"
                    variants={prefersReducedMotion ? undefined : glow}
                    initial={prefersReducedMotion ? false : "initial"}
                    animate={prefersReducedMotion ? false : "animate"}
                  >
                    <motion.div 
                      className="w-2 h-2 bg-purple-400 rounded-full"
                      variants={prefersReducedMotion ? undefined : glow}
                      initial={prefersReducedMotion ? false : "initial"}
                      animate={prefersReducedMotion ? false : "animate"}
                    />
                    <span className="text-xs font-medium text-purple-400">
                      Playing
                    </span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

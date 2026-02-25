'use client';

/**
 * PowerHUD Component Module
 * 
 * Displays vital character stats in a bottom-screen heads-up display.
 * Shows HP bar, level, energy, and active status effects.
 * 
 * **Validates Requirements:**
 * - 5.1: Bottom-screen HUD display
 * - 5.2: Animated HP bar for active player
 * - 5.3: Level and Energy values display
 * - 5.4: Active buff and debuff icons
 * - 5.5: HP bar drain animation
 * - 5.6: Glass panel styling with neon accents
 * 
 * @module PowerHUD
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slideInBottom, float } from '@/lib/cinematic/animationVariants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { 
  getHPColor,
  cn,
  Z_INDEX
} from '@/lib/cinematic/themeConstants';
import { Character, StatusEffect } from './PowerCard';

/**
 * Props for the PowerHUD component
 */
export interface PowerHUDProps {
  /** Character data to display */
  character: Character;
  /** Whether the HUD should be visible */
  visible: boolean;
}

/**
 * PowerHUD Component
 * 
 * Displays a fixed bottom-screen HUD showing vital character statistics.
 * Features animated HP bar, stat displays, and floating status effect icons.
 * 
 * **Features:**
 * - Fixed bottom positioning (5.1)
 * - Animated HP bar with gradient fill (5.2)
 * - Level and HP stat displays (5.3)
 * - Buff and debuff icons with float animation (5.4)
 * - Smooth HP drain animation (5.5)
 * - Glass panel styling with backdrop blur (5.6)
 * - Slide-in animation on mount
 * - Responsive layout (stacks on mobile)
 * 
 * **Accessibility:**
 * - ARIA labels for stats
 * - Role attributes for status
 * - Respects prefers-reduced-motion
 * 
 * **Performance:**
 * - Simplified effects on mobile/low-end devices
 * - Conditional rendering when not visible
 * - GPU-accelerated transforms
 * 
 * @param props - Component props
 * @returns Rendered HUD or null if not visible
 * 
 * @example
 * ```tsx
 * const character: Character = {
 *   id: 'c1',
 *   name: 'Warrior',
 *   hp: 75,
 *   maxHp: 100,
 *   level: 10,
 *   status: [
 *     { id: 's1', name: 'Strength', icon: '💪', type: 'buff' }
 *   ],
 *   fusionTags: []
 * };
 * 
 * <PowerHUD character={character} visible={true} />
 * ```
 */
export function PowerHUD({ character, visible }: PowerHUDProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile, isLowEndDevice } = useMobileDetection();
  
  // Simplify effects on mobile/low-end devices
  const simplifyEffects = isMobile || isLowEndDevice;
  
  // Don't render if not visible or no character data
  if (!visible || !character) {
    return null;
  }

  // Ensure character has required properties with defaults
  const safeCharacter = {
    ...character,
    hp: character.hp ?? 100,
    maxHp: character.maxHp ?? 100,
    level: character.level ?? 1,
    status: character.status ?? [],
  };

  // Calculate HP percentage
  const hpPercentage = Math.max(0, Math.min(100, (safeCharacter.hp / safeCharacter.maxHp) * 100));
  const hpColor = getHPColor(safeCharacter.hp, safeCharacter.maxHp);

  // Separate buffs and debuffs
  const buffs = safeCharacter.status?.filter(s => s.type === 'buff') || [];
  const debuffs = safeCharacter.status?.filter(s => s.type === 'debuff') || [];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-cyan-500/30"
          style={{ zIndex: Z_INDEX.hud }}
          variants={prefersReducedMotion ? undefined : slideInBottom}
          initial={prefersReducedMotion ? undefined : "initial"}
          animate={prefersReducedMotion ? undefined : "animate"}
          exit={prefersReducedMotion ? undefined : "exit"}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Character Name */}
              <div className="flex-shrink-0">
                <h3 className="text-xl font-bold text-cyan-400 uppercase tracking-wide">
                  {safeCharacter.name}
                </h3>
              </div>

              {/* HP Bar - Requirement 5.2 */}
              <div className="flex-1 w-full md:w-auto">
                <HPBar
                  current={safeCharacter.hp}
                  max={safeCharacter.maxHp}
                  percentage={hpPercentage}
                  color={hpColor}
                  reducedMotion={prefersReducedMotion}
                />
              </div>

              {/* Stats Display - Requirements 5.3 */}
              <div className="flex gap-4 flex-shrink-0">
                <StatDisplay 
                  label="LVL" 
                  value={safeCharacter.level.toString()} 
                  ariaLabel={`Level ${safeCharacter.level}`}
                />
                <StatDisplay 
                  label="HP" 
                  value={`${safeCharacter.hp}/${safeCharacter.maxHp}`}
                  color={hpColor}
                  ariaLabel={`Health: ${safeCharacter.hp} out of ${safeCharacter.maxHp}`}
                />
              </div>

              {/* Status Effects - Requirement 5.4 */}
              {(buffs.length > 0 || debuffs.length > 0) && (
                <div className="flex gap-2 flex-shrink-0">
                  {buffs.map((buff) => (
                    <BuffIcon key={buff.id} effect={buff} reducedMotion={prefersReducedMotion} simplifyEffects={simplifyEffects} />
                  ))}
                  {debuffs.map((debuff) => (
                    <BuffIcon key={debuff.id} effect={debuff} reducedMotion={prefersReducedMotion} simplifyEffects={simplifyEffects} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * HPBar Component
 * 
 * Displays an animated HP bar with gradient fill and smooth drain animation.
 * Uses spring animation for natural HP changes.
 * 
 * @param props - Component props
 * @param props.current - Current HP value
 * @param props.max - Maximum HP value
 * @param props.percentage - HP percentage (0-100)
 * @param props.color - Color for the HP bar (unused, uses gradient)
 * @param props.reducedMotion - Whether to disable animations
 * @returns Rendered HP bar with label and progress
 * 
 * @internal
 */
interface HPBarProps {
  current: number;
  max: number;
  percentage: number;
  color: string;
  reducedMotion: boolean;
}

function HPBar({ current, max, percentage, color, reducedMotion }: HPBarProps) {
  return (
    <div className="space-y-1" role="status" aria-label={`Health: ${current} out of ${max}, ${Math.round(percentage)}% remaining`}>
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span className="uppercase tracking-wider font-semibold">Health</span>
        <span aria-hidden="true">{current} / {max}</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50" aria-hidden="true">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-full hp-bar-animating"
          initial={{ width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={reducedMotion ? { duration: 0 } : { 
            duration: 0.8, 
            ease: 'easeOut',
            type: 'spring',
            stiffness: 100,
            damping: 15
          }}
          onAnimationComplete={() => {
            // Remove will-change after animation completes
            const element = document.querySelector('.hp-bar-animating');
            if (element) {
              element.classList.remove('hp-bar-animating');
              element.classList.add('hp-bar-static');
            }
          }}
        />
      </div>
    </div>
  );
}

/**
 * StatDisplay Component
 * 
 * Displays a stat label and value in a glass panel badge.
 * Used for Level, HP, Energy, and other character stats.
 * 
 * @param props - Component props
 * @param props.label - Stat label (e.g., "LVL", "HP")
 * @param props.value - Stat value to display
 * @param props.color - Optional color for the value text
 * @param props.ariaLabel - Optional ARIA label for accessibility
 * @returns Rendered stat display badge
 * 
 * @internal
 */
interface StatDisplayProps {
  label: string;
  value: string;
  color?: string;
  ariaLabel?: string;
}

function StatDisplay({ label, value, color, ariaLabel }: StatDisplayProps) {
  return (
    <div 
      className="bg-gray-950/90 backdrop-blur-md rounded-lg px-4 py-2 border border-gray-800/50"
      role="status"
      aria-label={ariaLabel || `${label}: ${value}`}
    >
      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
        {label}
      </div>
      <div 
        className="text-lg font-bold"
        style={{ color: color || '#06B6D4' }}
        aria-hidden="true"
      >
        {value}
      </div>
    </div>
  );
}

/**
 * BuffIcon Component
 * 
 * Displays a status effect icon with gentle float animation.
 * Differentiates buffs (cyan) from debuffs (red) with color coding.
 * 
 * @param props - Component props
 * @param props.effect - Status effect data
 * @param props.reducedMotion - Whether to disable animations
 * @param props.simplifyEffects - Whether to simplify visual effects for performance
 * @returns Rendered buff/debuff icon with animation
 * 
 * @internal
 */
interface BuffIconProps {
  effect: StatusEffect;
  reducedMotion: boolean;
  simplifyEffects?: boolean;
}

function BuffIcon({ effect, reducedMotion, simplifyEffects = false }: BuffIconProps) {
  const bgColor = effect.type === 'buff' 
    ? 'bg-cyan-500/20 border-cyan-500/50' 
    : 'bg-red-500/20 border-red-500/50';
  
  // Simplify glow on mobile/low-end devices
  const glowColor = !simplifyEffects 
    ? (effect.type === 'buff'
      ? 'shadow-[0_0_10px_rgba(6,182,212,0.3)]'
      : 'shadow-[0_0_10px_rgba(239,68,68,0.3)]')
    : '';

  return (
    <motion.div
      className={cn(
        'w-10 h-10 flex items-center justify-center rounded-lg border backdrop-blur-sm',
        bgColor,
        glowColor
      )}
      variants={reducedMotion ? undefined : float}
      initial={reducedMotion ? false : "initial"}
      animate={reducedMotion ? false : "animate"}
      title={effect.name}
      role="status"
      aria-label={`${effect.type === 'buff' ? 'Buff' : 'Debuff'}: ${effect.name}`}
    >
      {effect.icon ? (
        <span className="text-xl" role="img" aria-hidden="true">{effect.icon}</span>
      ) : (
        <span className="text-xs font-semibold text-white uppercase" aria-hidden="true">
          {effect.name.substring(0, 2)}
        </span>
      )}
    </motion.div>
  );
}

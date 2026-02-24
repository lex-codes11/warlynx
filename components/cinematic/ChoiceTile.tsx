'use client';

/**
 * ChoiceTile Component Module
 * 
 * Displays a single choice option with letter, title, hint, and icon.
 * Interactive tile with hover effects and keyboard navigation support.
 * 
 * **Validates Requirements:**
 * - 4.1: Choice tile as part of A-D selection system
 * - 4.2: Icon, title, and hint display
 * - 4.3: Glow effect on hover
 * - 8.1: Responsive layout
 * - 8.4: Touch target sizing for mobile
 * 
 * @module ChoiceTile
 */

import React from 'react';
import { motion } from 'framer-motion';
import { scaleHover } from '@/lib/cinematic/animationVariants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { 
  GLASS_PANEL_CLASSES, 
  TYPOGRAPHY,
  cn
} from '@/lib/cinematic/themeConstants';

/**
 * Props for the ChoiceTile component
 */
export interface ChoiceTileProps {
  /** Choice letter (A, B, C, or D) */
  letter: 'A' | 'B' | 'C' | 'D';
  /** Action title */
  title: string;
  /** Consequence hint or description */
  hint: string;
  /** Emoji or icon to display */
  icon: string;
  /** Callback when tile is selected */
  onSelect: () => void;
  /** Whether the tile is disabled */
  disabled?: boolean;
  /** Whether to simplify visual effects for performance */
  simplifyEffects?: boolean;
}

/**
 * ChoiceTile Component
 * 
 * Displays a single action choice in the DecisionTerminal.
 * Features letter badge, icon, title, and hint text.
 * Provides hover effects and keyboard navigation.
 * 
 * **Features:**
 * - Letter badge (A/B/C/D) with glow
 * - Icon display
 * - Title and hint text
 * - Hover glow effect (4.3)
 * - Scale animation on hover/tap
 * - Disabled state with grayscale
 * - Focus indicators for keyboard navigation
 * - Touch-friendly sizing (8.4)
 * 
 * **Accessibility:**
 * - Keyboard focusable
 * - ARIA labels
 * - Focus ring indicators
 * - Respects prefers-reduced-motion
 * 
 * **Performance:**
 * - Simplified effects on mobile/low-end devices
 * - GPU-accelerated transforms
 * 
 * @param props - Component props
 * @returns Rendered choice tile button
 * 
 * @example
 * ```tsx
 * <ChoiceTile
 *   letter="A"
 *   title="Attack"
 *   hint="Deal damage to enemy"
 *   icon="⚔️"
 *   onSelect={() => console.log('Attack selected')}
 *   disabled={false}
 * />
 * ```
 */
export function ChoiceTile({ 
  letter, 
  title, 
  hint, 
  icon, 
  onSelect, 
  disabled = false,
  simplifyEffects = false
}: ChoiceTileProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.button
      className={cn(
        'relative w-full text-left p-6 rounded-xl transition-all duration-200',
        GLASS_PANEL_CLASSES.base,
        // Focus indicator for keyboard navigation
        'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900',
        disabled 
          ? 'opacity-50 grayscale cursor-not-allowed' 
          : simplifyEffects
            ? 'cursor-pointer hover:border-cyan-500'
            : 'cursor-pointer hover:border-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
      )}
      variants={prefersReducedMotion ? undefined : scaleHover}
      initial={prefersReducedMotion ? false : "initial"}
      whileHover={prefersReducedMotion || disabled ? undefined : "hover"}
      whileTap={prefersReducedMotion || disabled ? undefined : "tap"}
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-label={`Choice ${letter}: ${title}`}
      aria-disabled={disabled}
    >
      {/* Letter badge */}
      <div className={cn(
        'absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-cyan-500/20 border border-cyan-500/50 rounded-lg',
        !simplifyEffects && 'shadow-[0_0_10px_rgba(6,182,212,0.3)]'
      )}>
        <span className="text-xl font-bold text-cyan-400">
          {letter}
        </span>
      </div>

      {/* Icon */}
      <div className="flex items-start gap-4 mb-3">
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-500/20 border border-purple-400/30 rounded-lg ml-14">
          <span className="text-2xl" role="img" aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>

      {/* Title */}
      <h4 className={cn(
        TYPOGRAPHY.body,
        'font-semibold text-white mb-2 ml-14'
      )}>
        {title}
      </h4>

      {/* Hint */}
      <p className={cn(
        TYPOGRAPHY.hint,
        'text-gray-400 ml-14'
      )}>
        {hint}
      </p>

      {/* Hover glow effect */}
      {!disabled && (
        <motion.div 
          className="absolute inset-0 rounded-xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{
            background: 'radial-gradient(circle at center, rgba(6,182,212,0.1) 0%, transparent 70%)'
          }}
        />
      )}
    </motion.button>
  );
}

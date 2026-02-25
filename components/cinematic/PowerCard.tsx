'use client';

/**
 * PowerCard Component Module
 * 
 * Displays character information with dramatic cinematic visual treatment.
 * Features animated portraits, stat badges, status effects, and fusion tags.
 * 
 * **Validates Requirements:**
 * - 3.1: Large character portraits with glowing borders
 * - 3.2: Active player pulse animation and visual lift
 * - 3.3: HP, Level, and Status effect badges
 * - 3.4: Fusion tags under character name
 * - 3.5: Glass panel styling with neon glow effects
 * - 3.6: Damage shake animation
 * 
 * @module PowerCard
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { activePowerCard, shake, scaleHover } from '@/lib/cinematic/animationVariants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { 
  GLASS_PANEL_CLASSES, 
  BORDER_STYLES, 
  TYPOGRAPHY,
  getHPColor,
  cn
} from '@/lib/cinematic/themeConstants';

/**
 * Status effect interface
 */
export interface StatusEffect {
  /** Unique status effect identifier */
  id: string;
  /** Status effect display name */
  name: string;
  /** Optional emoji or icon */
  icon?: string;
  /** Effect type determining visual treatment */
  type: 'buff' | 'debuff';
}

/**
 * Character interface for PowerCard
 */
export interface Character {
  /** Unique character identifier */
  id: string;
  /** Character display name */
  name: string;
  /** Optional character portrait URL */
  imageUrl?: string;
  /** Current hit points */
  hp: number;
  /** Maximum hit points */
  maxHp: number;
  /** Character level */
  level: number;
  /** Active status effects (buffs/debuffs) */
  status: StatusEffect[];
  /** Optional fusion tags indicating merged characters */
  fusionTags?: string[];
}

/**
 * Props for the PowerCard component
 */
export interface PowerCardProps {
  /** Character data to display */
  character: Character;
  /** Whether this character is currently active (their turn) */
  isActive: boolean;
  /** Optional callback when character takes damage */
  onDamage?: () => void;
}

/**
 * PowerCard Component
 * 
 * Displays a character's information in a cinematic card format with animations.
 * Active characters receive pulse animations and visual emphasis.
 * Automatically triggers shake animation when character takes damage.
 * 
 * **Features:**
 * - Large character portrait with glowing border (3.1)
 * - Active state with pulse animation and scale effect (3.2)
 * - HP bar with color-coded health status (3.3)
 * - Level and stat badges (3.3)
 * - Status effect icons (buffs/debuffs) (3.3)
 * - Fusion tags for merged characters (3.4)
 * - Glass panel styling with neon glow (3.5)
 * - Damage shake animation (3.6)
 * - Placeholder avatar for missing images
 * 
 * **Accessibility:**
 * - Respects prefers-reduced-motion
 * - Semantic HTML structure
 * - ARIA labels for stats and status
 * 
 * **Performance:**
 * - Simplified effects on mobile/low-end devices
 * - GPU-accelerated transforms
 * - Pauses animations when off-screen
 * 
 * @param props - Component props
 * @returns Rendered power card with character information
 * 
 * @example
 * ```tsx
 * const character: Character = {
 *   id: 'c1',
 *   name: 'Warrior',
 *   imageUrl: '/warrior.png',
 *   hp: 75,
 *   maxHp: 100,
 *   level: 10,
 *   status: [
 *     { id: 's1', name: 'Strength', icon: '💪', type: 'buff' }
 *   ],
 *   fusionTags: ['Fire', 'Steel']
 * };
 * 
 * <PowerCard 
 *   character={character} 
 *   isActive={true}
 *   onDamage={() => console.log('Character damaged!')}
 * />
 * ```
 */
export function PowerCard({ character, isActive, onDamage }: PowerCardProps) {
  const [shouldShake, setShouldShake] = useState(false);
  const [prevHp, setPrevHp] = useState(character.hp);
  const prefersReducedMotion = useReducedMotion();
  const { isMobile, isLowEndDevice } = useMobileDetection();
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(cardRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Simplify effects on mobile/low-end devices
  const simplifyEffects = isMobile || isLowEndDevice;

  // Safely extract character data with defaults
  const charData = character as any;
  const safeCharacter = {
    id: character.id,
    name: character.name || 'Unknown',
    imageUrl: character.imageUrl,
    hp: charData.powerSheet?.hp ?? character.hp ?? 100,
    maxHp: charData.powerSheet?.maxHp ?? character.maxHp ?? 100,
    level: charData.powerSheet?.level ?? character.level ?? 1,
    status: charData.powerSheet?.statuses ?? character.status ?? [],
    fusionTags: character.fusionTags ?? [],
  };

  // Trigger shake animation when HP decreases (damage taken)
  useEffect(() => {
    if (safeCharacter.hp < prevHp) {
      setShouldShake(true);
      if (onDamage) {
        onDamage();
      }
      setTimeout(() => setShouldShake(false), 500);
    }
    setPrevHp(safeCharacter.hp);
  }, [safeCharacter.hp, prevHp, onDamage]);

  // Calculate HP percentage for color
  const hpPercentage = (safeCharacter.hp / safeCharacter.maxHp) * 100;
  const hpColor = getHPColor(safeCharacter.hp, safeCharacter.maxHp);

  // Determine border style based on active state
  const borderClass = isActive ? BORDER_STYLES.active : BORDER_STYLES.default;

  // Only animate if visible in viewport
  const shouldAnimate = isVisible && !prefersReducedMotion;

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'relative overflow-hidden rounded-xl',
        GLASS_PANEL_CLASSES.base,
        borderClass,
        // Add will-change only when active and visible
        isActive && isVisible && 'power-card-active',
        !isActive && 'power-card-inactive'
      )}
      variants={shouldAnimate ? (shouldShake ? shake : activePowerCard) : undefined}
      initial={shouldAnimate ? "inactive" : false}
      animate={shouldAnimate ? (shouldShake ? "animate" : (isActive ? "active" : "inactive")) : false}
      whileHover={shouldAnimate ? "hover" : undefined}
    >
      {/* Character Portrait - Requirement 3.1 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        {safeCharacter.imageUrl ? (
          <img
            src={safeCharacter.imageUrl}
            alt={safeCharacter.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <span className="text-6xl font-bold text-gray-600">
              {safeCharacter.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Glowing border overlay - Requirement 3.1 with continuous glow animation */}
        {/* Simplified on mobile/low-end devices for performance */}
        <motion.div 
          className={cn(
            'absolute inset-0 pointer-events-none',
            isActive && 'ring-2 ring-purple-500 ring-inset'
          )}
          animate={shouldAnimate && isActive && !simplifyEffects ? {
            boxShadow: [
              'inset 0 0 30px rgba(168,85,247,0.4)',
              'inset 0 0 50px rgba(168,85,247,0.6)',
              'inset 0 0 30px rgba(168,85,247,0.4)'
            ]
          } : {
            boxShadow: isActive && simplifyEffects 
              ? 'inset 0 0 20px rgba(168,85,247,0.3)' 
              : 'inset 0 0 0px rgba(168,85,247,0)'
          }}
          transition={shouldAnimate && !simplifyEffects ? {
            duration: 2,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut'
          } : { duration: 0 }}
        />

        {/* Stat Badges Overlay - Requirement 3.3 */}
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start">
          {/* HP Badge */}
          <StatBadge
            label="HP"
            value={`${safeCharacter.hp}/${safeCharacter.maxHp}`}
            color={hpColor}
            percentage={hpPercentage}
            ariaLabel={`Health: ${safeCharacter.hp} out of ${safeCharacter.maxHp}`}
            simplifyEffects={simplifyEffects}
          />

          {/* Level Badge */}
          <StatBadge
            label="LVL"
            value={safeCharacter.level.toString()}
            color="#06B6D4"
            ariaLabel={`Level ${safeCharacter.level}`}
            simplifyEffects={simplifyEffects}
          />
        </div>

        {/* Status Effects - Requirement 3.3 */}
        {safeCharacter.status && safeCharacter.status.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex flex-wrap gap-2">
              {safeCharacter.status.map((effect: any) => (
                <StatusBadge key={effect.id || effect.name} effect={effect} simplifyEffects={simplifyEffects} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Character Info Section */}
      <div className="p-4 space-y-2">
        {/* Character Name */}
        <h3 className={cn(TYPOGRAPHY.characterName, 'text-center')}>
          {safeCharacter.name}
        </h3>

        {/* Fusion Tags - Requirement 3.4 */}
        {safeCharacter.fusionTags && safeCharacter.fusionTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {safeCharacter.fusionTags.map((tag, index) => (
              <FusionTag key={`${tag}-${index}`} tag={tag} simplifyEffects={simplifyEffects} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * StatBadge Component
 * 
 * Displays a stat with label, value, and optional progress bar.
 * Used for HP, Level, and other character statistics.
 * 
 * @param props - Component props
 * @param props.label - Stat label (e.g., "HP", "LVL")
 * @param props.value - Stat value to display
 * @param props.color - Color for the value and progress bar
 * @param props.percentage - Optional percentage for progress bar (0-100)
 * @param props.ariaLabel - Optional ARIA label for accessibility
 * @param props.simplifyEffects - Whether to simplify visual effects for performance
 * @returns Rendered stat badge
 * 
 * @internal
 */
interface StatBadgeProps {
  label: string;
  value: string;
  color: string;
  percentage?: number;
  ariaLabel?: string;
  simplifyEffects?: boolean;
}

function StatBadge({ label, value, color, percentage, ariaLabel, simplifyEffects = false }: StatBadgeProps) {
  return (
    <div 
      className="bg-gray-900/90 backdrop-blur-md rounded-lg px-3 py-2 border border-gray-700/50 shadow-lg"
      style={{
        borderColor: percentage !== undefined ? `${color}40` : undefined,
        // Simplify glow on mobile/low-end devices
        boxShadow: percentage !== undefined && !simplifyEffects ? `0 0 10px ${color}30` : undefined
      }}
      role="status"
      aria-label={ariaLabel || `${label}: ${value}`}
    >
      <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
        {label}
      </div>
      <div 
        className="text-lg font-bold"
        style={{ color }}
        aria-hidden="true"
      >
        {value}
      </div>
      {percentage !== undefined && (
        <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden" aria-hidden="true">
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * StatusBadge Component
 * 
 * Displays a status effect icon with appropriate styling for buffs or debuffs.
 * Shows icon if available, otherwise displays abbreviated name.
 * 
 * @param props - Component props
 * @param props.effect - Status effect data
 * @param props.simplifyEffects - Whether to simplify visual effects for performance
 * @returns Rendered status badge
 * 
 * @internal
 */
interface StatusBadgeProps {
  effect: StatusEffect;
  simplifyEffects?: boolean;
}

function StatusBadge({ effect, simplifyEffects = false }: StatusBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
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
        'px-2 py-1 rounded-md border backdrop-blur-sm',
        bgColor,
        glowColor
      )}
      variants={prefersReducedMotion ? undefined : scaleHover}
      whileHover={prefersReducedMotion ? undefined : "hover"}
      title={effect.name}
      role="status"
      aria-label={`${effect.type === 'buff' ? 'Buff' : 'Debuff'}: ${effect.name}`}
    >
      {effect.icon ? (
        <span className="text-lg" role="img" aria-hidden="true">{effect.icon}</span>
      ) : (
        <span className="text-xs font-semibold text-white uppercase" aria-hidden="true">
          {effect.name.substring(0, 3)}
        </span>
      )}
    </motion.div>
  );
}

/**
 * FusionTag Component
 * 
 * Displays a fusion tag indicating which characters are merged together.
 * Styled with gradient background and glow effect.
 * 
 * @param props - Component props
 * @param props.tag - Fusion tag text to display
 * @param props.simplifyEffects - Whether to simplify visual effects for performance
 * @returns Rendered fusion tag
 * 
 * @internal
 */
interface FusionTagProps {
  tag: string;
  simplifyEffects?: boolean;
}

function FusionTag({ tag, simplifyEffects = false }: FusionTagProps) {
  // Simplify glow on mobile/low-end devices
  const glowClass = !simplifyEffects ? 'shadow-[0_0_10px_rgba(168,85,247,0.2)]' : '';
  
  return (
    <div className={cn(
      'px-3 py-1 bg-gradient-to-r from-purple-500/20 to-magenta-500/20 border border-purple-400/30 rounded-full backdrop-blur-sm',
      glowClass
    )}>
      <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">
        ⚡ {tag}
      </span>
    </div>
  );
}

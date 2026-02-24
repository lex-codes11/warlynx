/**
 * Animation Variants Module
 * 
 * Shared animation variants for cinematic UI components using framer-motion.
 * Provides reusable animation configurations for consistent motion design.
 * All variants support reduced motion preferences.
 * 
 * **Usage:**
 * Import variants and apply to motion components:
 * ```tsx
 * <motion.div variants={fadeIn} initial="initial" animate="animate" />
 * ```
 * 
 * **Performance:**
 * - Uses GPU-accelerated properties (transform, opacity)
 * - Avoids layout-triggering properties (width, height, top, left)
 * - Provides reduced motion alternatives
 * 
 * @module animationVariants
 */

import { Variants } from 'framer-motion';

/**
 * Helper function to create animation variants that respect reduced motion.
 * When reduced motion is preferred, returns instant transitions.
 * 
 * @param variants - Original animation variants
 * @param reducedMotion - Whether reduced motion is preferred
 * @returns Variants with instant transitions if reduced motion is enabled
 * 
 * @example
 * ```tsx
 * const variants = getVariants(fadeIn, prefersReducedMotion);
 * <motion.div variants={variants} />
 * ```
 */
export function getVariants(variants: Variants, reducedMotion: boolean): Variants {
  if (!reducedMotion) {
    return variants;
  }

  // Convert all variants to instant transitions
  const reducedVariants: Variants = {};
  
  for (const [key, value] of Object.entries(variants)) {
    if (typeof value === 'object' && value !== null) {
      reducedVariants[key] = {
        ...value,
        transition: { duration: 0 }
      };
    } else {
      reducedVariants[key] = value;
    }
  }

  return reducedVariants;
}

/**
 * Fade in animation with slide up effect.
 * Commonly used for new content appearing on screen.
 * 
 * @example
 * ```tsx
 * <motion.div variants={fadeIn} initial="initial" animate="animate" exit="exit" />
 * ```
 */
export const fadeIn: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Slide up animation for new content.
 * Includes easing and duration configuration.
 * 
 * @example
 * ```tsx
 * <motion.div variants={slideUp} initial="initial" animate="animate" />
 * ```
 */
export const slideUp: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  },
  exit: { opacity: 0, y: -30 },
};

/**
 * Pulse animation for active elements.
 * Continuously scales element up and down.
 * 
 * @example
 * ```tsx
 * <motion.div variants={pulse} initial="initial" animate="animate" />
 * ```
 */
export const pulse: Variants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.05, 1],
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
};

/**
 * Shake animation for damage effects.
 * Oscillates element horizontally.
 * 
 * @example
 * ```tsx
 * <motion.div variants={shake} animate="animate" />
 * ```
 */
export const shake: Variants = {
  initial: { x: 0 },
  animate: { 
    x: [-4, 4, -4, 4, -2, 2, 0],
    transition: { duration: 0.5, ease: 'easeInOut' }
  },
};

/**
 * Glow animation for highlighted elements.
 * Pulses opacity for glowing effect.
 * 
 * @example
 * ```tsx
 * <motion.div variants={glow} initial="initial" animate="animate" />
 * ```
 */
export const glow: Variants = {
  initial: { opacity: 0.7 },
  animate: { 
    opacity: [0.7, 1, 0.7],
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
};

/**
 * Flash effect for turn changes.
 * Brief opacity pulse for screen flash.
 * 
 * @example
 * ```tsx
 * <motion.div variants={flash} initial="initial" animate="animate" />
 * ```
 */
export const flash: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: [0, 0.3, 0],
    transition: { duration: 0.5, ease: 'easeInOut' }
  },
};

/**
 * Scale hover effect for interactive elements.
 * Provides tactile feedback on hover and tap.
 * 
 * @example
 * ```tsx
 * <motion.button variants={scaleHover} whileHover="hover" whileTap="tap" />
 * ```
 */
export const scaleHover: Variants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  tap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  },
};

/**
 * Slide in from bottom for HUD elements.
 * Used for bottom-screen overlays.
 * 
 * @example
 * ```tsx
 * <motion.div variants={slideInBottom} initial="initial" animate="animate" exit="exit" />
 * ```
 */
export const slideInBottom: Variants = {
  initial: { y: '100%', opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  exit: { 
    y: '100%', 
    opacity: 0,
    transition: { duration: 0.3 }
  },
};

/**
 * Float animation for buff icons.
 * Gentle vertical oscillation.
 * 
 * @example
 * ```tsx
 * <motion.div variants={float} initial="initial" animate="animate" />
 * ```
 */
export const float: Variants = {
  initial: { y: 0 },
  animate: { 
    y: [-5, 5, -5],
    transition: { 
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
};

/**
 * Stagger container for sequential animations.
 * Use with staggerItem for child elements.
 * 
 * @example
 * ```tsx
 * <motion.div variants={staggerContainer} initial="initial" animate="animate">
 *   <motion.div variants={staggerItem} />
 *   <motion.div variants={staggerItem} />
 * </motion.div>
 * ```
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    }
  },
};

/**
 * Stagger item for use with staggerContainer.
 * Child elements animate in sequence.
 * 
 * @example
 * ```tsx
 * <motion.div variants={staggerItem} />
 * ```
 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
};

/**
 * Character reveal animation for text.
 * Used for letter-by-letter reveals.
 * 
 * @example
 * ```tsx
 * {text.split('').map((char, i) => (
 *   <motion.span key={i} variants={characterReveal} />
 * ))}
 * ```
 */
export const characterReveal: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.05 }
  },
};

/**
 * Layout animation configuration for smooth position changes.
 * Apply to elements that change position in the layout.
 * 
 * @example
 * ```tsx
 * <motion.div {...layoutAnimation} />
 * ```
 */
export const layoutAnimation = {
  layout: true,
  transition: { duration: 0.3, ease: 'easeInOut' }
};

/**
 * Active player animation combining pulse, scale, and glow.
 * Used for PowerCard when character is active.
 * 
 * **Note:** will-change is applied via CSS class for frequently animated elements.
 * 
 * @example
 * ```tsx
 * <motion.div 
 *   variants={activePowerCard} 
 *   animate={isActive ? "active" : "inactive"}
 *   whileHover="hover"
 * />
 * ```
 */
export const activePowerCard: Variants = {
  inactive: { 
    scale: 1,
    opacity: 1
  },
  active: { 
    scale: [1.05, 1.08, 1.05],
    opacity: [1, 0.95, 1],
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};

/**
 * Get motion configuration based on reduced motion preference.
 * Returns false to disable animations when reduced motion is preferred.
 * 
 * @param reducedMotion - Whether reduced motion is preferred
 * @returns Motion configuration object
 * 
 * @example
 * ```tsx
 * const config = getMotionConfig(prefersReducedMotion);
 * <motion.div {...config} />
 * ```
 */
export function getMotionConfig(reducedMotion: boolean) {
  return {
    animate: !reducedMotion,
    initial: !reducedMotion,
    exit: !reducedMotion,
    transition: reducedMotion ? { duration: 0 } : undefined
  };
}

/**
 * Reduced motion variants - instant transitions with no animation.
 * Use as fallback when user prefers reduced motion.
 * 
 * @example
 * ```tsx
 * <motion.div variants={prefersReducedMotion ? reducedMotionVariants : fadeIn} />
 * ```
 */
export const reducedMotionVariants: Variants = {
  initial: {},
  animate: {},
  exit: {},
};

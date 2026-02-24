/**
 * Theme Constants Module
 * 
 * Centralizes colors, effects, and styling values for the cinematic UI.
 * Provides consistent design tokens across all components.
 * 
 * **Usage:**
 * Import constants and use in component styling:
 * ```tsx
 * import { CINEMATIC_COLORS, GLASS_PANEL_CLASSES } from '@/lib/cinematic/themeConstants';
 * <div className={GLASS_PANEL_CLASSES.glowCyan} style={{ backgroundColor: CINEMATIC_COLORS.background }} />
 * ```
 * 
 * @module themeConstants
 */

/**
 * Cinematic color palette.
 * Defines the core colors used throughout the cinematic UI.
 */
export const CINEMATIC_COLORS = {
  /** Primary background color (#0B0B12) */
  background: '#0B0B12',
  
  /** Glass panel colors with varying opacity */
  glass: 'rgba(17, 24, 39, 0.6)',
  glassDark: 'rgba(17, 24, 39, 0.8)',
  glassLight: 'rgba(17, 24, 39, 0.4)',
  
  /** Accent colors for neon glow effects */
  accents: {
    /** Plasma blue (#06B6D4) */
    cyan: '#06B6D4',
    /** Electric purple (#A855F7) */
    purple: '#A855F7',
    /** Lava orange (#F97316) */
    orange: '#F97316',
    /** Neon magenta (#EC4899) */
    magenta: '#EC4899',
  },
  
  /** Status-specific colors */
  status: {
    /** HP status colors based on health percentage */
    hp: {
      high: '#10B981',    // Green (>60%)
      medium: '#F59E0B',  // Amber (30-60%)
      low: '#EF4444',     // Red (<30%)
    },
    /** Buff indicator color */
    buff: '#06B6D4',
    /** Debuff indicator color */
    debuff: '#EF4444',
  },
} as const;

/**
 * Glow effect shadow values.
 * Box-shadow values for creating neon glow effects.
 * 
 * @example
 * ```tsx
 * <div style={{ boxShadow: GLOW_EFFECTS.cyan }} />
 * ```
 */
export const GLOW_EFFECTS = {
  /** Small glow (10px blur) */
  small: '0 0 10px rgba(6, 182, 212, 0.3)',
  /** Medium glow (20px blur) */
  medium: '0 0 20px rgba(6, 182, 212, 0.4)',
  /** Large glow (30px blur) */
  large: '0 0 30px rgba(168, 85, 247, 0.6)',
  
  /** Color-specific glow effects */
  cyan: '0 0 20px rgba(6, 182, 212, 0.4)',
  purple: '0 0 30px rgba(168, 85, 247, 0.6)',
  orange: '0 0 20px rgba(249, 115, 22, 0.4)',
  magenta: '0 0 20px rgba(236, 72, 153, 0.4)',
} as const;

/**
 * Blur effect values for backdrop-filter.
 * 
 * @example
 * ```tsx
 * <div style={{ backdropFilter: `blur(${BLUR_EFFECTS.cinematic})` }} />
 * ```
 */
export const BLUR_EFFECTS = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  /** Cinematic default blur (16px) */
  cinematic: '16px',
} as const;

/**
 * Cinematic spacing values.
 * Generous padding and margins for dramatic visual hierarchy.
 * 
 * @example
 * ```tsx
 * <div style={{ padding: CINEMATIC_SPACING.lg }} />
 * ```
 */
export const CINEMATIC_SPACING = {
  xs: '0.5rem',   // 8px
  sm: '1rem',     // 16px
  md: '1.5rem',   // 24px
  /** Cinematic default spacing (32px) */
  lg: '2rem',     // 32px
  xl: '3rem',     // 48px
  xxl: '4rem',    // 64px
} as const;

/**
 * Glass panel styling classes.
 * Pre-configured Tailwind classes for glass morphism effects.
 * 
 * @example
 * ```tsx
 * <div className={GLASS_PANEL_CLASSES.glowCyan} />
 * ```
 */
export const GLASS_PANEL_CLASSES = {
  /** Base glass panel without glow */
  base: 'bg-gray-900/60 backdrop-blur-lg border border-gray-700/50 rounded-xl',
  /** Dark variant with more opacity */
  dark: 'bg-gray-900/80 backdrop-blur-lg border border-gray-700/50 rounded-xl',
  /** Light variant with less opacity */
  light: 'bg-gray-900/40 backdrop-blur-md border border-gray-700/30 rounded-xl',
  
  /** Glass panel with cyan glow */
  glowCyan: 'bg-gray-900/60 backdrop-blur-lg border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-xl',
  /** Glass panel with purple glow */
  glowPurple: 'bg-gray-900/60 backdrop-blur-lg border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.6)] rounded-xl',
  /** Glass panel with orange glow */
  glowOrange: 'bg-gray-900/60 backdrop-blur-lg border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.4)] rounded-xl',
  /** Glass panel with magenta glow */
  glowMagenta: 'bg-gray-900/60 backdrop-blur-lg border border-magenta-500/30 shadow-[0_0_20px_rgba(236,72,153,0.4)] rounded-xl',
} as const;

/**
 * Border styling for different component states.
 * 
 * @example
 * ```tsx
 * <div className={isActive ? BORDER_STYLES.active : BORDER_STYLES.default} />
 * ```
 */
export const BORDER_STYLES = {
  /** Default border style */
  default: 'border border-gray-700/50',
  /** Active state with purple glow */
  active: 'border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)]',
  /** Hover state with cyan glow */
  hover: 'border border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]',
  /** Disabled state */
  disabled: 'border border-gray-800/50',
} as const;

/**
 * Typography styles for cinematic UI.
 * Pre-configured text styling classes.
 * 
 * @example
 * ```tsx
 * <h1 className={TYPOGRAPHY.abilityName}>Fireball</h1>
 * ```
 */
export const TYPOGRAPHY = {
  /** Ability name with gradient text */
  abilityName: 'text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent',
  /** Character name styling */
  characterName: 'text-2xl font-bold text-white',
  /** Header text styling */
  header: 'text-2xl font-bold text-cyan-400',
  /** Body text styling */
  body: 'text-base text-gray-300',
  /** Hint/secondary text styling */
  hint: 'text-sm text-gray-400',
  /** Stat value styling */
  stat: 'text-lg font-semibold text-white',
} as const;

/**
 * Animation timing constants in seconds.
 * 
 * @example
 * ```tsx
 * transition={{ duration: ANIMATION_TIMING.normal }}
 * ```
 */
export const ANIMATION_TIMING = {
  /** Fast animations (0.2s) */
  fast: 0.2,
  /** Normal animations (0.4s) */
  normal: 0.4,
  /** Slow animations (0.8s) */
  slow: 0.8,
  /** Pulse animation duration (2s) */
  pulse: 2,
  /** Float animation duration (3s) */
  float: 3,
} as const;

/**
 * Z-index layers for proper stacking context.
 * Ensures correct layering of UI elements.
 * 
 * @example
 * ```tsx
 * <div style={{ zIndex: Z_INDEX.modal }} />
 * ```
 */
export const Z_INDEX = {
  /** Background layer (0) */
  background: 0,
  /** Content layer (10) */
  content: 10,
  /** Overlay layer (20) */
  overlay: 20,
  /** Modal layer (30) */
  modal: 30,
  /** HUD layer (40) */
  hud: 40,
  /** Flash effect layer (50) */
  flash: 50,
} as const;

/**
 * Responsive breakpoints in pixels.
 * 
 * @example
 * ```tsx
 * const isMobile = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile})`).matches;
 * ```
 */
export const BREAKPOINTS = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

/**
 * Touch target minimum size for mobile accessibility.
 * Ensures interactive elements are large enough for touch input.
 * 
 * @constant {number} 44 pixels (WCAG 2.1 Level AAA)
 */
export const TOUCH_TARGET_MIN_SIZE = 44; // pixels

/**
 * Helper function to get HP color based on percentage.
 * Returns appropriate color from status.hp palette.
 * 
 * @param current - Current HP value
 * @param max - Maximum HP value
 * @returns Color string for the HP percentage
 * 
 * @example
 * ```tsx
 * const color = getHPColor(75, 100); // Returns green (#10B981)
 * <div style={{ color }} />
 * ```
 */
export function getHPColor(current: number, max: number): string {
  const percentage = (current / max) * 100;
  if (percentage > 60) return CINEMATIC_COLORS.status.hp.high;
  if (percentage > 30) return CINEMATIC_COLORS.status.hp.medium;
  return CINEMATIC_COLORS.status.hp.low;
}

/**
 * Helper function to get glow class based on accent color.
 * 
 * @param color - Accent color name
 * @returns Glass panel class with appropriate glow
 * 
 * @example
 * ```tsx
 * const className = getGlowClass('cyan');
 * <div className={className} />
 * ```
 */
export function getGlowClass(color: 'cyan' | 'purple' | 'orange' | 'magenta'): string {
  const glowMap = {
    cyan: GLASS_PANEL_CLASSES.glowCyan,
    purple: GLASS_PANEL_CLASSES.glowPurple,
    orange: GLASS_PANEL_CLASSES.glowOrange,
    magenta: GLASS_PANEL_CLASSES.glowMagenta,
  };
  return glowMap[color];
}

/**
 * Helper function to combine class names.
 * Filters out falsy values for conditional classes.
 * 
 * @param classes - Array of class names or conditional values
 * @returns Combined class name string
 * 
 * @example
 * ```tsx
 * const className = cn('base-class', isActive && 'active-class', 'another-class');
 * <div className={className} />
 * ```
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

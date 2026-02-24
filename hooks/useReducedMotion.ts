/**
 * useReducedMotion Hook Module
 * 
 * Detects user's prefers-reduced-motion preference from system settings.
 * Components should respect this preference by disabling or simplifying animations.
 * 
 * **Validates Requirements:**
 * - 7.6: Respects user motion preferences
 * - Accessibility: WCAG 2.1 Success Criterion 2.3.3
 * 
 * @module useReducedMotion
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect if user prefers reduced motion.
 * 
 * Checks the `prefers-reduced-motion` media query and updates when it changes.
 * Returns true if user has enabled reduced motion in their system settings.
 * 
 * **Usage:**
 * Use this hook to conditionally disable or simplify animations:
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * <motion.div animate={prefersReducedMotion ? false : "animate"} />
 * ```
 * 
 * **Accessibility:**
 * - Respects WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions)
 * - Helps users with vestibular disorders
 * - Improves experience for users who find motion distracting
 * 
 * @returns {boolean} True if user prefers reduced motion, false otherwise
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <motion.div
 *       variants={prefersReducedMotion ? undefined : fadeIn}
 *       initial={prefersReducedMotion ? false : "initial"}
 *       animate={prefersReducedMotion ? false : "animate"}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Create event listener for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (use addEventListener for better browser support)
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

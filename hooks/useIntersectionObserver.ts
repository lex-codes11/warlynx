/**
 * useIntersectionObserver Hook Module
 * 
 * Detects if an element is visible in the viewport using the Intersection Observer API.
 * Useful for pausing animations on off-screen components to improve performance.
 * 
 * @module useIntersectionObserver
 */

import { useEffect, useState, RefObject } from 'react';

/**
 * Options for the Intersection Observer
 */
interface UseIntersectionObserverOptions {
  /** Threshold(s) at which to trigger (0-1, or array of values) */
  threshold?: number | number[];
  /** Root element for intersection (null = viewport) */
  root?: Element | null;
  /** Margin around root element */
  rootMargin?: string;
  /** Whether to stop observing after first intersection */
  freezeOnceVisible?: boolean;
}

/**
 * Hook to detect if an element is visible in the viewport.
 * 
 * Uses the Intersection Observer API to efficiently track element visibility.
 * Useful for performance optimization by pausing animations on off-screen elements.
 * 
 * **Performance Benefits:**
 * - Reduces CPU/GPU usage by pausing off-screen animations
 * - Improves battery life on mobile devices
 * - Prevents unnecessary re-renders
 * 
 * @param elementRef - React ref to the element to observe
 * @param options - Intersection Observer options
 * @param options.threshold - Percentage of element visibility to trigger (0-1)
 * @param options.root - Root element for intersection (null = viewport)
 * @param options.rootMargin - Margin around root (e.g., "100px")
 * @param options.freezeOnceVisible - Stop observing after first intersection
 * @returns {boolean} True if element is intersecting (visible), false otherwise
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const ref = useRef<HTMLDivElement>(null);
 *   const isVisible = useIntersectionObserver(ref, {
 *     threshold: 0.1,
 *     rootMargin: '50px'
 *   });
 *   
 *   return (
 *     <div ref={ref}>
 *       {isVisible && <ExpensiveAnimation />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Pause animations when off-screen
 * const cardRef = useRef<HTMLDivElement>(null);
 * const isVisible = useIntersectionObserver(cardRef);
 * const shouldAnimate = isVisible && !prefersReducedMotion;
 * 
 * <motion.div ref={cardRef} animate={shouldAnimate ? "animate" : false} />
 * ```
 */
export function useIntersectionObserver(
  elementRef: RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  }: UseIntersectionObserverOptions = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    
    if (!element) {
      return;
    }

    // If already visible and frozen, don't observe
    if (freezeOnceVisible && isIntersecting) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, threshold, root, rootMargin, freezeOnceVisible, isIntersecting]);

  return isIntersecting;
}

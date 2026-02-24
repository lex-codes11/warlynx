/**
 * useMobileDetection Hook Module
 * 
 * Detects mobile devices and device capabilities for performance optimization.
 * Uses viewport size and hardware concurrency to determine device type and performance level.
 * 
 * @module useMobileDetection
 */

'use client';

import { useEffect, useState } from 'react';

/**
 * Mobile detection result interface
 */
interface MobileDetectionResult {
  /** Whether device is mobile (viewport ≤768px) */
  isMobile: boolean;
  /** Whether device is low-end (≤4 CPU cores) */
  isLowEndDevice: boolean;
  /** Whether device is tablet (769-1024px) */
  isTablet: boolean;
}

/**
 * Hook to detect mobile devices and device capabilities.
 * 
 * Uses `matchMedia` to detect viewport size and `navigator.hardwareConcurrency`
 * to estimate device performance. Useful for optimizing animations and effects
 * based on device capabilities.
 * 
 * **Detection Criteria:**
 * - Mobile: viewport width ≤768px
 * - Tablet: viewport width 769-1024px
 * - Low-end device: ≤4 CPU cores
 * 
 * **Performance Optimization:**
 * Use detection results to simplify effects on mobile/low-end devices:
 * - Reduce particle counts
 * - Simplify glow effects
 * - Disable expensive animations
 * 
 * @returns {MobileDetectionResult} Object containing device detection flags
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isMobile, isLowEndDevice } = useMobileDetection();
 *   const simplifyEffects = isMobile || isLowEndDevice;
 *   
 *   return (
 *     <div className={simplifyEffects ? 'simple' : 'fancy'}>
 *       {!simplifyEffects && <ExpensiveEffect />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Adjust particle count based on device
 * const { isMobile, isLowEndDevice } = useMobileDetection();
 * const particleCount = isMobile ? 10 : isLowEndDevice ? 20 : 50;
 * ```
 */
export function useMobileDetection(): MobileDetectionResult {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isLowEndDevice: false,
    isTablet: false,
  });

  useEffect(() => {
    // Mobile detection using matchMedia
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const tabletQuery = window.matchMedia('(min-width: 769px) and (max-width: 1024px)');
    
    // Low-end device detection using hardware concurrency
    // Devices with 4 or fewer cores are considered low-end
    const isLowEndDevice = typeof navigator.hardwareConcurrency === 'number' 
      ? navigator.hardwareConcurrency <= 4 
      : false;

    const updateDetection = () => {
      setDetection({
        isMobile: mobileQuery.matches,
        isTablet: tabletQuery.matches,
        isLowEndDevice,
      });
    };

    // Initial detection
    updateDetection();

    // Listen for viewport changes
    mobileQuery.addEventListener('change', updateDetection);
    tabletQuery.addEventListener('change', updateDetection);

    return () => {
      mobileQuery.removeEventListener('change', updateDetection);
      tabletQuery.removeEventListener('change', updateDetection);
    };
  }, []);

  return detection;
}

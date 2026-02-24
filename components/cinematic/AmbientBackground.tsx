'use client';

import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { CINEMATIC_COLORS, Z_INDEX } from '@/lib/cinematic';

/**
 * Props for the AmbientBackground component
 */
interface AmbientBackgroundProps {
  /**
   * Intensity level of the background effects
   * - 'low': 20 particles (default)
   * - 'medium': 30 particles
   * - 'high': 50 particles
   * Particle count is automatically reduced on mobile and low-end devices
   * @default 'low'
   */
  intensity?: 'low' | 'medium' | 'high';
}

/**
 * Internal particle data structure
 */
interface Particle {
  /** Unique identifier for the particle */
  id: number;
  /** Horizontal position as percentage (0-100) */
  x: number;
  /** Vertical position as percentage (0-100) */
  y: number;
  /** Particle size in pixels (1-4px) */
  size: number;
  /** Particle color from the cinematic accent palette */
  color: string;
  /** Animation duration in seconds (15-25s) */
  duration: number;
  /** Animation delay in seconds (0-5s) */
  delay: number;
}

/**
 * AmbientBackground Component
 * 
 * Provides subtle animated background effects with floating particles and nebula gradients.
 * Optimized for performance with automatic adjustments for mobile and low-end devices.
 * Respects user's reduced motion preferences.
 * 
 * **Features:**
 * - Floating particle animations with random motion
 * - Nebula gradient overlays
 * - Automatic performance optimization based on device capabilities
 * - Pauses animations when off-screen using IntersectionObserver
 * - Respects prefers-reduced-motion accessibility setting
 * 
 * **Performance:**
 * - Uses GPU-accelerated transforms (translateX, translateY)
 * - Reduces particle count on mobile (50%) and low-end devices (60%)
 * - Pauses animations when component is not visible
 * 
 * @param props - Component props
 * @returns Rendered ambient background with particles and gradients
 * 
 * @example
 * ```tsx
 * // Low intensity (default)
 * <AmbientBackground />
 * 
 * // Medium intensity
 * <AmbientBackground intensity="medium" />
 * 
 * // High intensity for dramatic scenes
 * <AmbientBackground intensity="high" />
 * ```
 * 
 * @see {@link useReducedMotion} for accessibility support
 * @see {@link useIntersectionObserver} for performance optimization
 * @see {@link useMobileDetection} for device-specific adjustments
 */
export function AmbientBackground({ intensity = 'low' }: AmbientBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile, isLowEndDevice } = useMobileDetection();
  const backgroundRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(backgroundRef, {
    threshold: 0,
    rootMargin: '100px',
  });
  
  // Determine particle count based on intensity and device capabilities
  const particleCount = useMemo(() => {
    // Reduce particle count on mobile and low-end devices
    const mobileReduction = isMobile ? 0.5 : 1;
    const lowEndReduction = isLowEndDevice ? 0.6 : 1;
    const totalReduction = mobileReduction * lowEndReduction;
    
    let baseCount: number;
    switch (intensity) {
      case 'high':
        baseCount = 50;
        break;
      case 'medium':
        baseCount = 30;
        break;
      case 'low':
      default:
        baseCount = 20;
        break;
    }
    
    return Math.floor(baseCount * totalReduction);
  }, [intensity, isMobile, isLowEndDevice]);

  // Determine opacity based on intensity
  const baseOpacity = useMemo(() => {
    switch (intensity) {
      case 'high':
        return 0.4;
      case 'medium':
        return 0.25;
      case 'low':
      default:
        return 0.15;
    }
  }, [intensity]);

  // Generate particles with random properties
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      CINEMATIC_COLORS.accents.cyan,
      CINEMATIC_COLORS.accents.purple,
      CINEMATIC_COLORS.accents.orange,
      CINEMATIC_COLORS.accents.magenta,
    ];

    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // Percentage
      y: Math.random() * 100, // Percentage
      size: Math.random() * 3 + 1, // 1-4px
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: Math.random() * 10 + 15, // 15-25 seconds
      delay: Math.random() * 5, // 0-5 seconds
    }));
  }, [particleCount]);

  return (
    <div
      ref={backgroundRef}
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{
        backgroundColor: CINEMATIC_COLORS.background,
        zIndex: Z_INDEX.background,
      }}
      aria-hidden="true"
    >
      {/* Particle layer - only animate when visible */}
      {!prefersReducedMotion && isVisible && particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full particle-animating"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            opacity: baseOpacity,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [baseOpacity * 0.5, baseOpacity, baseOpacity * 0.5],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Nebula gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, ${CINEMATIC_COLORS.accents.purple}15 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, ${CINEMATIC_COLORS.accents.cyan}10 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, ${CINEMATIC_COLORS.accents.orange}08 0%, transparent 60%)
          `,
          opacity: baseOpacity * 1.5,
        }}
      />
    </div>
  );
}

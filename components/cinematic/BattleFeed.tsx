'use client';

/**
 * BattleFeed Component Module
 * 
 * Displays narrative events and abilities with cinematic presentation.
 * Features animated text reveals, ability highlights, and auto-scrolling.
 * 
 * **Validates Requirements:**
 * - 2.1: Full-width dark glass panel with glowing edges
 * - 2.2: Large prominent typography for ability names
 * - 2.3: Animated text reveal with cinematic timing
 * - 2.4: Ability highlight cards with distinct visual treatment
 * - 2.5: Icon badges for ability types or effects
 * - 2.6: Cinematic spacing between story events
 * 
 * @module BattleFeed
 */

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, slideUp, staggerContainer, characterReveal } from '@/lib/cinematic/animationVariants';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { GLASS_PANEL_CLASSES, CINEMATIC_SPACING } from '@/lib/cinematic/themeConstants';

/**
 * Game event interface supporting different event types
 */
export interface GameEvent {
  /** Unique identifier for the event */
  id: string;
  /** Type of event determining visual treatment */
  type: 'narrative' | 'action' | 'ability' | 'death';
  /** Main event content/description */
  content: string;
  /** Optional character attribution */
  character?: {
    /** Character unique identifier */
    id: string;
    /** Character display name */
    name: string;
    /** Optional character portrait URL */
    imageUrl?: string;
  };
  /** Optional ability information for ability-type events */
  ability?: {
    /** Ability name (displayed prominently) */
    name: string;
    /** Ability description */
    description: string;
    /** Optional emoji or icon */
    icon?: string;
  };
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Props for the BattleFeed component
 */
export interface BattleFeedProps {
  /** Array of game events to display */
  events: GameEvent[];
  /** Optional callback when an event is read/displayed */
  onEventRead?: (eventId: string) => void;
}

/**
 * BattleFeed Component
 * 
 * Displays game events in a cinematic feed with animations and auto-scrolling.
 * Events are rendered in a scrollable container with glass panel styling.
 * 
 * **Features:**
 * - Auto-scrolls to newest events
 * - Animated event entry with slide-up effect
 * - Character attribution with avatars
 * - Ability highlights with gradient backgrounds
 * - Character-by-character text reveal for ability names
 * - Event type icons
 * - Timestamps
 * 
 * **Accessibility:**
 * - Respects prefers-reduced-motion
 * - Smooth scroll behavior (disabled with reduced motion)
 * - Semantic HTML structure
 * 
 * **Performance:**
 * - Simplified effects on mobile/low-end devices
 * - Efficient AnimatePresence for enter/exit animations
 * - Custom scrollbar styling
 * 
 * @param props - Component props
 * @returns Rendered battle feed with events
 * 
 * @example
 * ```tsx
 * const events: GameEvent[] = [
 *   {
 *     id: '1',
 *     type: 'ability',
 *     content: 'Casts a powerful spell',
 *     character: { id: 'c1', name: 'Wizard', imageUrl: '/wizard.png' },
 *     ability: { name: 'Fireball', description: 'Deals 50 damage', icon: '🔥' },
 *     timestamp: new Date()
 *   }
 * ];
 * 
 * <BattleFeed 
 *   events={events} 
 *   onEventRead={(id) => console.log('Event read:', id)} 
 * />
 * ```
 */
export function BattleFeed({ events, onEventRead }: BattleFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isMobile, isLowEndDevice } = useMobileDetection();

  // Simplify effects on mobile/low-end devices
  const simplifyEffects = isMobile || isLowEndDevice;

  // Ensure events is an array
  const safeEvents = Array.isArray(events) ? events : [];

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (feedRef.current && feedRef.current.scrollTo) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    }
  }, [safeEvents.length, prefersReducedMotion]);

  return (
    <div 
      ref={feedRef}
      className="w-full space-y-4 max-h-[600px] overflow-y-auto scroll-smooth"
      style={{
        scrollBehavior: 'smooth',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(6, 182, 212, 0.3) rgba(17, 24, 39, 0.6)'
      }}
    >
      {safeEvents.length === 0 ? (
        <motion.div 
          className={`${GLASS_PANEL_CLASSES.glowCyan} p-8 text-center`}
          variants={prefersReducedMotion ? undefined : fadeIn}
          initial={prefersReducedMotion ? false : "initial"}
          animate={prefersReducedMotion ? false : "animate"}
        >
          <p className="text-gray-400 text-lg">Awaiting battle events...</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {safeEvents.map((event, index) => (
            <motion.div
              key={event.id}
              variants={prefersReducedMotion ? undefined : slideUp}
              initial={prefersReducedMotion ? false : "initial"}
              animate={prefersReducedMotion ? false : "animate"}
              exit={prefersReducedMotion ? undefined : "exit"}
              layout={!prefersReducedMotion}
              className={`${GLASS_PANEL_CLASSES.glowCyan} w-full`}
              style={{ padding: CINEMATIC_SPACING.lg }}
            >
              <EventContent event={event} onEventRead={onEventRead} simplifyEffects={simplifyEffects} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

/**
 * EventContent Component
 * 
 * Renders the content of a single game event with appropriate styling and animations.
 * Handles character attribution, event type icons, ability highlights, and timestamps.
 * 
 * @param props - Component props
 * @param props.event - The game event to render
 * @param props.onEventRead - Optional callback when event is displayed
 * @param props.simplifyEffects - Whether to simplify visual effects for performance
 * @returns Rendered event content
 * 
 * @internal
 */
function EventContent({ 
  event, 
  onEventRead,
  simplifyEffects = false
}: { 
  event: GameEvent; 
  onEventRead?: (eventId: string) => void;
  simplifyEffects?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  
  React.useEffect(() => {
    if (onEventRead) {
      onEventRead(event.id);
    }
  }, [event.id, onEventRead]);

  return (
    <div className="space-y-3">
      {/* Character attribution */}
      {event.character && (
        <div className="flex items-center gap-3 mb-4">
          {event.character.imageUrl && (
            <img
              src={event.character.imageUrl}
              alt={event.character.name}
              className="w-10 h-10 rounded-full border-2 border-cyan-500/50"
            />
          )}
          <span className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">
            {event.character.name}
          </span>
        </div>
      )}

      {/* Event type indicator */}
      <div className="flex items-center gap-2 mb-2">
        <EventTypeIcon type={event.type} />
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {event.type}
        </span>
      </div>

      {/* Main content */}
      <div className="text-gray-200 text-base leading-relaxed">
        {event.content}
      </div>

      {/* Ability highlight (if applicable) */}
      {event.ability && (
        <div className="mt-4 pt-4 border-t border-purple-500/30">
          <div 
            className="bg-gradient-to-r from-purple-900/20 via-cyan-900/20 to-purple-900/20 rounded-lg p-4 border border-purple-500/30"
            style={{
              // Simplify glow on mobile/low-end devices
              boxShadow: !simplifyEffects ? '0 0 20px rgba(168,85,247,0.2)' : undefined
            }}
          >
            <div className="flex items-start gap-4">
              {event.ability.icon && (
                <motion.div 
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-purple-500/20 rounded-lg border border-purple-400/30"
                  variants={prefersReducedMotion ? undefined : fadeIn}
                  initial={prefersReducedMotion ? false : "initial"}
                  animate={prefersReducedMotion ? false : "animate"}
                >
                  <span className="text-3xl">{event.ability.icon}</span>
                </motion.div>
              )}
              <div className="flex-1">
                <AnimatedAbilityName name={event.ability.name} />
                <motion.p 
                  className="text-gray-300 text-base"
                  variants={prefersReducedMotion ? undefined : fadeIn}
                  initial={prefersReducedMotion ? false : "initial"}
                  animate={prefersReducedMotion ? false : "animate"}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.3 }}
                >
                  {event.ability.description}
                </motion.p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      {event.timestamp && (
        <div className="text-xs text-gray-600 mt-3">
          {new Date(event.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

/**
 * EventTypeIcon Component
 * 
 * Displays an emoji icon based on the event type.
 * 
 * @param props - Component props
 * @param props.type - The type of event
 * @returns Rendered icon with appropriate emoji
 * 
 * @internal
 */
function EventTypeIcon({ type }: { type: GameEvent['type'] }) {
  const icons = {
    narrative: '📖',
    action: '⚔️',
    ability: '✨',
    death: '💀',
  };

  return (
    <span className="text-lg" role="img" aria-label={`${type} event`}>
      {icons[type]}
    </span>
  );
}

/**
 * AnimatedAbilityName Component
 * 
 * Displays an ability name with character-by-character reveal animation.
 * Uses stagger animation to reveal each character sequentially for dramatic effect.
 * Respects reduced motion preferences by showing the full name instantly.
 * 
 * @param props - Component props
 * @param props.name - The ability name to display
 * @returns Rendered ability name with gradient text and optional animation
 * 
 * @internal
 */
function AnimatedAbilityName({ name }: { name: string }) {
  const prefersReducedMotion = useReducedMotion();
  const characters = name.split('');

  if (prefersReducedMotion) {
    return (
      <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-magenta-400 mb-2">
        {name}
      </h3>
    );
  }

  return (
    <motion.h3 
      className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-magenta-400 mb-2"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {characters.map((char, index) => (
        <motion.span
          key={`${name}-${index}`}
          variants={characterReveal}
          transition={{ delay: index * 0.05 }}
        >
          {char}
        </motion.span>
      ))}
    </motion.h3>
  );
}

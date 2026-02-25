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
    <div className={`${GLASS_PANEL_CLASSES.glowCyan} w-full rounded-xl overflow-hidden`}>
      <div 
        ref={feedRef}
        className="max-h-[400px] overflow-y-auto scroll-smooth p-6"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(6, 182, 212, 0.3) rgba(17, 24, 39, 0.6)'
        }}
      >
        {safeEvents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-400 text-sm">Awaiting game events...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {safeEvents.map((event, index) => (
              <EventContent key={event.id} event={event} onEventRead={onEventRead} simplifyEffects={simplifyEffects} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * EventContent Component
 * 
 * Renders the content of a single game event with appropriate styling and animations.
 * Handles character attribution, event type icons, ability highlights, and timestamps.
 * Includes inline TTS play button for each message.
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
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  React.useEffect(() => {
    if (onEventRead) {
      onEventRead(event.id);
    }
  }, [event.id, onEventRead]);

  const handlePlayTTS = () => {
    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(event.content);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="group hover:bg-gray-800/20 rounded-lg p-3 -mx-3 transition-colors">
      {/* Character attribution and TTS button */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {event.character && (
            <>
              {event.character.imageUrl && (
                <img
                  src={event.character.imageUrl}
                  alt={event.character.name}
                  className="w-6 h-6 rounded-full border border-cyan-500/50 flex-shrink-0"
                />
              )}
              <span className="text-cyan-400 font-semibold text-xs truncate">
                {event.character.name}
              </span>
            </>
          )}
          {!event.character && (
            <span className="text-purple-400 font-semibold text-xs flex items-center gap-1">
              <span>📖</span>
              <span>Narrator</span>
            </span>
          )}
          <span className="text-xs text-gray-600 flex-shrink-0">
            {event.timestamp && new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* TTS Play Button */}
        <button
          onClick={handlePlayTTS}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-cyan-500/20 transition-colors opacity-0 group-hover:opacity-100"
          aria-label={isPlaying ? 'Stop narration' : 'Play narration'}
          title={isPlaying ? 'Stop narration' : 'Play narration'}
        >
          {isPlaying ? (
            <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="text-gray-200 text-sm leading-relaxed">
        {event.content}
      </div>

      {/* Ability highlight (if applicable) */}
      {event.ability && (
        <div className="mt-2">
          <div 
            className="bg-gradient-to-r from-purple-900/20 via-cyan-900/20 to-purple-900/20 rounded-lg p-3 border border-purple-500/30"
            style={{
              boxShadow: !simplifyEffects ? '0 0 20px rgba(168,85,247,0.2)' : undefined
            }}
          >
            <div className="flex items-start gap-3">
              {event.ability.icon && (
                <motion.div 
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-purple-500/20 rounded-lg border border-purple-400/30"
                  variants={prefersReducedMotion ? undefined : fadeIn}
                  initial={prefersReducedMotion ? false : "initial"}
                  animate={prefersReducedMotion ? false : "animate"}
                >
                  <span className="text-2xl">{event.ability.icon}</span>
                </motion.div>
              )}
              <div className="flex-1">
                <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-magenta-400 mb-1">
                  {event.ability.name}
                </h4>
                <p className="text-gray-300 text-sm">
                  {event.ability.description}
                </p>
              </div>
            </div>
          </div>
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

/**
 * TTS Narration Hook
 * Detects new story content and triggers text-to-speech
 * Validates: Requirements 13.3, 13.5
 */

'use client';

import { useEffect, useRef } from 'react';
import { getTTSService } from '@/lib/tts-service';
import { TTSOptions } from '@/types/game-enhancements';

interface UseTTSNarrationOptions {
  enabled: boolean;
  storyContent: string;
  ttsOptions?: TTSOptions;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to automatically narrate story content with TTS
 * 
 * **Validates: Requirements 13.3, 13.5**
 * 
 * @param options - Configuration options
 */
export function useTTSNarration({
  enabled,
  storyContent,
  ttsOptions = {},
  onSpeakStart,
  onSpeakEnd,
  onError,
}: UseTTSNarrationOptions) {
  const previousContentRef = useRef<string>('');
  const ttsService = getTTSService();

  useEffect(() => {
    // Initialize TTS service if not already initialized
    if (typeof window !== 'undefined') {
      try {
        ttsService.initialize();
      } catch (error) {
        console.error('Failed to initialize TTS service:', error);
      }
    }
  }, [ttsService]);

  useEffect(() => {
    // Don't do anything if TTS is disabled (Requirement 13.5)
    if (!enabled) {
      // Stop any active playback when disabled
      ttsService.stop();
      return;
    }

    // Check if story content has changed (new content appeared)
    if (storyContent && storyContent !== previousContentRef.current) {
      // Extract only the new content
      const newContent = storyContent.startsWith(previousContentRef.current)
        ? storyContent.substring(previousContentRef.current.length).trim()
        : storyContent.trim();

      if (newContent.length > 0) {
        // Trigger TTS for new content (Requirement 13.3)
        speakNewContent(newContent);
      }

      // Update previous content reference
      previousContentRef.current = storyContent;
    }
  }, [enabled, storyContent, ttsOptions]);

  const speakNewContent = async (content: string) => {
    try {
      onSpeakStart?.();

      await ttsService.speak(content, ttsOptions);

      onSpeakEnd?.();
    } catch (error) {
      console.error('TTS narration error:', error);
      onError?.(error as Error);
    }
  };

  return {
    isPlaying: ttsService.isPlaying(),
    isPaused: ttsService.isPausedState(),
    pause: () => ttsService.pause(),
    resume: () => ttsService.resume(),
    stop: () => ttsService.stop(),
  };
}

/**
 * Hook to manually trigger TTS for specific text
 */
export function useTTSSpeaker() {
  const ttsService = getTTSService();

  useEffect(() => {
    // Initialize TTS service if not already initialized
    if (typeof window !== 'undefined') {
      try {
        ttsService.initialize();
      } catch (error) {
        console.error('Failed to initialize TTS service:', error);
      }
    }
  }, [ttsService]);

  const speak = async (text: string, options?: TTSOptions) => {
    try {
      await ttsService.speak(text, options);
    } catch (error) {
      console.error('TTS speak error:', error);
      throw error;
    }
  };

  return {
    speak,
    pause: () => ttsService.pause(),
    resume: () => ttsService.resume(),
    stop: () => ttsService.stop(),
    isPlaying: ttsService.isPlaying(),
    isPaused: ttsService.isPausedState(),
    getVoices: () => ttsService.getVoices(),
    getRecommendedVoice: () => ttsService.getRecommendedVoice(),
  };
}

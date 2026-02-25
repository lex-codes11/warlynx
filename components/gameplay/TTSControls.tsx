/**
 * TTS Controls Component
 * 
 * Provides UI controls for text-to-speech functionality.
 * Includes enable/disable toggle and playback controls.
 * Shows playback state indicator.
 * 
 * Requirements: 13.2, 13.4
 */

'use client';

import { useState, useEffect } from 'react';
import { getTTSService } from '@/lib/tts-service';

interface TTSControlsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  className?: string;
}

/**
 * TTSControls Component
 * 
 * Provides enable/disable toggle and playback controls (Requirement 13.2, 13.4).
 */
export function TTSControls({
  enabled,
  onEnabledChange,
  className = '',
}: TTSControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const ttsService = getTTSService();

  // Update playback state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(ttsService.isPlaying());
      setIsPaused(ttsService.isPausedState());
    }, 100);

    return () => clearInterval(interval);
  }, [ttsService]);

  const handleToggleEnabled = () => {
    const newEnabled = !enabled;
    onEnabledChange(newEnabled);

    // Stop playback when disabling (Requirement 13.5)
    if (!newEnabled && (isPlaying || isPaused)) {
      ttsService.stop();
    }
  };

  const handlePause = () => {
    if (isPlaying) {
      ttsService.pause();
    }
  };

  const handleResume = () => {
    if (isPaused) {
      ttsService.resume();
    }
  };

  const handleStop = () => {
    ttsService.stop();
  };

  return (
    <div className={`bg-gray-900/60 backdrop-blur-lg border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-cyan-400">
          Text-to-Speech
        </h3>

        {/* Enable/Disable Toggle (Requirement 13.2) */}
        <button
          onClick={handleToggleEnabled}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${enabled ? 'bg-cyan-600' : 'bg-gray-700'}
          `}
          aria-label={enabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${enabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Playback State Indicator (Requirement 13.4) */}
      {enabled && (
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`
                w-2 h-2 rounded-full
                ${isPlaying ? 'bg-green-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-gray-500'}
              `}
            />
            <span className="text-xs text-gray-300">
              {isPlaying ? 'Playing' : isPaused ? 'Paused' : 'Ready'}
            </span>
          </div>
        </div>
      )}

      {/* Playback Controls (Requirement 13.4) */}
      {enabled && (
        <div className="flex items-center gap-2">
          {/* Pause Button */}
          <button
            onClick={handlePause}
            disabled={!isPlaying}
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg transition-colors
              ${
                isPlaying
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/30'
              }
            `}
            aria-label="Pause"
            title="Pause"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Resume Button */}
          <button
            onClick={handleResume}
            disabled={!isPaused}
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg transition-colors
              ${
                isPaused
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                  : 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/30'
              }
            `}
            aria-label="Resume"
            title="Resume"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Stop Button */}
          <button
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg transition-colors
              ${
                isPlaying || isPaused
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                  : 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-gray-700/30'
              }
            `}
            aria-label="Stop"
            title="Stop"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Disabled State Message */}
      {!enabled && (
        <p className="text-xs text-gray-400 mt-2">
          Enable text-to-speech to hear story narration
        </p>
      )}
    </div>
  );
}

/**
 * Compact TTS Toggle Button
 * Minimal version for space-constrained layouts
 */
interface TTSToggleButtonProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  className?: string;
}

export function TTSToggleButton({
  enabled,
  onEnabledChange,
  className = '',
}: TTSToggleButtonProps) {
  const handleToggle = () => {
    const newEnabled = !enabled;
    onEnabledChange(newEnabled);

    // Stop playback when disabling
    if (!newEnabled) {
      const ttsService = getTTSService();
      ttsService.stop();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
        ${
          enabled
            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }
        ${className}
      `}
      aria-label={enabled ? 'Disable narration' : 'Enable narration'}
      title={enabled ? 'Disable narration' : 'Enable narration'}
    >
      <svg
        className="w-5 h-5"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        {enabled ? (
          <path
            fillRule="evenodd"
            d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        )}
      </svg>
      <span className="text-sm font-medium">
        {enabled ? 'Narration On' : 'Narration Off'}
      </span>
    </button>
  );
}

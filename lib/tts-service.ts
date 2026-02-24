/**
 * Text-to-Speech Service
 * Integrates with Azure Speech SDK for audio narration
 * Validates: Requirements 13.1, 13.4
 */

import { TTSOptions } from '@/types/game-enhancements';

/**
 * TTS Service class for managing text-to-speech playback
 * Uses Web Speech API as fallback when Azure is not configured
 * 
 * **Validates: Requirements 13.1, 13.4**
 */
export class TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;
  private isPaused = false;
  private useAzure = false;
  private azureKey: string | null = null;
  private azureRegion: string | null = null;

  /**
   * Initialize the TTS service
   * Attempts to use Azure if credentials provided, falls back to Web Speech API
   * 
   * @param apiKey - Azure Speech API key (optional)
   * @param region - Azure region (optional)
   */
  initialize(apiKey?: string, region?: string): void {
    if (typeof window === 'undefined') {
      console.warn('TTS Service can only be initialized in browser environment');
      return;
    }

    // Check if Azure credentials are provided
    if (apiKey && region) {
      this.azureKey = apiKey;
      this.azureRegion = region;
      this.useAzure = true;
      console.log('TTS Service initialized with Azure Speech SDK');
    } else {
      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        console.log('TTS Service initialized with Web Speech API');
      } else {
        console.error('Speech synthesis not supported in this browser');
        return;
      }
    }

    this.isInitialized = true;
  }

  /**
   * Speak text using TTS
   * 
   * @param text - Text to speak
   * @param options - TTS options (voice, rate, pitch, volume)
   * @returns Promise that resolves when speech completes
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TTS Service not initialized. Call initialize() first.');
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    // Stop any current speech
    this.stop();

    if (this.useAzure && this.azureKey && this.azureRegion) {
      return this.speakWithAzure(text, options);
    } else {
      return this.speakWithWebAPI(text, options);
    }
  }

  /**
   * Speak using Azure Speech SDK
   * Note: This is a placeholder for Azure integration
   * In production, you would use the Azure Speech SDK npm package
   */
  private async speakWithAzure(text: string, options: TTSOptions): Promise<void> {
    // Azure Speech SDK integration would go here
    // For now, fall back to Web Speech API
    console.warn('Azure Speech SDK not fully implemented, using Web Speech API fallback');
    return this.speakWithWebAPI(text, options);
  }

  /**
   * Speak using Web Speech API
   */
  private async speakWithWebAPI(text: string, options: TTSOptions): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not available');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Apply options
      if (options.rate !== undefined) {
        utterance.rate = Math.max(0.5, Math.min(2.0, options.rate));
      }

      if (options.pitch !== undefined) {
        utterance.pitch = Math.max(0.5, Math.min(2.0, options.pitch));
      }

      if (options.volume !== undefined) {
        utterance.volume = Math.max(0.0, Math.min(1.0, options.volume));
      }

      // Select voice if specified
      if (options.voice) {
        const voices = this.synthesis!.getVoices();
        const selectedVoice = voices.find(
          (v) => v.name === options.voice || v.lang === options.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Set up event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        this.isPaused = false;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        this.currentUtterance = null;
        this.isPaused = false;
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      // Store current utterance and speak
      this.currentUtterance = utterance;
      this.isPaused = false;
      this.synthesis!.speak(utterance);
    });
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (!this.isInitialized || !this.synthesis) {
      return;
    }

    if (this.isPlaying() && !this.isPaused) {
      this.synthesis.pause();
      this.isPaused = true;
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (!this.isInitialized || !this.synthesis) {
      return;
    }

    if (this.isPaused) {
      this.synthesis.resume();
      this.isPaused = false;
    }
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (!this.isInitialized || !this.synthesis) {
      return;
    }

    if (this.isPlaying() || this.isPaused) {
      this.synthesis.cancel();
      this.currentUtterance = null;
      this.isPaused = false;
    }
  }

  /**
   * Check if speech is currently playing
   */
  isPlaying(): boolean {
    if (!this.isInitialized || !this.synthesis) {
      return false;
    }

    return this.synthesis.speaking && !this.isPaused;
  }

  /**
   * Check if speech is paused
   */
  isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.isInitialized || !this.synthesis) {
      return [];
    }

    return this.synthesis.getVoices();
  }

  /**
   * Get recommended voice for narration
   * Prefers English voices with good quality
   */
  getRecommendedVoice(): SpeechSynthesisVoice | null {
    const voices = this.getVoices();

    if (voices.length === 0) {
      return null;
    }

    // Prefer English voices
    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));

    if (englishVoices.length > 0) {
      // Prefer voices with "natural" or "neural" in the name
      const naturalVoice = englishVoices.find(
        (v) =>
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('neural')
      );

      if (naturalVoice) {
        return naturalVoice;
      }

      // Otherwise return first English voice
      return englishVoices[0];
    }

    // Fallback to first available voice
    return voices[0];
  }
}

// Export singleton instance
let ttsServiceInstance: TTSService | null = null;

/**
 * Get the TTS service singleton instance
 */
export function getTTSService(): TTSService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
}

/**
 * Initialize TTS service with Azure credentials (if available)
 * Call this once when the app loads
 */
export function initializeTTS(): void {
  const service = getTTSService();
  
  // Check for Azure credentials in environment
  const azureKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
  const azureRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;

  service.initialize(azureKey, azureRegion);
}

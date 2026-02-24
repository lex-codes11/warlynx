/**
 * Type definitions for Game Enhancements feature
 * 
 * This file contains TypeScript interfaces and types for the game enhancements
 * including character creation, real-time features, and gameplay interfaces.
 */

import { PowerSheet } from '@/lib/types';

/**
 * Character interface with all attributes
 * Includes description with max 1000 character constraint
 */
export interface Character {
  id: string;
  gameId: string;
  userId: string;
  name: string;
  fusionIngredients: string;
  description: string; // max 1000 characters
  abilities: string[];
  weakness: string;
  alignment: string | null;
  archetype: string | null;
  tags: string[];
  powerSheet: PowerSheet;
  imageUrl: string;
  imagePrompt: string;
  isReady: boolean; // Ready state for pre-game
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Game session interface with turn management
 */
export interface GameSession {
  id: string;
  name: string;
  hostId: string;
  inviteCode: string;
  maxPlayers: number;
  difficultyCurve: 'easy' | 'medium' | 'hard' | 'brutal';
  toneTags: string[];
  houseRules: string | null;
  status: 'lobby' | 'active' | 'completed';
  turnOrder: string[]; // Array of player IDs in turn order
  currentTurnIndex: number;
  currentTurnPlayerId: string | null; // Current active player ID
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Character statistics for display
 */
export interface CharacterStats {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  level: number;
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
}

/**
 * Typing status for real-time indicators
 */
export interface TypingStatus {
  gameId: string;
  userId: string;
  isTyping: boolean;
  lastUpdated: Date;
}

/**
 * Player information
 */
export interface Player {
  id: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  characterId: string | null;
  isReady: boolean;
}

/**
 * Character creation form data
 */
export interface CharacterCreationData {
  description: string; // max 1000 characters
  name?: string;
  fusionIngredients?: string;
}

/**
 * Auto-generated character attributes
 */
export interface GeneratedAttributes {
  abilities: string[];
  weaknesses: string[];
}

/**
 * Character summary for display
 */
export interface CharacterSummary {
  id: string;
  name: string;
  description: string;
  abilities: string[];
  weakness: string;
  stats: CharacterStats;
  imageUrl: string;
  isReady: boolean;
}

/**
 * AI-generated move options
 */
export interface MoveOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

/**
 * Move selection (AI-generated or custom)
 */
export interface MoveSelection {
  type: 'ai' | 'custom';
  option?: 'A' | 'B' | 'C' | 'D';
  customText?: string;
}

/**
 * Game context for AI move generation
 */
export interface GameContext {
  currentSituation: string;
  recentActions: string[];
  characters: Character[];
  currentCharacter: Character;
}

/**
 * Text-to-speech options
 */
export interface TTSOptions {
  voice?: string;
  rate?: number; // 0.5 to 2.0
  pitch?: number; // 0.5 to 2.0
  volume?: number; // 0.0 to 1.0
}

/**
 * Image generation request
 */
export interface ImageGenerationRequest {
  description: string;
  characterId?: string;
  style?: string;
}

/**
 * Appearance change detection result
 */
export interface AppearanceChange {
  detected: boolean;
  description?: string;
  keywords?: string[];
}

/**
 * Real-time event types for game enhancements
 */
export type GameEnhancementEvent =
  | { type: 'character:ready'; characterId: string; userId: string }
  | { type: 'character:updated'; character: Character }
  | { type: 'typing:start'; userId: string; userName: string }
  | { type: 'typing:stop'; userId: string }
  | { type: 'turn:changed'; currentPlayerId: string; turnIndex: number }
  | { type: 'stats:updated'; characterId: string; stats: CharacterStats }
  | { type: 'image:updated'; characterId: string; imageUrl: string };

/**
 * Validation result for character description
 */
export interface DescriptionValidation {
  isValid: boolean;
  length: number;
  remaining: number;
  error?: string;
}

/**
 * Constants for game enhancements
 */
export const GAME_ENHANCEMENT_CONSTANTS = {
  MAX_DESCRIPTION_LENGTH: 1000,
  TYPING_DEBOUNCE_MS: 2000,
  AI_MOVE_GENERATION_TIMEOUT_MS: 3000,
  IMAGE_GENERATION_TIMEOUT_MS: 10000,
  REALTIME_UPDATE_MAX_LATENCY_MS: 500,
} as const;

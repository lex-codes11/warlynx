// Type definitions for game models

export interface PowerSheet {
  level: number;
  hp: number;
  maxHp: number;
  attributes: {
    strength: number;
    agility: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
  abilities: Ability[];
  weakness: string;
  statuses: Status[];
  perks: Perk[];
}

export interface Ability {
  name: string;
  description: string;
  powerLevel: number; // 1-10 scale
  cooldown: number | null;
}

export interface Status {
  name: string;
  description: string;
  duration: number; // turns remaining
  effect: string;
}

export interface Perk {
  name: string;
  description: string;
  unlockedAt: number; // level
}

// Game Enhancements Types

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
  isReady: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameSession {
  id: string;
  name: string;
  hostId: string;
  inviteCode: string;
  maxPlayers: number;
  difficultyCurve: DifficultyCurve;
  toneTags: string[];
  houseRules: string | null;
  status: GameStatus;
  turnOrder: string[]; // Array of player IDs
  currentTurnIndex: number;
  currentTurnPlayerId: string | null; // Current active player ID
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

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

export interface TypingStatus {
  gameId: string;
  userId: string;
  isTyping: boolean;
  lastUpdated: Date;
}

export interface Player {
  id: string;
  userId: string;
  displayName: string;
  avatar: string | null;
  characterId: string | null;
  isReady: boolean;
}

export interface TurnRequest {
  gameId: string;
  playerId: string;
  action: "A" | "B" | "C" | "D" | string; // Choice or custom action
}

export interface TurnResponse {
  success: boolean;
  narrative: string;
  choices: Choice[];
  statUpdates: StatUpdate[];
  events: GameEvent[];
  validationError: string | null;
}

export interface Choice {
  label: "A" | "B" | "C" | "D";
  description: string;
  riskLevel: "low" | "medium" | "high" | "extreme";
}

export interface StatUpdate {
  characterId: string;
  changes: {
    hp?: number;
    level?: number;
    attributes?: Partial<PowerSheet["attributes"]>;
    statuses?: Status[];
    newPerks?: Perk[];
  };
}

export interface GameEvent {
  type: "narrative" | "action" | "stat_change" | "death" | "level_up";
  characterId: string | null;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export type GameStatus = "lobby" | "active" | "completed";
export type DifficultyCurve = "easy" | "medium" | "hard" | "brutal";
export type TurnPhase = "waiting" | "choosing" | "resolving" | "completed";
export type GameEventType = "narrative" | "action" | "stat_change" | "death" | "level_up";
export type PlayerRole = "host" | "player";

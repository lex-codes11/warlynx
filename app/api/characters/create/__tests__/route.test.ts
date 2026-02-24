/**
 * Unit tests for character creation API route
 * Tests POST /api/characters/create endpoint
 * @jest-environment node
 */

// Set up environment variables before imports
process.env.OPENAI_API_KEY = "test-api-key";

// Mock OpenAI at the module level
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    images: {
      generate: jest.fn(),
    },
  }));
});

// Mock dependencies BEFORE importing the route
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
    },
    character: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    gamePlayer: {
      update: jest.fn(),
    },
    imageGenerationLog: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/ai/power-sheet-generator");
jest.mock("@/lib/ai/image-generator");
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

import { POST } from "../route";
import { getServerSession } from "next-auth";
import { clearAllRateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { generatePowerSheet } from "@/lib/ai/power-sheet-generator";
import { generateCharacterImage } from "@/lib/ai/image-generator";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockGeneratePowerSheet = generatePowerSheet as jest.MockedFunction<
  typeof generatePowerSheet
>;
const mockGenerateCharacterImage = generateCharacterImage as jest.MockedFunction<
  typeof generateCharacterImage
>;

describe("POST /api/characters/create", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
    },
  };

  const validCharacterData = {
    gameId: "game-123",
    name: "Goku Stark",
    fusionIngredients: "Goku + Tony Stark",
    description: "A genius martial artist with incredible power",
    abilities: ["Kamehameha", "Arc Reactor Blast", "Super Saiyan", "Flight"],
    weakness: "Overconfidence in battle",
    alignment: "Chaotic Good",
    archetype: "Warrior-Inventor",
    tags: ["anime", "marvel"],
  };

  const mockPowerSheet = {
    level: 1,
    hp: 100,
    maxHp: 100,
    attributes: {
      strength: 60,
      agility: 55,
      intelligence: 50,
      charisma: 45,
      endurance: 40,
    },
    abilities: [
      {
        name: "Kamehameha",
        description: "Powerful energy wave",
        powerLevel: 8,
        cooldown: 3,
      },
      {
        name: "Arc Reactor Blast",
        description: "Energy beam from chest",
        powerLevel: 7,
        cooldown: 2,
      },
      {
        name: "Super Saiyan",
        description: "Transform to increase power",
        powerLevel: 9,
        cooldown: null,
      },
      {
        name: "Flight",
        description: "Fly through the air",
        powerLevel: 5,
        cooldown: null,
      },
    ],
    weakness: "Overconfidence in battle",
    statuses: [],
    perks: [],
  };

  const mockImageResult = {
    success: true,
    imageUrl: "https://example.com/character.png",
    imagePrompt: "A detailed character portrait of Goku Stark...",
  };

  const mockGame = {
    id: "game-123",
    name: "Test Game",
    hostId: "host-123",
    status: "lobby",
    players: [
      {
        id: "player-123",
        userId: "user-123",
        gameId: "game-123",
        role: "player",
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllRateLimits(); // Clear rate limits between tests
    mockGetServerSession.mockResolvedValue(mockSession as any);
  });

  describe("Authentication", () => {
    it("should reject unauthenticated requests", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Validation", () => {
    it("should reject request with missing required fields", async () => {
      const invalidData = {
        gameId: "game-123",
        name: "Test",
        // Missing fusionIngredients, description, abilities, weakness
      };

      const request = {
        json: async () => invalidData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toContain("fusionIngredients is required");
      expect(data.details).toContain("description is required");
      expect(data.details).toContain("abilities must be an array");
      expect(data.details).toContain("weakness is required");
    });

    it("should reject abilities array with less than 3 items", async () => {
      const invalidData = {
        ...validCharacterData,
        abilities: ["Ability 1", "Ability 2"], // Only 2 abilities
      };

      const request = {
        json: async () => invalidData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toContain("abilities must contain 3-6 items");
    });

    it("should reject abilities array with more than 6 items", async () => {
      const invalidData = {
        ...validCharacterData,
        abilities: ["A1", "A2", "A3", "A4", "A5", "A6", "A7"], // 7 abilities
      };

      const request = {
        json: async () => invalidData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toContain("abilities must contain 3-6 items");
    });

    it("should accept optional fields when provided", async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);
      mockGeneratePowerSheet.mockResolvedValue({
        success: true,
        powerSheet: mockPowerSheet,
      });
      mockGenerateCharacterImage.mockResolvedValue(mockImageResult);
      (prisma.character.create as jest.Mock).mockResolvedValue({
        id: "char-123",
        ...validCharacterData,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        user: mockSession.user,
      });

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept request without optional fields", async () => {
      const dataWithoutOptionals = {
        gameId: "game-123",
        name: "Simple Character",
        fusionIngredients: "Character A + Character B",
        description: "A simple fusion character",
        abilities: ["Ability 1", "Ability 2", "Ability 3"],
        weakness: "Simple weakness",
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);
      mockGeneratePowerSheet.mockResolvedValue({
        success: true,
        powerSheet: mockPowerSheet,
      });
      mockGenerateCharacterImage.mockResolvedValue(mockImageResult);
      (prisma.character.create as jest.Mock).mockResolvedValue({
        id: "char-123",
        ...dataWithoutOptionals,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        user: mockSession.user,
      });

      const request = {
        json: async () => dataWithoutOptionals,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Game validation", () => {
    it("should reject if game does not exist", async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Game not found");
    });

    it("should reject if user is not a player in the game", async () => {
      const gameWithoutUser = {
        ...mockGame,
        players: [], // User not in players list
      };

      (prisma.game.findUnique as jest.Mock).mockResolvedValue(gameWithoutUser);

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe("You are not a player in this game");
    });
  });

  describe("One character per player enforcement", () => {
    it("should reject if player already has a character in the game", async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-char-123",
        gameId: "game-123",
        userId: "user-123",
        name: "Existing Character",
      });

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("You already have a character in this game");
    });
  });

  describe("AI generation", () => {
    beforeEach(() => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);
    });

    it("should call Power Sheet generator with correct parameters", async () => {
      mockGeneratePowerSheet.mockResolvedValue({
        success: true,
        powerSheet: mockPowerSheet,
      });
      mockGenerateCharacterImage.mockResolvedValue(mockImageResult);
      (prisma.character.create as jest.Mock).mockResolvedValue({
        id: "char-123",
        ...validCharacterData,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        user: mockSession.user,
      });

      const request = {
        json: async () => validCharacterData,
      };

      await POST(request as any);

      expect(mockGeneratePowerSheet).toHaveBeenCalledWith({
        name: validCharacterData.name,
        fusionIngredients: validCharacterData.fusionIngredients,
        description: validCharacterData.description,
        abilities: validCharacterData.abilities,
        weakness: validCharacterData.weakness,
        alignment: validCharacterData.alignment,
        archetype: validCharacterData.archetype,
        tags: validCharacterData.tags,
      });
    });

    it("should call image generator with correct parameters", async () => {
      mockGeneratePowerSheet.mockResolvedValue({
        success: true,
        powerSheet: mockPowerSheet,
      });
      mockGenerateCharacterImage.mockResolvedValue(mockImageResult);
      (prisma.character.create as jest.Mock).mockResolvedValue({
        id: "char-123",
        ...validCharacterData,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        user: mockSession.user,
      });

      const request = {
        json: async () => validCharacterData,
      };

      await POST(request as any);

      expect(mockGenerateCharacterImage).toHaveBeenCalledWith({
        name: validCharacterData.name,
        fusionIngredients: validCharacterData.fusionIngredients,
        description: validCharacterData.description,
        alignment: validCharacterData.alignment,
        archetype: validCharacterData.archetype,
        tags: validCharacterData.tags,
      });
    });

    it("should preserve input data when Power Sheet generation fails", async () => {
      mockGeneratePowerSheet.mockResolvedValue({
        success: false,
        error: "OpenAI API error",
      });

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to generate Power Sheet");
      expect(data.preservedInput).toEqual(validCharacterData);
    });

    it("should preserve input data when image generation fails", async () => {
      mockGeneratePowerSheet.mockResolvedValue({
        success: true,
        powerSheet: mockPowerSheet,
      });
      mockGenerateCharacterImage.mockResolvedValue({
        success: false,
        error: "DALL-E API error",
      });

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to generate character image");
      expect(data.preservedInput).toEqual(validCharacterData);
    });
  });

  describe("Successful character creation", () => {
    beforeEach(() => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);
      mockGeneratePowerSheet.mockResolvedValue({
        success: true,
        powerSheet: mockPowerSheet,
      });
      mockGenerateCharacterImage.mockResolvedValue(mockImageResult);
    });

    it("should create character with all data", async () => {
      const mockCreatedCharacter = {
        id: "char-123",
        ...validCharacterData,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: mockSession.user,
      };

      (prisma.character.create as jest.Mock).mockResolvedValue(
        mockCreatedCharacter
      );
      (prisma.gamePlayer.update as jest.Mock).mockResolvedValue({});
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});

      const request = {
        json: async () => validCharacterData,
      };

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.character).toBeDefined();
      expect(data.character.id).toBe("char-123");
      expect(data.character.name).toBe(validCharacterData.name);
      expect(data.character.powerSheet).toEqual(mockPowerSheet);
      expect(data.character.imageUrl).toBe(mockImageResult.imageUrl);
    });

    it("should update GamePlayer with character ID", async () => {
      (prisma.character.create as jest.Mock).mockResolvedValue({
        id: "char-123",
        ...validCharacterData,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        user: mockSession.user,
      });
      (prisma.gamePlayer.update as jest.Mock).mockResolvedValue({});
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});

      const request = {
        json: async () => validCharacterData,
      };

      await POST(request as any);

      expect(prisma.gamePlayer.update).toHaveBeenCalledWith({
        where: {
          gameId_userId: {
            gameId: validCharacterData.gameId,
            userId: mockSession.user.id,
          },
        },
        data: {
          characterId: "char-123",
        },
      });
    });

    it("should log image generation", async () => {
      (prisma.character.create as jest.Mock).mockResolvedValue({
        id: "char-123",
        ...validCharacterData,
        powerSheet: mockPowerSheet,
        imageUrl: mockImageResult.imageUrl,
        imagePrompt: mockImageResult.imagePrompt,
        user: mockSession.user,
      });
      (prisma.gamePlayer.update as jest.Mock).mockResolvedValue({});
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});

      const request = {
        json: async () => validCharacterData,
      };

      await POST(request as any);

      expect(prisma.imageGenerationLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockSession.user.id,
          characterId: "char-123",
          prompt: mockImageResult.imagePrompt,
          imageUrl: mockImageResult.imageUrl,
        },
      });
    });
  });
});

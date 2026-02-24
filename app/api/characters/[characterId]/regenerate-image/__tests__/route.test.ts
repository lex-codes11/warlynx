/**
 * Unit tests for image regeneration API route
 * Tests POST /api/characters/[characterId]/regenerate-image endpoint
 * @jest-environment node
 */

// Set up environment variables before imports
process.env.OPENAI_API_KEY = "test-api-key";

// Mock OpenAI at the module level
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    images: {
      generate: jest.fn(),
    },
  }));
});

// Mock dependencies BEFORE importing the route
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    character: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    imageGenerationLog: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/ai/image-generator");
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

import { POST } from "../route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { generateCharacterImage } from "@/lib/ai/image-generator";
import { clearAllRateLimits } from "@/lib/rate-limit";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockGenerateCharacterImage = generateCharacterImage as jest.MockedFunction<
  typeof generateCharacterImage
>;

describe("POST /api/characters/[characterId]/regenerate-image", () => {
  const mockUserId = "user-123";
  const mockCharacterId = "char-456";
  const mockSession = {
    user: { id: mockUserId, email: "test@example.com" },
    expires: "2024-12-31",
  };

  const mockCharacter = {
    id: mockCharacterId,
    userId: mockUserId,
    gameId: "game-789",
    name: "Test Character",
    fusionIngredients: "Goku + Pikachu",
    description: "A powerful fusion",
    abilities: ["Kamehameha", "Thunderbolt", "Super Speed"],
    weakness: "Water attacks",
    alignment: "Chaotic Good",
    archetype: "Warrior",
    tags: ["anime", "pokemon"],
    powerSheet: {},
    imageUrl: "https://example.com/old-image.png",
    imagePrompt: "Old prompt",
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: mockUserId,
      displayName: "Test User",
      avatar: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear rate limit store between tests
    clearAllRateLimits();
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it("should return 400 for invalid character ID", async () => {
      const request = {} as any;

      const response = await POST(request, { params: { characterId: "" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid character ID");
    });

    it("should return 404 if character does not exist", async () => {
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);

      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Character not found");
    });

    it("should return 403 if user does not own the character", async () => {
      const otherUserCharacter = {
        ...mockCharacter,
        userId: "other-user-999",
      };
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(
        otherUserCharacter
      );

      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("permission");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter
      );
      mockGenerateCharacterImage.mockResolvedValue({
        success: true,
        imageUrl: "https://example.com/new-image.png",
        imagePrompt: "New prompt",
      });
      (prisma.character.update as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        imageUrl: "https://example.com/new-image.png",
      });
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});
    });

    it("should allow requests within rate limit", async () => {
      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rateLimit.remaining).toBe(2); // 3 max - 1 used = 2 remaining
    });

    it("should enforce rate limit after max requests", async () => {
      const request = {} as any;

      // Make 3 requests (default limit)
      await POST(request, { params: { characterId: mockCharacterId } });
      await POST(request, { params: { characterId: mockCharacterId } });
      await POST(request, { params: { characterId: mockCharacterId } });

      // 4th request should be rate limited
      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(data.error.message).toContain("Rate limit exceeded");
      expect(data.error.retryable).toBe(true);
      expect(data.error.resetAt).toBeDefined();
      expect(response.headers.get("Retry-After")).toBeDefined();
    });

    it("should include rate limit headers in response", async () => {
      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });

      expect(response.headers.get("X-RateLimit-Limit")).toBe("3");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("2");
      expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
    });

    it("should reset rate limit after window expires", async () => {
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let currentTime = 1000000000000;
      Date.now = jest.fn(() => currentTime);

      const request = {} as any;

      // Use up all requests
      await POST(request, { params: { characterId: mockCharacterId } });
      await POST(request, { params: { characterId: mockCharacterId } });
      await POST(request, { params: { characterId: mockCharacterId } });

      // Advance time past rate limit window (1 hour + 1 second)
      currentTime += 60 * 60 * 1000 + 1000;

      // Should allow request again
      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rateLimit.remaining).toBe(2);

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe("Image Generation", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(
        mockCharacter
      );
    });

    it("should successfully regenerate character image", async () => {
      const newImageUrl = "https://example.com/new-image.png";
      const newImagePrompt = "A powerful fusion of Goku and Pikachu";

      mockGenerateCharacterImage.mockResolvedValue({
        success: true,
        imageUrl: newImageUrl,
        imagePrompt: newImagePrompt,
      });

      const updatedCharacter = {
        ...mockCharacter,
        imageUrl: newImageUrl,
        imagePrompt: newImagePrompt,
      };
      (prisma.character.update as jest.Mock).mockResolvedValue(
        updatedCharacter
      );
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});

      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.character.imageUrl).toBe(newImageUrl);
      expect(mockGenerateCharacterImage).toHaveBeenCalledWith({
        name: mockCharacter.name,
        fusionIngredients: mockCharacter.fusionIngredients,
        description: mockCharacter.description,
        alignment: mockCharacter.alignment,
        archetype: mockCharacter.archetype,
        tags: mockCharacter.tags,
      });
    });

    it("should update character in database with new image", async () => {
      const newImageUrl = "https://example.com/new-image.png";
      const newImagePrompt = "New prompt";

      mockGenerateCharacterImage.mockResolvedValue({
        success: true,
        imageUrl: newImageUrl,
        imagePrompt: newImagePrompt,
      });

      (prisma.character.update as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        imageUrl: newImageUrl,
      });
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});

      const request = {} as any;

      await POST(request, { params: { characterId: mockCharacterId } });

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: mockCharacterId },
        data: {
          imageUrl: newImageUrl,
          imagePrompt: newImagePrompt,
          updatedAt: expect.any(Date),
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      });
    });

    it("should log image generation in ImageGenerationLog", async () => {
      const newImageUrl = "https://example.com/new-image.png";
      const newImagePrompt = "New prompt";

      mockGenerateCharacterImage.mockResolvedValue({
        success: true,
        imageUrl: newImageUrl,
        imagePrompt: newImagePrompt,
      });

      (prisma.character.update as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        imageUrl: newImageUrl,
      });
      (prisma.imageGenerationLog.create as jest.Mock).mockResolvedValue({});

      const request = {} as any;

      await POST(request, { params: { characterId: mockCharacterId } });

      expect(prisma.imageGenerationLog.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          characterId: mockCharacterId,
          prompt: newImagePrompt,
          imageUrl: newImageUrl,
        },
      });
    });

    it("should return 500 if image generation fails", async () => {
      mockGenerateCharacterImage.mockResolvedValue({
        success: false,
        error: "OpenAI API error",
      });

      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to generate character image");
      expect(data.retryable).toBe(true);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(mockSession);
    });

    it("should handle database errors gracefully", async () => {
      (prisma.character.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = {} as any;

      const response = await POST(request, {
        params: { characterId: mockCharacterId },
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
      expect(data.retryable).toBe(false);
    });
  });
});

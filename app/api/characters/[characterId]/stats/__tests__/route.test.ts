/**
 * Unit tests for Character Stats API Route
 * @jest-environment node
 */

// Mock dependencies BEFORE importing the route
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    character: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock("@/lib/stats-tracker");
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

import { NextRequest } from "next/server";
import { GET } from "../route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  getCharacterHistory,
  getProgressionSummary,
  getLatestSnapshot,
} from "@/lib/stats-tracker";

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockGetCharacterHistory = getCharacterHistory as jest.MockedFunction<
  typeof getCharacterHistory
>;
const mockGetProgressionSummary = getProgressionSummary as jest.MockedFunction<
  typeof getProgressionSummary
>;
const mockGetLatestSnapshot = getLatestSnapshot as jest.MockedFunction<
  typeof getLatestSnapshot
>;

describe("GET /api/characters/[characterId]/stats", () => {
  const mockCharacterId = "char-123";
  const mockUserId = "user-123";

  const mockCharacter = {
    id: mockCharacterId,
    gameId: "game-123",
    userId: mockUserId,
    name: "Test Character",
    fusionIngredients: "Character A + Character B",
    description: "A test character",
    abilities: ["Ability 1", "Ability 2"],
    weakness: "Test weakness",
    alignment: "Neutral",
    archetype: "Warrior",
    tags: ["test"],
    powerSheet: {
      level: 3,
      hp: 120,
      maxHp: 150,
      attributes: {
        strength: 60,
        agility: 55,
        intelligence: 45,
        charisma: 35,
        endurance: 55,
      },
      abilities: [
        { name: "Ability 1", description: "First ability", powerLevel: 5 },
        { name: "Ability 2", description: "Second ability", powerLevel: 7 },
      ],
      weakness: "Test weakness",
      statuses: [
        { name: "Blessed", description: "Increased stats", duration: 2, effect: "+10%" },
      ],
      perks: [
        { name: "Perk 1", description: "First perk", unlockedAt: 2 },
      ],
    },
    imageUrl: "https://example.com/image.png",
    imagePrompt: "Test prompt",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-02"),
    game: {
      id: "game-123",
      players: [{ userId: mockUserId }],
    },
  };

  const mockLatestSnapshot = {
    id: "snap-3",
    gameId: "game-123",
    characterId: mockCharacterId,
    turnId: "turn-3",
    level: 3,
    hp: 120,
    maxHp: 150,
    attributes: {
      strength: 60,
      agility: 55,
      intelligence: 45,
      charisma: 35,
      endurance: 55,
    },
    statuses: [
      { name: "Blessed", description: "Increased stats", duration: 2, effect: "+10%" },
    ],
    perks: [
      { name: "Perk 1", description: "First perk", unlockedAt: 2 },
    ],
    createdAt: new Date("2024-01-03"),
  };

  const mockHistory = [
    mockLatestSnapshot,
    {
      id: "snap-2",
      gameId: "game-123",
      characterId: mockCharacterId,
      turnId: "turn-2",
      level: 2,
      hp: 100,
      maxHp: 120,
      attributes: {
        strength: 55,
        agility: 50,
        intelligence: 40,
        charisma: 30,
        endurance: 50,
      },
      statuses: [],
      perks: [],
      createdAt: new Date("2024-01-02"),
    },
    {
      id: "snap-1",
      gameId: "game-123",
      characterId: mockCharacterId,
      turnId: "turn-1",
      level: 1,
      hp: 100,
      maxHp: 100,
      attributes: {
        strength: 50,
        agility: 50,
        intelligence: 40,
        charisma: 30,
        endurance: 50,
      },
      statuses: [],
      perks: [],
      createdAt: new Date("2024-01-01"),
    },
  ];

  const mockSummary = {
    totalSnapshots: 3,
    firstSnapshot: mockHistory[2],
    latestSnapshot: mockHistory[0],
    totalLevelsGained: 2,
    totalPerksUnlocked: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return stats for character owner", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(mockCharacter);
    mockGetLatestSnapshot.mockResolvedValue(mockLatestSnapshot);
    mockGetCharacterHistory.mockResolvedValue(mockHistory);
    mockGetProgressionSummary.mockResolvedValue(mockSummary);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.character.id).toBe(mockCharacterId);
    expect(data.character.name).toBe("Test Character");
    expect(data.currentStats.level).toBe(3);
    expect(data.currentStats.hp).toBe(120);
    expect(data.currentStats.maxHp).toBe(150);
    // Dates are serialized to strings in JSON response
    expect(data.latestSnapshot.id).toBe(mockLatestSnapshot.id);
    expect(data.latestSnapshot.level).toBe(mockLatestSnapshot.level);
    expect(data.history).toHaveLength(mockHistory.length);
    expect(data.summary.totalSnapshots).toBe(mockSummary.totalSnapshots);
    expect(data.summary.totalLevelsGained).toBe(mockSummary.totalLevelsGained);
  });

  it("should return stats for game player (not owner)", async () => {
    const otherUserId = "user-456";
    mockGetServerSession.mockResolvedValue({
      user: { id: otherUserId, email: "other@example.com" },
      expires: "2024-12-31",
    });

    const characterWithOtherPlayer = {
      ...mockCharacter,
      userId: mockUserId, // Different from requesting user
      game: {
        id: "game-123",
        players: [{ userId: otherUserId }], // But requesting user is in the game
      },
    };

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(
      characterWithOtherPlayer
    );
    mockGetLatestSnapshot.mockResolvedValue(mockLatestSnapshot);
    mockGetCharacterHistory.mockResolvedValue(mockHistory);
    mockGetProgressionSummary.mockResolvedValue(mockSummary);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should respect limit query parameter", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(mockCharacter);
    mockGetLatestSnapshot.mockResolvedValue(mockLatestSnapshot);
    mockGetCharacterHistory.mockResolvedValue(mockHistory.slice(0, 2));
    mockGetProgressionSummary.mockResolvedValue(mockSummary);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats?limit=2`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCharacterHistory).toHaveBeenCalledWith(mockCharacterId, 2);
  });

  it("should exclude summary when includeSummary=false", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(mockCharacter);
    mockGetLatestSnapshot.mockResolvedValue(mockLatestSnapshot);
    mockGetCharacterHistory.mockResolvedValue(mockHistory);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats?includeSummary=false`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toBeNull();
    expect(mockGetProgressionSummary).not.toHaveBeenCalled();
  });

  it("should return 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 for invalid character ID", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    const request = new NextRequest(
      `http://localhost:3000/api/characters//stats`
    );

    const response = await GET(request, { params: { characterId: "" } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid character ID");
  });

  it("should return 404 for non-existent character", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Character not found");
  });

  it("should return 403 for unauthorized access", async () => {
    const unauthorizedUserId = "user-999";
    mockGetServerSession.mockResolvedValue({
      user: { id: unauthorizedUserId, email: "unauthorized@example.com" },
      expires: "2024-12-31",
    });

    const characterWithNoAccess = {
      ...mockCharacter,
      userId: mockUserId, // Different from requesting user
      game: {
        id: "game-123",
        players: [], // Requesting user is NOT in the game
      },
    };

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(
      characterWithNoAccess
    );

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toBe(
      "You do not have permission to view this character's stats"
    );
  });

  it("should handle null latest snapshot", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(mockCharacter);
    mockGetLatestSnapshot.mockResolvedValue(null);
    mockGetCharacterHistory.mockResolvedValue([]);
    mockGetProgressionSummary.mockResolvedValue({
      totalSnapshots: 0,
      firstSnapshot: null,
      latestSnapshot: null,
      totalLevelsGained: 0,
      totalPerksUnlocked: 0,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.latestSnapshot).toBeNull();
    expect(data.history).toEqual([]);
  });

  it("should handle database errors gracefully", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Internal server error");
    expect(data.details).toBe("Database connection failed");
    expect(data.retryable).toBe(false);
  });

  it("should include all current stats fields", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(mockCharacter);
    mockGetLatestSnapshot.mockResolvedValue(mockLatestSnapshot);
    mockGetCharacterHistory.mockResolvedValue(mockHistory);
    mockGetProgressionSummary.mockResolvedValue(mockSummary);

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentStats).toHaveProperty("level");
    expect(data.currentStats).toHaveProperty("hp");
    expect(data.currentStats).toHaveProperty("maxHp");
    expect(data.currentStats).toHaveProperty("attributes");
    expect(data.currentStats).toHaveProperty("statuses");
    expect(data.currentStats).toHaveProperty("perks");
    expect(data.currentStats).toHaveProperty("abilities");
    expect(data.currentStats).toHaveProperty("weakness");
    expect(data.currentStats.attributes).toHaveProperty("strength");
    expect(data.currentStats.attributes).toHaveProperty("agility");
    expect(data.currentStats.attributes).toHaveProperty("intelligence");
    expect(data.currentStats.attributes).toHaveProperty("charisma");
    expect(data.currentStats.attributes).toHaveProperty("endurance");
  });

  it("should handle missing optional fields in powerSheet", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: "test@example.com" },
      expires: "2024-12-31",
    });

    const characterWithMinimalPowerSheet = {
      ...mockCharacter,
      powerSheet: {
        level: 1,
        hp: 100,
        maxHp: 100,
        attributes: {
          strength: 50,
          agility: 50,
          intelligence: 40,
          charisma: 30,
          endurance: 50,
        },
        weakness: "Test weakness",
        // Missing statuses, perks, abilities
      },
    };

    (prisma.character.findUnique as jest.Mock).mockResolvedValue(
      characterWithMinimalPowerSheet
    );
    mockGetLatestSnapshot.mockResolvedValue(null);
    mockGetCharacterHistory.mockResolvedValue([]);
    mockGetProgressionSummary.mockResolvedValue({
      totalSnapshots: 0,
      firstSnapshot: null,
      latestSnapshot: null,
      totalLevelsGained: 0,
      totalPerksUnlocked: 0,
    });

    const request = new NextRequest(
      `http://localhost:3000/api/characters/${mockCharacterId}/stats`
    );

    const response = await GET(request, { params: { characterId: mockCharacterId } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentStats.statuses).toEqual([]);
    expect(data.currentStats.perks).toEqual([]);
    expect(data.currentStats.abilities).toEqual([]);
  });
});

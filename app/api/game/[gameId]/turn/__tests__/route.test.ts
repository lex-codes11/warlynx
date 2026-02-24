/**
 * Turn Processing API Route Tests
 * 
 * Tests for POST /api/game/[gameId]/turn
 * Validates: Requirements 6.3, 6.4, 7.6, 13.2
 * @jest-environment node
 */

import { POST } from '../route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isActivePlayer, advanceTurn, getActivePlayer } from '@/lib/turn-manager';
import { generateTurnNarrative } from '@/lib/ai/dungeon-master';
import { processStatUpdates } from '@/lib/ai/stat-updater';
import { validateAction } from '@/lib/ai/action-validator';
import * as broadcast from '@/lib/realtime/broadcast';
import { clearAllRateLimits } from '@/lib/rate-limit';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    turn: {
      create: jest.fn(),
      update: jest.fn(),
    },
    gameEvent: {
      create: jest.fn(),
    },
    character: {
      findUnique: jest.fn(),
    },
  },
}));
jest.mock('@/lib/turn-manager');
jest.mock('@/lib/ai/dungeon-master');
jest.mock('@/lib/ai/stat-updater');
jest.mock('@/lib/ai/action-validator');
jest.mock('@/lib/realtime/broadcast');
jest.mock('@/lib/auth-options', () => ({
  authOptions: {}
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockIsActivePlayer = isActivePlayer as jest.MockedFunction<typeof isActivePlayer>;
const mockAdvanceTurn = advanceTurn as jest.MockedFunction<typeof advanceTurn>;
const mockGetActivePlayer = getActivePlayer as jest.MockedFunction<typeof getActivePlayer>;
const mockGenerateTurnNarrative = generateTurnNarrative as jest.MockedFunction<
  typeof generateTurnNarrative
>;
const mockProcessStatUpdates = processStatUpdates as jest.MockedFunction<
  typeof processStatUpdates
>;
const mockValidateAction = validateAction as jest.MockedFunction<typeof validateAction>;
const mockBroadcast = broadcast as jest.Mocked<typeof broadcast>;

describe('POST /api/game/[gameId]/turn', () => {
  const mockGameId = 'game-123';
  const mockUserId = 'user-123';
  const mockCharacterId = 'char-123';
  const mockTurnId = 'turn-123';

  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
      displayName: 'Test User',
    },
    expires: '2024-12-31',
  };

  const mockGame = {
    id: mockGameId,
    status: 'active',
    currentTurnIndex: 0,
    turnOrder: [mockUserId, 'user-456'],
  };

  const mockPowerSheet = {
    level: 1,
    hp: 100,
    maxHp: 100,
    attributes: {
      strength: 50,
      agility: 50,
      intelligence: 50,
      charisma: 50,
      endurance: 50,
    },
    abilities: [
      {
        name: 'Fire Blast',
        description: 'Shoots a blast of fire',
        powerLevel: 5,
        cooldown: null,
      },
    ],
    weakness: 'Water',
    statuses: [],
    perks: [],
  };

  const mockCharacter = {
    id: mockCharacterId,
    name: 'Test Character',
    imageUrl: 'https://example.com/image.png',
    powerSheet: mockPowerSheet,
  };

  const mockActivePlayer = {
    id: 'player-123',
    userId: mockUserId,
    user: {
      id: mockUserId,
      displayName: 'Test User',
      avatar: null,
    },
    character: mockCharacter,
  };

  const mockDMResponse = {
    success: true,
    narrative: 'You enter a dark cave...',
    choices: [
      { label: 'A' as const, description: 'Go left', riskLevel: 'low' as const },
      { label: 'B' as const, description: 'Go right', riskLevel: 'medium' as const },
      { label: 'C' as const, description: 'Go back', riskLevel: 'low' as const },
      { label: 'D' as const, description: 'Investigate', riskLevel: 'high' as const },
    ],
    statUpdates: [],
    validationError: null,
  };

  const mockNextActivePlayer = {
    userId: 'user-456',
    user: {
      id: 'user-456',
      displayName: 'Next Player',
      avatar: null,
    },
    character: {
      id: 'char-456',
      name: 'Next Character',
      imageUrl: 'https://example.com/next.png',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllRateLimits(); // Clear rate limits between tests

    // Default mocks
    mockGetServerSession.mockResolvedValue(mockSession as any);
    (prisma.game.findUnique as jest.Mock).mockResolvedValue(mockGame);
    mockIsActivePlayer.mockResolvedValue(true);
    mockGetActivePlayer.mockResolvedValue(mockActivePlayer as any);
    (prisma.turn.create as jest.Mock).mockResolvedValue({ id: mockTurnId });
    (prisma.turn.update as jest.Mock).mockResolvedValue({ id: mockTurnId });
    (prisma.gameEvent.create as jest.Mock).mockResolvedValue({});
    mockGenerateTurnNarrative.mockResolvedValue(mockDMResponse);
    mockProcessStatUpdates.mockResolvedValue(new Map());
    mockAdvanceTurn.mockResolvedValue({
      game: { ...mockGame, currentTurnIndex: 1 },
      activePlayer: mockNextActivePlayer,
    } as any);
    mockBroadcast.broadcastTurnResolved = jest.fn().mockResolvedValue(undefined);
    mockBroadcast.broadcastStatsUpdate = jest.fn().mockResolvedValue(undefined);
    mockBroadcast.broadcastCharacterUpdate = jest.fn().mockResolvedValue(undefined);
    mockBroadcast.broadcastGameUpdate = jest.fn().mockResolvedValue(undefined);
  });

  const createRequest = (body: any) => {
    return new Request('http://localhost:3000/api/game/game-123/turn', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Request Validation', () => {
    it('should reject requests without action', async () => {
      const request = createRequest({});
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should reject requests with invalid action type', async () => {
      const request = createRequest({ action: 123 });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('Game Validation', () => {
    it('should reject if game not found', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_NOT_FOUND');
    });

    it('should reject if game is not active', async () => {
      (prisma.game.findUnique as jest.Mock).mockResolvedValue({
        ...mockGame,
        status: 'lobby',
      });

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_NOT_ACTIVE');
    });
  });

  describe('Permission Validation', () => {
    it('should reject if not active player', async () => {
      mockIsActivePlayer.mockResolvedValue(false);

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_YOUR_TURN');
    });

    it('should reject if character is dead', async () => {
      mockGetActivePlayer.mockResolvedValue({
        ...mockActivePlayer,
        character: {
          ...mockCharacter,
          powerSheet: {
            ...mockPowerSheet,
            hp: 0,
          },
        },
      } as any);

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('CHARACTER_DEAD');
    });
  });

  describe('Action Validation', () => {
    it('should accept standard choices (A, B, C, D) without validation', async () => {
      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockValidateAction).not.toHaveBeenCalled();
    });

    it('should validate custom actions', async () => {
      mockValidateAction.mockReturnValue({
        valid: true,
        reason: 'Action is valid',
      });

      const request = createRequest({ action: 'I cast a fire spell' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockValidateAction).toHaveBeenCalledWith(
        'I cast a fire spell',
        mockPowerSheet,
        'Test Character'
      );
    });

    it('should reject invalid custom actions', async () => {
      mockValidateAction.mockReturnValue({
        valid: false,
        reason: 'Action is outside your abilities',
        suggestedAlternatives: ['Fire Blast'],
      });

      const request = createRequest({ action: 'I summon a dragon' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_ACTION');
      expect(data.error.details.suggestedAlternatives).toEqual(['Fire Blast']);
    });
  });

  describe('Turn Processing', () => {
    it('should process a valid turn successfully', async () => {
      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.narrative).toBe('You enter a dark cave...');
      expect(data.data.choices).toHaveLength(4);
      expect(data.data.nextActivePlayer.userId).toBe('user-456');

      // Verify turn was created
      expect(prisma.turn.create).toHaveBeenCalledWith({
        data: {
          gameId: mockGameId,
          turnIndex: 0,
          activePlayerId: mockUserId,
          phase: 'resolving',
        },
      });

      // Verify events were created
      expect(prisma.gameEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'action',
            content: 'Test Character chose: A',
          }),
        })
      );

      expect(prisma.gameEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'narrative',
            content: 'You enter a dark cave...',
          }),
        })
      );

      // Verify turn was advanced
      expect(mockAdvanceTurn).toHaveBeenCalledWith(mockGameId);

      // Verify broadcasts
      expect(mockBroadcast.broadcastTurnResolved).toHaveBeenCalled();
      expect(mockBroadcast.broadcastGameUpdate).toHaveBeenCalled();
    });

    it('should handle DM generation failure', async () => {
      mockGenerateTurnNarrative.mockResolvedValue({
        success: false,
        narrative: '',
        choices: [],
        statUpdates: [],
        validationError: null,
        error: 'OpenAI API error',
      });

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DM_GENERATION_FAILED');
    });

    it('should handle DM validation error', async () => {
      // Mock client-side validation to pass
      mockValidateAction.mockReturnValue({
        valid: true,
        reason: 'Action is valid',
      });

      // Mock DM to return validation error
      mockGenerateTurnNarrative.mockResolvedValue({
        success: true,
        narrative: '',
        choices: [],
        statUpdates: [],
        validationError: 'This action is too powerful',
      });

      const request = createRequest({ action: 'I destroy the universe' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_ACTION');
      expect(data.error.message).toBe('This action is too powerful');
    });
  });

  describe('Stat Updates', () => {
    it('should process stat updates and broadcast changes', async () => {
      const statUpdates = [
        {
          characterId: mockCharacterId,
          changes: {
            hp: -10,
          },
        },
      ];

      const updatedPowerSheet = {
        ...mockPowerSheet,
        hp: 90,
      };

      mockGenerateTurnNarrative.mockResolvedValue({
        ...mockDMResponse,
        statUpdates,
      });

      mockProcessStatUpdates.mockResolvedValue(
        new Map([[mockCharacterId, updatedPowerSheet]])
      );

      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Character',
        powerSheet: mockPowerSheet,
      });

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify stat updates were processed
      expect(mockProcessStatUpdates).toHaveBeenCalledWith(
        statUpdates,
        mockGameId,
        mockTurnId
      );

      // Verify broadcasts
      expect(mockBroadcast.broadcastCharacterUpdate).toHaveBeenCalledWith(mockGameId, {
        id: mockCharacterId,
        powerSheet: updatedPowerSheet,
      });

      expect(mockBroadcast.broadcastStatsUpdate).toHaveBeenCalledWith(mockGameId, {
        characterId: mockCharacterId,
        powerSheet: updatedPowerSheet,
      });
    });

    it('should create death event when character dies', async () => {
      const statUpdates = [
        {
          characterId: mockCharacterId,
          changes: {
            hp: -100,
          },
        },
      ];

      const updatedPowerSheet = {
        ...mockPowerSheet,
        hp: 0,
      };

      mockGenerateTurnNarrative.mockResolvedValue({
        ...mockDMResponse,
        statUpdates,
      });

      mockProcessStatUpdates.mockResolvedValue(
        new Map([[mockCharacterId, updatedPowerSheet]])
      );

      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Character',
        powerSheet: mockPowerSheet,
      });

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });

      expect(response.status).toBe(200);

      // Verify death event was created
      expect(prisma.gameEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'death',
            content: 'Test Character has died!',
          }),
        })
      );
    });

    it('should create level up event when character levels up', async () => {
      const statUpdates = [
        {
          characterId: mockCharacterId,
          changes: {
            level: 2,
          },
        },
      ];

      const updatedPowerSheet = {
        ...mockPowerSheet,
        level: 2,
        perks: [
          {
            name: 'Fire Mastery',
            description: '+10% fire damage',
            unlockedAt: 2,
          },
        ],
      };

      mockGenerateTurnNarrative.mockResolvedValue({
        ...mockDMResponse,
        statUpdates,
      });

      mockProcessStatUpdates.mockResolvedValue(
        new Map([[mockCharacterId, updatedPowerSheet]])
      );

      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Character',
        powerSheet: mockPowerSheet,
      });

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });

      expect(response.status).toBe(200);

      // Verify level up event was created
      expect(prisma.gameEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'level_up',
            content: 'Test Character leveled up to level 2!',
          }),
        })
      );
    });
  });

  describe('Game Over', () => {
    it('should handle game over when all players are dead', async () => {
      mockAdvanceTurn.mockRejectedValue(new Error('NO_ALIVE_PLAYERS'));

      const request = createRequest({ action: 'A' });
      const response = await POST(request as any, { params: { gameId: mockGameId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('GAME_OVER');

      // Verify game was marked as completed
      expect(prisma.game.update).toHaveBeenCalledWith({
        where: { id: mockGameId },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
    });
  });
});

/**
 * Character Mutations Tests
 * 
 * Tests for character update functions with real-time synchronization.
 */

import {
  updateCharacterDescription,
  updateCharacterAbilities,
  updateCharacterWeakness,
  updateCharacterName,
  updateCharacterAttributes,
  updateCharacterReadyState,
  canEditCharacter,
} from '../character-mutations';
import { prisma } from '../prisma';
import { broadcastCharacterUpdate } from '../realtime/broadcast';

// Mock dependencies
jest.mock('../prisma', () => ({
  prisma: {
    character: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../realtime/broadcast', () => ({
  broadcastCharacterUpdate: jest.fn(),
}));

describe('Character Mutations', () => {
  const mockCharacter = {
    id: 'char-123',
    gameId: 'game-123',
    userId: 'user-123',
    name: 'Test Character',
    description: 'A test character',
    abilities: ['Ability 1', 'Ability 2'],
    weakness: 'Test weakness',
    isReady: false,
    powerSheet: { level: 1, hp: 100, maxHp: 100 },
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateCharacterDescription', () => {
    it('should update character description and broadcast', async () => {
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      const result = await updateCharacterDescription('char-123', 'New description');

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          description: 'New description',
          updatedAt: expect.any(Date),
        },
      });

      expect(broadcastCharacterUpdate).toHaveBeenCalledWith(
        mockCharacter.gameId,
        mockCharacter
      );

      expect(result).toEqual(mockCharacter);
    });

    it('should reject descriptions over 1000 characters', async () => {
      const longDescription = 'a'.repeat(1001);

      await expect(
        updateCharacterDescription('char-123', longDescription)
      ).rejects.toThrow('Description must be 1000 characters or less');

      expect(prisma.character.update).not.toHaveBeenCalled();
    });

    it('should accept descriptions exactly 1000 characters', async () => {
      const maxDescription = 'a'.repeat(1000);
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      await updateCharacterDescription('char-123', maxDescription);

      expect(prisma.character.update).toHaveBeenCalled();
    });
  });

  describe('updateCharacterAbilities', () => {
    it('should update character abilities and broadcast', async () => {
      const newAbilities = ['New Ability 1', 'New Ability 2'];
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      const result = await updateCharacterAbilities('char-123', newAbilities);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          abilities: newAbilities,
          updatedAt: expect.any(Date),
        },
      });

      expect(broadcastCharacterUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockCharacter);
    });

    it('should reject non-array abilities', async () => {
      await expect(
        updateCharacterAbilities('char-123', 'not an array' as any)
      ).rejects.toThrow('Abilities must be an array');

      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCharacterWeakness', () => {
    it('should update character weakness and broadcast', async () => {
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      const result = await updateCharacterWeakness('char-123', 'New weakness');

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          weakness: 'New weakness',
          updatedAt: expect.any(Date),
        },
      });

      expect(broadcastCharacterUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('updateCharacterName', () => {
    it('should update character name and broadcast', async () => {
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      const result = await updateCharacterName('char-123', 'New Name');

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          name: 'New Name',
          updatedAt: expect.any(Date),
        },
      });

      expect(broadcastCharacterUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockCharacter);
    });

    it('should trim whitespace from name', async () => {
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      await updateCharacterName('char-123', '  Spaced Name  ');

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          name: 'Spaced Name',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should reject empty names', async () => {
      await expect(
        updateCharacterName('char-123', '')
      ).rejects.toThrow('Name cannot be empty');

      await expect(
        updateCharacterName('char-123', '   ')
      ).rejects.toThrow('Name cannot be empty');

      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe('updateCharacterAttributes', () => {
    it('should update multiple attributes at once', async () => {
      const updates = {
        name: 'New Name',
        description: 'New description',
        abilities: ['New Ability'],
      };
      (prisma.character.update as jest.Mock).mockResolvedValue(mockCharacter);

      const result = await updateCharacterAttributes('char-123', updates);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          name: 'New Name',
          description: 'New description',
          abilities: ['New Ability'],
          updatedAt: expect.any(Date),
        },
      });

      expect(broadcastCharacterUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockCharacter);
    });

    it('should validate description length', async () => {
      const updates = {
        description: 'a'.repeat(1001),
      };

      await expect(
        updateCharacterAttributes('char-123', updates)
      ).rejects.toThrow('Description must be 1000 characters or less');
    });

    it('should validate name is not empty', async () => {
      const updates = {
        name: '   ',
      };

      await expect(
        updateCharacterAttributes('char-123', updates)
      ).rejects.toThrow('Name cannot be empty');
    });

    it('should validate abilities is an array', async () => {
      const updates = {
        abilities: 'not an array' as any,
      };

      await expect(
        updateCharacterAttributes('char-123', updates)
      ).rejects.toThrow('Abilities must be an array');
    });
  });

  describe('updateCharacterReadyState', () => {
    it('should update ready state and broadcast', async () => {
      (prisma.character.update as jest.Mock).mockResolvedValue({
        ...mockCharacter,
        isReady: true,
      });

      const result = await updateCharacterReadyState('char-123', true);

      expect(prisma.character.update).toHaveBeenCalledWith({
        where: { id: 'char-123' },
        data: {
          isReady: true,
          updatedAt: expect.any(Date),
        },
      });

      expect(broadcastCharacterUpdate).toHaveBeenCalled();
      expect(result.isReady).toBe(true);
    });
  });

  describe('canEditCharacter', () => {
    it('should return true if user owns character and it is not ready', async () => {
      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        isReady: false,
      });

      const result = await canEditCharacter('char-123', 'user-123');

      expect(result).toBe(true);
    });

    it('should return false if character is ready', async () => {
      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        userId: 'user-123',
        isReady: true,
      });

      const result = await canEditCharacter('char-123', 'user-123');

      expect(result).toBe(false);
    });

    it('should return false if user does not own character', async () => {
      (prisma.character.findUnique as jest.Mock).mockResolvedValue({
        userId: 'other-user',
        isReady: false,
      });

      const result = await canEditCharacter('char-123', 'user-123');

      expect(result).toBe(false);
    });

    it('should return false if character not found', async () => {
      (prisma.character.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await canEditCharacter('char-123', 'user-123');

      expect(result).toBe(false);
    });
  });
});

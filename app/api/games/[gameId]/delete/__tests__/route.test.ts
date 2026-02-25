/**
 * Tests for Game Deletion API Route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('next-auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    game: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('DELETE /api/games/[gameId]/delete', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  };

  const mockGame = {
    id: 'game-123',
    hostId: 'user-123',
    status: 'lobby',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a game successfully when user is host and game is in lobby', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.game.findUnique).mockResolvedValue(mockGame as any);
    vi.mocked(prisma.game.delete).mockResolvedValue(mockGame as any);

    const request = new NextRequest('http://localhost:3000/api/games/game-123/delete');
    const response = await DELETE(request, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.game.delete).toHaveBeenCalledWith({
      where: { id: 'game-123' },
    });
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/games/game-123/delete');
    const response = await DELETE(request, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 404 when game does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.game.findUnique).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/games/game-123/delete');
    const response = await DELETE(request, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('GAME_NOT_FOUND');
  });

  it('should return 403 when user is not the host', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      ...mockGame,
      hostId: 'different-user',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/games/game-123/delete');
    const response = await DELETE(request, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED_NOT_HOST');
  });

  it('should return 400 when game has already started', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.game.findUnique).mockResolvedValue({
      ...mockGame,
      status: 'active',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/games/game-123/delete');
    const response = await DELETE(request, { params: { gameId: 'game-123' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('GAME_ALREADY_STARTED');
  });
});

import { prisma } from "@/lib/prisma";
import { getUserById, updateUserProfile } from "@/lib/auth";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock NextAuth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

describe("Auth Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        avatar: "https://example.com/avatar.jpg",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserById("user-123");

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatar: true,
        },
      });
    });

    it("should return null when user not found", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    it("should update user displayName", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Updated Name",
        avatar: null,
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateUserProfile("user-123", {
        displayName: "Updated Name",
      });

      expect(result).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { displayName: "Updated Name" },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatar: true,
        },
      });
    });

    it("should update user avatar", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        avatar: "https://example.com/new-avatar.jpg",
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateUserProfile("user-123", {
        avatar: "https://example.com/new-avatar.jpg",
      });

      expect(result).toEqual(mockUser);
    });

    it("should update both displayName and avatar", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        displayName: "New Name",
        avatar: "https://example.com/avatar.jpg",
      };

      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await updateUserProfile("user-123", {
        displayName: "New Name",
        avatar: "https://example.com/avatar.jpg",
      });

      expect(result).toEqual(mockUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          displayName: "New Name",
          avatar: "https://example.com/avatar.jpg",
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatar: true,
        },
      });
    });
  });
});

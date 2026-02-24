/**
 * @jest-environment node
 */

// Mock modules BEFORE imports
jest.mock("next/headers", () => ({
  headers: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(() => []),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(() => []),
    forEach: jest.fn(),
    [Symbol.iterator]: jest.fn(function* () {}),
  })),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    getAll: jest.fn(() => []),
    has: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Create a mock function that we can control
const mockGetServerSessionImpl = jest.fn();

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn((...args: any[]) => mockGetServerSessionImpl(...args)),
}));

const mockRedirectImpl = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: jest.fn((...args: any[]) => mockRedirectImpl(...args)),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  getSession,
  requireSession,
  isAuthenticated,
  getAuthenticatedUser,
  redirectToSignIn,
  redirectToDashboard,
} from "@/lib/session";

describe("Session Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSessionImpl.mockReset();
    mockRedirectImpl.mockReset();
  });

  describe("getSession", () => {
    it("should return session when authenticated", async () => {
      const mockSession = {
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "Test User",
          avatar: null,
        },
        expires: "2024-12-31",
      };

      mockGetServerSessionImpl.mockResolvedValue(mockSession);

      const session = await getSession();

      expect(session).toEqual(mockSession);
      expect(mockGetServerSessionImpl).toHaveBeenCalledTimes(1);
    });

    it("should return null when not authenticated", async () => {
      mockGetServerSessionImpl.mockResolvedValue(null);

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe("requireSession", () => {
    it("should return user when authenticated", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        avatar: null,
      };

      mockGetServerSessionImpl.mockResolvedValue({
        user: mockUser,
        expires: "2024-12-31",
      });

      const user = await requireSession();

      expect(user).toEqual(mockUser);
      expect(mockRedirectImpl).not.toHaveBeenCalled();
    });

    it("should redirect to sign-in when not authenticated", async () => {
      mockGetServerSessionImpl.mockResolvedValue(null);

      // Mock redirect to throw (Next.js behavior)
      mockRedirectImpl.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockRedirectImpl).toHaveBeenCalledWith("/auth/signin");
    });

    it("should redirect with callback URL when provided", async () => {
      mockGetServerSessionImpl.mockResolvedValue(null);

      mockRedirectImpl.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      await expect(requireSession("/dashboard")).rejects.toThrow(
        "NEXT_REDIRECT"
      );
      expect(mockRedirectImpl).toHaveBeenCalledWith(
        "/auth/signin?callbackUrl=%2Fdashboard"
      );
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when authenticated", async () => {
      mockGetServerSessionImpl.mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          displayName: "Test User",
          avatar: null,
        },
        expires: "2024-12-31",
      });

      const result = await isAuthenticated();

      expect(result).toBe(true);
    });

    it("should return false when not authenticated", async () => {
      mockGetServerSessionImpl.mockResolvedValue(null);

      const result = await isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe("getAuthenticatedUser", () => {
    it("should return user when authenticated", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        avatar: null,
      };

      mockGetServerSessionImpl.mockResolvedValue({
        user: mockUser,
        expires: "2024-12-31",
      });

      const user = await getAuthenticatedUser();

      expect(user).toEqual(mockUser);
    });

    it("should return null when not authenticated", async () => {
      mockGetServerSessionImpl.mockResolvedValue(null);

      const user = await getAuthenticatedUser();

      expect(user).toBeNull();
    });
  });

  describe("redirectToSignIn", () => {
    it("should redirect to sign-in page", () => {
      mockRedirectImpl.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      expect(() => redirectToSignIn()).toThrow("NEXT_REDIRECT");
      expect(mockRedirectImpl).toHaveBeenCalledWith("/auth/signin");
    });

    it("should redirect with callback URL when provided", () => {
      mockRedirectImpl.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      expect(() => redirectToSignIn("/game/123")).toThrow("NEXT_REDIRECT");
      expect(mockRedirectImpl).toHaveBeenCalledWith(
        "/auth/signin?callbackUrl=%2Fgame%2F123"
      );
    });
  });

  describe("redirectToDashboard", () => {
    it("should redirect to dashboard", () => {
      mockRedirectImpl.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      expect(() => redirectToDashboard()).toThrow("NEXT_REDIRECT");
      expect(mockRedirectImpl).toHaveBeenCalledWith("/dashboard");
    });
  });
});

/**
 * Property 2: Session persistence across navigation
 * Validates: Requirements 1.4
 */
describe("Property 2: Session persistence across navigation", () => {
  it("should maintain session state across multiple getSession calls", async () => {
    const mockSession = {
      user: {
        id: "user-1",
        email: "test@example.com",
        displayName: "Test User",
        avatar: null,
      },
      expires: "2024-12-31",
    };

    mockGetServerSessionImpl.mockResolvedValue(mockSession);

    // Simulate multiple page navigations
    const session1 = await getSession();
    const session2 = await getSession();
    const session3 = await getSession();

    // Session should be consistent across calls
    expect(session1).toEqual(mockSession);
    expect(session2).toEqual(mockSession);
    expect(session3).toEqual(mockSession);
  });
});

/**
 * Property 3: Protected route authentication enforcement
 * Validates: Requirements 1.5
 */
describe("Property 3: Protected route authentication enforcement", () => {
  it("should redirect unauthenticated requests to sign-in", async () => {
    mockGetServerSessionImpl.mockResolvedValue(null);
    mockRedirectImpl.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    // Any protected route should redirect when not authenticated
    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirectImpl).toHaveBeenCalledWith("/auth/signin");
  });

  it("should allow authenticated requests to proceed", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      displayName: "Test User",
      avatar: null,
    };

    mockGetServerSessionImpl.mockResolvedValue({
      user: mockUser,
      expires: "2024-12-31",
    });

    const user = await requireSession();

    expect(user).toEqual(mockUser);
    expect(mockRedirectImpl).not.toHaveBeenCalled();
  });
});

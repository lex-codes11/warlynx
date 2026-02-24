import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * Extended user type with all required fields
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
}

/**
 * Get the current authenticated user session
 * Returns null if not authenticated
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatar: true,
    },
  });

  return user;
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that require authentication
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized - authentication required");
  }

  return user;
}

/**
 * Check if a user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatar: true,
    },
  });

  return user;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    avatar?: string | null;
  }
): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      displayName: true,
      avatar: true,
    },
  });

  return user;
}

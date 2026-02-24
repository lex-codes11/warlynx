import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { AuthUser } from "@/lib/auth";

/**
 * API route authentication utilities
 * 
 * Validates: Requirements 1.5, 13.3
 */

/**
 * Error response helper
 */
function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        message,
        retryable: false,
      },
    },
    { status }
  );
}

/**
 * Get authenticated user from API route
 * Returns null if not authenticated
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest) {
 *   const user = await getApiUser(request);
 *   if (!user) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *   return NextResponse.json({ user });
 * }
 * ```
 */
export async function getApiUser(
  request: NextRequest
): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ? (session.user as AuthUser) : null;
}

/**
 * Require authentication in API routes
 * Returns error response if not authenticated
 * 
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const user = await requireApiAuth(request);
 *   if (user instanceof NextResponse) return user; // Error response
 *   
 *   // User is authenticated, proceed with logic
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function requireApiAuth(
  request: NextRequest
): Promise<AuthUser | NextResponse> {
  const user = await getApiUser(request);

  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  return user;
}

/**
 * Wrapper for API route handlers that require authentication
 * Automatically handles authentication and passes user to handler
 * 
 * @example
 * ```ts
 * export const GET = withApiAuth(async (request, user) => {
 *   return NextResponse.json({ user });
 * });
 * ```
 */
export function withApiAuth(
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const user = await requireApiAuth(request);

    if (user instanceof NextResponse) {
      return user; // Return error response
    }

    return handler(request, user);
  };
}

/**
 * Check if user has permission to perform action
 * Generic permission checker that can be extended
 * 
 * @param user - Authenticated user
 * @param resource - Resource being accessed (e.g., 'game', 'character')
 * @param action - Action being performed (e.g., 'create', 'update', 'delete')
 * @param resourceId - Optional resource ID for ownership checks
 * 
 * @example
 * ```ts
 * const canEdit = await checkPermission(user, 'game', 'update', gameId);
 * if (!canEdit) {
 *   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * }
 * ```
 */
export async function checkPermission(
  user: AuthUser,
  resource: string,
  action: string,
  resourceId?: string
): Promise<boolean> {
  // Basic permission check - can be extended with more complex logic
  // For now, authenticated users can perform most actions
  // Specific resource ownership checks should be done in the route handler
  return true;
}

/**
 * Verify user owns a resource
 * Helper for checking resource ownership
 * 
 * @param userId - User ID to check
 * @param ownerId - Owner ID of the resource
 * @returns True if user owns the resource
 * 
 * @example
 * ```ts
 * const game = await prisma.game.findUnique({ where: { id: gameId } });
 * if (!verifyOwnership(user.id, game.hostId)) {
 *   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 * }
 * ```
 */
export function verifyOwnership(userId: string, ownerId: string): boolean {
  return userId === ownerId;
}

/**
 * Verify user is a participant in a game
 * Helper for checking game participation
 * 
 * @param userId - User ID to check
 * @param gamePlayerIds - Array of player IDs in the game
 * @returns True if user is a participant
 */
export function verifyGameParticipation(
  userId: string,
  gamePlayerIds: string[]
): boolean {
  return gamePlayerIds.includes(userId);
}

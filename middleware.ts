import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Middleware for protecting routes and handling authentication redirects
 * 
 * Protected routes:
 * - /dashboard - User dashboard
 * - /game/* - Game-related pages (lobby, game room)
 * - /character/* - Character creation and management
 * - /api/* - API routes (except auth endpoints)
 * 
 * Validates: Requirements 1.4, 1.5
 */
export default withAuth(
  function middleware(req) {
    // Allow the request to proceed if authenticated
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // User is authorized if they have a valid token
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

/**
 * Configure which routes require authentication
 * 
 * Protected paths:
 * - /dashboard - User dashboard and game list
 * - /game/:path* - All game-related pages
 * - /character/:path* - Character creation and management
 * - /api/:path* - API routes (except /api/auth/*)
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/game/:path*",
    "/character/:path*",
    "/api/((?!auth).*)",
  ],
};

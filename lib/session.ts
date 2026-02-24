import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { AuthUser } from "@/lib/auth";

/**
 * Session management utilities for server-side authentication
 * 
 * Validates: Requirements 1.4, 1.5
 */

/**
 * Get the current session with full user data
 * Returns null if not authenticated
 * 
 * Use this in Server Components and API routes to check authentication status
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Require authentication in Server Components
 * Redirects to sign-in page if not authenticated
 * 
 * @param redirectTo - Optional path to redirect to after sign-in
 * @returns Authenticated user
 * 
 * @example
 * ```tsx
 * export default async function DashboardPage() {
 *   const user = await requireSession();
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 * ```
 */
export async function requireSession(
  redirectTo?: string
): Promise<AuthUser> {
  const session = await getSession();

  if (!session?.user) {
    const signInUrl = redirectTo
      ? `/auth/signin?callbackUrl=${encodeURIComponent(redirectTo)}`
      : "/auth/signin";
    redirect(signInUrl);
  }

  return session.user as AuthUser;
}

/**
 * Check if user is authenticated without redirecting
 * Returns true if authenticated, false otherwise
 * 
 * Use this when you need to conditionally render content based on auth status
 * 
 * @example
 * ```tsx
 * export default async function HomePage() {
 *   const isAuth = await isAuthenticated();
 *   return isAuth ? <Dashboard /> : <LandingPage />;
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Get authenticated user or null
 * Does not redirect, returns null if not authenticated
 * 
 * Use this when authentication is optional
 * 
 * @example
 * ```tsx
 * export default async function ProfilePage() {
 *   const user = await getAuthenticatedUser();
 *   if (!user) {
 *     return <div>Please sign in</div>;
 *   }
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 * ```
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session?.user ? (session.user as AuthUser) : null;
}

/**
 * Redirect to sign-in page with callback URL
 * 
 * @param callbackUrl - URL to redirect to after successful sign-in
 */
export function redirectToSignIn(callbackUrl?: string): never {
  const signInUrl = callbackUrl
    ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/auth/signin";
  redirect(signInUrl);
}

/**
 * Redirect to dashboard (default authenticated landing page)
 */
export function redirectToDashboard(): never {
  redirect("/dashboard");
}

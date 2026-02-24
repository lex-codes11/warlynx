"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthUser } from "@/lib/auth";

/**
 * Client-side session hooks for React components
 * 
 * Validates: Requirements 1.4, 1.5
 */

/**
 * Get current session state
 * Returns session data, loading state, and authentication status
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, isLoading } = useSession();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!isAuthenticated) return <div>Please sign in</div>;
 *   
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 * ```
 */
export function useSession() {
  const { data: session, status } = useNextAuthSession();

  return {
    session,
    user: session?.user as AuthUser | undefined,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}

/**
 * Require authentication in client components
 * Redirects to sign-in page if not authenticated
 * 
 * @param redirectTo - Optional path to redirect to after sign-in
 * @returns Authenticated user or null while loading
 * 
 * @example
 * ```tsx
 * function ProtectedComponent() {
 *   const user = useRequireAuth();
 *   
 *   if (!user) return <div>Loading...</div>;
 *   
 *   return <div>Welcome, {user.displayName}!</div>;
 * }
 * ```
 */
export function useRequireAuth(redirectTo?: string): AuthUser | null {
  const { user, isLoading, isUnauthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isUnauthenticated) {
      const signInUrl = redirectTo
        ? `/auth/signin?callbackUrl=${encodeURIComponent(redirectTo)}`
        : "/auth/signin";
      router.push(signInUrl);
    }
  }, [isLoading, isUnauthenticated, redirectTo, router]);

  return user || null;
}

/**
 * Redirect to sign-in if not authenticated
 * Use this hook in components that require authentication
 * 
 * @param callbackUrl - URL to redirect to after successful sign-in
 * 
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   useProtectedRoute('/dashboard');
 *   const { user } = useSession();
 *   
 *   return <div>Welcome, {user?.displayName}!</div>;
 * }
 * ```
 */
export function useProtectedRoute(callbackUrl?: string) {
  const { isLoading, isUnauthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isUnauthenticated) {
      const signInUrl = callbackUrl
        ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/auth/signin";
      router.push(signInUrl);
    }
  }, [isLoading, isUnauthenticated, callbackUrl, router]);
}

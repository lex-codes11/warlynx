"use client";

import { useSession } from "next-auth/react";

/**
 * Client-side hook to access authentication state
 * Returns the session, loading state, and authenticated user
 */
export function useAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}

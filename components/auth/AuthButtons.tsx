"use client";

import { signIn, signOut } from "next-auth/react";
import { Session } from "next-auth";

interface AuthButtonsProps {
  session: Session | null;
}

export function AuthButtons({ session }: AuthButtonsProps) {
  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Login
      </button>
    );
  }

  return (
    <button
      onClick={() => signOut()}
      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
    >
      Logout
    </button>
  );
}

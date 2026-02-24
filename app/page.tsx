import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">Warlynx</h1>
        <p className="text-2xl text-gray-600 mb-8">
          Multiplayer AI-Powered Narrative Game
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl">
          Create fusion characters, battle with friends, and experience
          AI-driven storytelling in this turn-based multiplayer adventure.
        </p>

        <div className="flex gap-4 justify-center">
          {session ? (
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signup"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/auth/signin"
                className="px-8 py-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-lg shadow-md border border-gray-300 transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinGamePage({
  params,
}: {
  params: { inviteCode: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const joinGame = async () => {
      try {
        // First, find the game by invite code
        const findResponse = await fetch(
          `/api/games/find-by-code?code=${params.inviteCode}`
        );
        const findData = await findResponse.json();

        if (!findResponse.ok) {
          throw new Error(findData.error?.message || "Game not found");
        }

        const gameId = findData.game.id;

        // Then join the game
        const joinResponse = await fetch(`/api/games/${gameId}/join`, {
          method: "POST",
        });
        const joinData = await joinResponse.json();

        if (!joinResponse.ok) {
          throw new Error(joinData.error?.message || "Failed to join game");
        }

        // Redirect to lobby
        router.push(`/game/${gameId}/lobby`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join game");
        setLoading(false);
      }
    };

    joinGame();
  }, [params.inviteCode, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Joining Game...
              </h2>
              <p className="text-gray-600">
                Please wait while we add you to the game.
              </p>
            </>
          ) : error ? (
            <>
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Failed to Join
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Go to Dashboard
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

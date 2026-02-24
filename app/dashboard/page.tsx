import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = {
  title: "Dashboard - Warlynx",
  description: "Your Warlynx dashboard",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Fetch user's games
  const games = await prisma.game.findMany({
    where: {
      players: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      players: {
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
          character: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          players: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {session.user.displayName || session.user.email}!
            </h1>
            <Link
              href="/game/create"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Create New Game
            </Link>
          </div>

          {games.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">
                You haven&apos;t joined any games yet.
              </p>
              <Link
                href="/game/create"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Create Your First Game
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => {
                const userPlayer = game.players.find(
                  (p) => p.userId === session.user.id
                );
                const isHost = game.hostId === session.user.id;

                return (
                  <Link
                    key={game.id}
                    href={
                      game.status === "lobby"
                        ? `/game/${game.id}/lobby`
                        : `/game/${game.id}/room`
                    }
                    className="block bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-bold text-gray-900">
                        {game.name}
                      </h2>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          game.status === "lobby"
                            ? "bg-yellow-100 text-yellow-800"
                            : game.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>

                    {isHost && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                          Host
                        </span>
                      </div>
                    )}

                    <div className="text-sm text-gray-600 mb-3">
                      <p>
                        Players: {game._count.players}/{game.maxPlayers}
                      </p>
                      {game.inviteCode && (
                        <p className="font-mono">Code: {game.inviteCode}</p>
                      )}
                    </div>

                    {userPlayer?.character && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-700">
                          Your Character:
                        </p>
                        <p className="text-sm text-gray-900">
                          {userPlayer.character.name}
                        </p>
                      </div>
                    )}

                    {!userPlayer?.character && game.status === "lobby" && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-sm text-amber-600 font-medium">
                          ⚠️ Create your character
                        </p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

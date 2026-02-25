import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen bg-[#0B0B12] text-white relative">
      {/* Ambient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative z-10">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Image
                src="/warlynx-logo.png"
                alt="Warlynx Logo"
                width={60}
                height={40}
                className="rounded"
              />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Welcome, {session.user.displayName || session.user.email}!
              </h1>
            </div>
            <div className="flex gap-3">
              <Link
                href="/characters/library"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-all hover:shadow-lg hover:shadow-purple-500/50"
              >
                Character Library
              </Link>
              <Link
                href="/game/create"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
              >
                Create New Game
              </Link>
            </div>
          </div>

          {games.length === 0 ? (
            <div className="bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-8 text-center">
              <p className="text-gray-400 mb-4">
                You haven&apos;t joined any games yet.
              </p>
              <Link
                href="/game/create"
                className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-md transition-all hover:shadow-lg hover:shadow-cyan-500/50"
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
                    className="block bg-gray-900/40 backdrop-blur-md border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/20"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-bold text-gray-200">
                        {game.name}
                      </h2>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          game.status === "lobby"
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : game.status === "active"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                        }`}
                      >
                        {game.status}
                      </span>
                    </div>

                    {isHost && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                          Host
                        </span>
                      </div>
                    )}

                    <div className="text-sm text-gray-400 mb-3">
                      <p>
                        Players: {game._count.players}/{game.maxPlayers}
                      </p>
                      {game.inviteCode && (
                        <p className="font-mono text-cyan-400">Code: {game.inviteCode}</p>
                      )}
                    </div>

                    {userPlayer?.character && (
                      <div className="border-t border-gray-700 pt-3 mt-3">
                        <p className="text-sm font-medium text-gray-400">
                          Your Character:
                        </p>
                        <p className="text-sm text-cyan-400">
                          {userPlayer.character.name}
                        </p>
                      </div>
                    )}

                    {!userPlayer?.character && game.status === "lobby" && (
                      <div className="border-t border-gray-700 pt-3 mt-3">
                        <p className="text-sm text-amber-400 font-medium">
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

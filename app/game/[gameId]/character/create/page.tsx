import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CharacterCreateClient } from "./CharacterCreateClient";

export default async function CreateCharacterPage({
  params,
}: {
  params: { gameId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const game = await prisma.game.findUnique({
    where: { id: params.gameId },
    include: {
      players: {
        where: {
          userId: session.user.id,
        },
        include: {
          character: true,
        },
      },
    },
  });

  if (!game) {
    notFound();
  }

  const userPlayer = game.players[0];

  if (!userPlayer) {
    redirect("/dashboard");
  }

  // If character already exists, redirect to lobby
  if (userPlayer.character) {
    redirect(`/game/${params.gameId}/lobby`);
  }

  return (
    <div className="min-h-screen bg-[#0B0B12] text-white py-12 relative">
      {/* Ambient background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <CharacterCreateClient gameId={game.id} />
      </div>
    </div>
  );
}

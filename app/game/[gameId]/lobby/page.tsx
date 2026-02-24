import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import LobbyClient from "./LobbyClient";

export default async function LobbyPage({
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
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          character: true,
        },
      },
    },
  });

  if (!game) {
    notFound();
  }

  // Check if user is a player
  const isPlayer = game.players.some((p) => p.userId === session.user.id);
  if (!isPlayer) {
    redirect(`/dashboard`);
  }

  // If game has started, redirect to game room
  if (game.status === "active") {
    redirect(`/game/${params.gameId}/room`);
  }

  const isHost = game.hostId === session.user.id;
  const userPlayer = game.players.find((p) => p.userId === session.user.id);

  return (
    <LobbyClient
      game={game}
      isHost={isHost}
      userId={session.user.id}
      hasCharacter={!!userPlayer?.character}
    />
  );
}

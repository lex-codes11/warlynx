import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GameRoomClient from "./GameRoomClient";

export default async function GameRoomPage({
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
          character: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              powerSheet: true,
            },
          },
        },
      },
      events: {
        orderBy: {
          createdAt: "asc",
        },
        take: 50,
        include: {
          character: {
            select: {
              name: true,
            },
          },
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

  // If game is still in lobby, redirect there
  if (game.status === "lobby") {
    redirect(`/game/${params.gameId}/lobby`);
  }

  const userPlayer = game.players.find((p: any) => p.userId === session.user.id);

  return (
    <GameRoomClient
      game={game}
      userId={session.user.id}
      userCharacterId={userPlayer?.character?.id}
    />
  );
}

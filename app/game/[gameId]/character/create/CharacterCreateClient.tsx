"use client";

import { CharacterBuilder } from "@/components/character/CharacterBuilder";
import { useRouter } from "next/navigation";

export function CharacterCreateClient({ gameId }: { gameId: string }) {
  const router = useRouter();

  return (
    <CharacterBuilder
      gameId={gameId}
      onCharacterCreated={() => {
        router.push(`/game/${gameId}/lobby`);
      }}
    />
  );
}

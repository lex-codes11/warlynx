import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { CharacterLibraryClient } from "./CharacterLibraryClient";

export default async function CharacterLibraryPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  return <CharacterLibraryClient />;
}

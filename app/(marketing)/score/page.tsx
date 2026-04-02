import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/Navbar";
import { ScoreClient } from "./ScoreClient";

export default async function ScorePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} currentPage="score" />
      <ScoreClient />
    </>
  );
}

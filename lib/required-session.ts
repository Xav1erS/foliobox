import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const getCachedSession = cache(async () => auth());

export async function getRequiredSession(nextPath: string) {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return session;
}

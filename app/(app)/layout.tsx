import { AppShell } from "@/components/shells/AppShell";
import { getCachedSession } from "@/lib/required-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  return <AppShell userEmail={session?.user?.email}>{children}</AppShell>;
}

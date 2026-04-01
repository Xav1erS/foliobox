import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { MobileBanner } from "@/components/app/MobileBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar userEmail={session.user.email} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile banner — only visible on small screens */}
        <MobileBanner />

        {/* Mobile top bar — only visible on small screens */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-neutral-900">集盒 FolioBox</span>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

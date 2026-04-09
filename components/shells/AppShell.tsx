"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { MobileBanner } from "@/components/app/MobileBanner";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const isEditorRoute = /^\/(?:projects|portfolios)\/[^/]+\/editor$/.test(pathname);

  if (isEditorRoute) {
    return (
      <div className="h-screen overflow-hidden bg-[#101114] text-white">
        <main className="h-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell-grid" />
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar userEmail={userEmail} />
      </div>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <MobileBanner />

        <div className="app-shell-mobile-bar flex items-center justify-between px-4 py-3 md:hidden">
          <span className="text-sm font-semibold tracking-tight">集盒FolioBox</span>
        </div>

        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { MobileBanner } from "@/components/app/MobileBanner";
import { BrandLockup } from "@/components/brand/BrandLogo";

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
    <div className="dark app-shell">
      <div className="app-shell-grid" />
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar userEmail={userEmail} />
      </div>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <MobileBanner />

        <div className="app-shell-mobile-bar flex items-center justify-between px-4 py-3 md:hidden">
          <BrandLockup
            titleClassName="text-sm tracking-tight text-white/86"
            markClassName="h-8 w-8 rounded-[10px]"
          />
        </div>

        <main className="app-shell-main">{children}</main>
      </div>
    </div>
  );
}

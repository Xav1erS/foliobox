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
    <div className="relative flex h-screen overflow-hidden bg-neutral-100 text-neutral-900">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,10,10,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(10,10,10,0.055) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar userEmail={userEmail} />
      </div>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <MobileBanner />

        <div className="flex items-center justify-between border-b border-neutral-300 bg-neutral-100/95 px-4 py-3 backdrop-blur md:hidden">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">集盒FolioBox</span>
        </div>

        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

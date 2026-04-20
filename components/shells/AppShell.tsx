"use client";

import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import { AccountDialog, type AccountDialogData } from "@/components/app/AccountDialog";
import { AppSidebar } from "@/components/app/AppSidebar";
import { MobileBanner } from "@/components/app/MobileBanner";
import { BrandLockup } from "@/components/brand/BrandLogo";

export function AppShell({
  children,
  userEmail,
  accountDialogData,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  accountDialogData?: AccountDialogData | null;
}) {
  const pathname = usePathname();
  const isEditorRoute = /^\/(?:projects|portfolios)\/[^/]+\/editor$/.test(pathname);

  if (isEditorRoute) {
    return (
      <div className="editor-shell h-screen overflow-hidden bg-[#101114] text-white">
        <main className="h-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="dark app-shell">
      <div className="app-shell-grid" />
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar userEmail={userEmail} accountDialogData={accountDialogData} />
      </div>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <MobileBanner />

        <div className="app-shell-mobile-bar flex items-center justify-between px-4 py-3 md:hidden">
          <BrandLockup
            titleClassName="text-sm tracking-tight text-white/86"
            markClassName="h-8 w-8 rounded-[10px]"
          />
          {accountDialogData ? (
            <AccountDialog userEmail={userEmail} data={accountDialogData}>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/72 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="打开账号与权益"
              >
                <User className="h-4 w-4" />
              </button>
            </AccountDialog>
          ) : null}
        </div>

        <main className="app-shell-main">{children}</main>
      </div>
    </div>
  );
}

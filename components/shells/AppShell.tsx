import { AppSidebar } from "@/components/app/AppSidebar";
import { MobileBanner } from "@/components/app/MobileBanner";

export function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar userEmail={userEmail} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileBanner />

        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <span className="text-sm font-semibold text-neutral-900">集盒 FolioBox</span>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

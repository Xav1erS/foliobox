"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  User,
  PlusCircle,
  LogOut,
  Layers,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "@/components/app/CreateProjectDialog";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "工作台首页", icon: LayoutDashboard },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/portfolios", label: "作品集", icon: BookOpen },
  { href: "/profile", label: "个人资料", icon: User },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/style-references", label: "风格参考", icon: ImageIcon },
];

export function AppSidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar px-3 py-4">
      <div className="app-sidebar-noise" />
      {/* Brand */}
      <Link
        href="/dashboard"
        className="relative z-10 px-3 py-2 text-sm font-semibold tracking-tight app-text-primary"
      >
        集盒FolioBox
      </Link>

      {/* Brand / nav divider — -mx-3 cancels px-3 to span full sidebar width */}
      <div className="app-divider-strong relative z-10 -mx-3 mb-3 mt-3 border-t-2" />

      {/* Quick create */}
      <div className="relative z-10 mb-3 flex gap-1.5">
        <CreateProjectDialog>
          <button
            type="button"
            className="app-action-primary flex flex-1 items-center justify-center gap-1.5 border border-neutral-900 bg-neutral-900 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
            新建项目
          </button>
        </CreateProjectDialog>
        <Link
          href="/portfolios/new"
          className="app-action-secondary flex flex-1 items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium"
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          新建作品集
        </Link>
      </div>

      {/* Quick create / nav divider */}
      <div className="app-divider-soft relative z-10 mb-3 border-t" />

      {/* Nav */}
      <nav className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-col gap-0.5">
          {PRIMARY_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "app-nav-item relative flex items-center gap-2.5 px-3 py-2 text-sm",
                  active
                    ? "app-nav-item-active font-medium"
                    : ""
                )}
              >
                {active && (
                  <span className="absolute left-0 top-0 h-full w-[2px] bg-brand-red" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Secondary nav */}
        <div className="app-divider-soft mt-auto border-t pt-4 pb-3">
          <div className="flex flex-col gap-0.5">
            {SECONDARY_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "app-nav-item relative flex items-center gap-2.5 px-3 py-2 text-sm",
                    active
                      ? "app-nav-item-active font-medium"
                      : "app-text-muted"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-0 h-full w-[2px] bg-brand-red" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User + logout — -mx-3 px-3 extends border to full sidebar width, keeps content padded */}
      <div className="app-divider-strong relative z-10 mt-auto -mx-3 border-t-2 px-3 pt-3">
        {userEmail && (
          <p className="app-text-muted mb-2 truncate px-3 text-xs">
            {userEmail}
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="app-nav-item flex w-full items-center gap-2.5 px-3 py-2 text-sm"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          退出登录
        </button>
      </div>
    </aside>
  );
}

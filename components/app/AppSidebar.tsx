"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  User,
  BarChart3,
  PlusCircle,
  LogOut,
  Layers,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "@/components/app/CreateProjectDialog";
import { BrandLockup } from "@/components/brand/BrandLogo";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "工作台首页", icon: LayoutDashboard },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/portfolios", label: "作品集", icon: BookOpen },
  { href: "/profile", label: "个人资料", icon: User },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/style-references", label: "风格参考", icon: ImageIcon },
  { href: "/score", label: "作品集评分", icon: BarChart3 },
];

export function AppSidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar px-4 py-5">
      <div className="app-sidebar-noise" />
      <div className="relative z-10 px-2">
        <Link
          href="/dashboard"
          className="transition-opacity hover:opacity-80"
        >
          <BrandLockup
            subtitle="Workspace"
            titleClassName="app-text-primary"
            subtitleClassName="app-text-muted"
            markClassName="h-10 w-10"
          />
        </Link>
      </div>

      <div className="app-divider-soft relative z-10 mb-4 mt-4 border-t" />

      <div className="relative z-10 mb-4 space-y-2">
        <CreateProjectDialog>
          <button
            type="button"
            className="app-action-primary flex w-full items-center justify-center gap-2 border border-white/12 bg-white px-3 py-3 text-sm font-medium text-[#101114] transition-colors hover:bg-neutral-100"
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
            新建项目
          </button>
        </CreateProjectDialog>
        <Link
          href="/portfolios/new"
          className="app-action-secondary flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-medium"
        >
          <Layers className="h-3.5 w-3.5 shrink-0" />
          新建作品集
        </Link>
      </div>

      <div className="app-divider-soft relative z-10 mb-4 border-t" />

      <nav className="relative z-10 flex flex-1 flex-col">
        <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.24em] app-text-muted">
          主要入口
        </p>
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "app-nav-item relative flex items-center gap-3 px-3 py-3 text-sm",
                  active
                    ? "app-nav-item-active font-medium"
                    : ""
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-border bg-accent text-white"
                      : "border-border bg-secondary text-white/54"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span>{label}</span>
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> : null}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="app-divider-soft mt-auto border-t pt-4 pb-3">
          <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.24em] app-text-muted">
            资源
          </p>
          <div className="flex flex-col gap-0.5">
            {SECONDARY_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "app-nav-item relative flex items-center gap-3 px-3 py-3 text-sm",
                    active
                      ? "app-nav-item-active font-medium"
                      : "app-text-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                      active
                        ? "border-border bg-accent text-white"
                        : "border-border bg-secondary text-white/50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span>{label}</span>
                    {active ? <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="app-divider-soft relative z-10 mt-auto border-t pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-[18px] border border-border bg-card px-3 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-white/60">
            <User className="h-4 w-4 shrink-0" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium app-text-primary">当前账号</p>
            {userEmail ? (
              <p className="mt-0.5 truncate text-xs app-text-muted">{userEmail}</p>
            ) : (
              <p className="mt-0.5 text-xs app-text-muted">已登录工作台</p>
            )}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="app-nav-item flex w-full items-center gap-3 px-3 py-3 text-sm"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-white/50">
            <LogOut className="h-4 w-4 shrink-0" />
          </span>
          退出登录
        </button>
      </div>
    </aside>
  );
}

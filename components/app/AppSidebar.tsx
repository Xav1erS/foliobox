"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FolderOpen,
  BookOpen,
  User,
  Star,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "工作台首页", icon: LayoutDashboard },
  { href: "/projects", label: "项目", icon: FolderOpen },
  { href: "/portfolios", label: "作品集", icon: BookOpen },
  { href: "/profile", label: "设计师档案", icon: User },
];

const TOOL_NAV_ITEMS = [
  { href: "/score", label: "作品集评分", icon: Star },
];

export function AppSidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="relative flex h-full w-60 shrink-0 flex-col border-r border-neutral-300 bg-neutral-100/95 px-3 py-4 backdrop-blur">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(10,10,10,0.08) 0.8px, transparent 0.8px)",
          backgroundSize: "14px 14px",
          maskImage: "linear-gradient(180deg, black 0%, transparent 85%)",
          WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 85%)",
        }}
      />
      {/* Brand */}
      <Link
        href="/dashboard"
        className="relative z-10 mb-6 px-3 text-sm font-semibold tracking-tight text-neutral-900"
      >
        集盒FolioBox
      </Link>

      {/* Quick create */}
      <div className="relative z-10 mb-4 flex gap-1.5">
        <Link
          href="/projects/new"
          className="flex flex-1 items-center justify-center gap-1.5 border border-neutral-900 bg-neutral-900 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
        >
          <PlusCircle className="h-3.5 w-3.5 shrink-0" />
          新建项目
        </Link>
        <Link
          href="/portfolios/new"
          className="flex flex-1 items-center justify-center gap-1.5 border border-neutral-300 px-2.5 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-white hover:text-neutral-900"
        >
          <PlusCircle className="h-3.5 w-3.5 shrink-0" />
          新建作品集
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-col gap-0.5">
          {PRIMARY_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 border border-transparent px-3 py-2 text-sm transition-colors",
                pathname === href || pathname.startsWith(href + "/")
                  ? "border-neutral-300 bg-white/70 font-medium text-neutral-900"
                  : "text-neutral-500 hover:border-neutral-200 hover:bg-white/50 hover:text-neutral-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-5 border-t border-neutral-300 pt-4">
          <p className="px-3 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
            工具
          </p>
          <div className="mt-2 flex flex-col gap-0.5">
            {TOOL_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 border border-transparent px-3 py-2 text-sm text-neutral-500 transition-colors hover:border-neutral-200 hover:bg-white/50 hover:text-neutral-900"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* User + logout */}
      <div className="relative z-10 mt-auto border-t border-neutral-300 pt-3">
        {userEmail && (
          <p className="mb-2 truncate px-3 text-xs text-neutral-400">
            {userEmail}
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2.5 border border-transparent px-3 py-2 text-sm text-neutral-500 transition-colors hover:border-neutral-200 hover:bg-white/50 hover:text-neutral-900"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          退出登录
        </button>
      </div>
    </aside>
  );
}

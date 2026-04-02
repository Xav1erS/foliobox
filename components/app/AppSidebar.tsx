"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Star,
  User,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "工作台首页", icon: LayoutDashboard },
  { href: "/score", label: "作品集评分", icon: Star },
  { href: "/profile", label: "设计师档案", icon: User },
];

export function AppSidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-neutral-200 bg-white px-3 py-4">
      {/* Brand */}
      <Link
        href="/dashboard"
        className="mb-6 px-3 text-sm font-semibold text-neutral-900"
      >
        集盒 FolioBox
      </Link>

      {/* New project CTA */}
      <Link
        href="/projects/new"
        className="mb-4 flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
      >
        <PlusCircle className="h-4 w-4" />
        新建项目
      </Link>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="mt-auto border-t border-neutral-100 pt-3">
        {userEmail && (
          <p className="mb-2 truncate px-3 text-xs text-neutral-400">
            {userEmail}
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          退出登录
        </button>
      </div>
    </aside>
  );
}

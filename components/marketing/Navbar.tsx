"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Menu } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getNavbarPrimaryAction,
  getNavbarSecondaryAction,
} from "@/lib/marketing-cta";

type NavbarPage = "home" | "pricing" | "score" | "editorial" | "vision" | "legal";

export function Navbar({
  isLoggedIn = false,
  currentPage = "home",
}: {
  isLoggedIn?: boolean;
  currentPage?: NavbarPage;
}) {
  const primaryItems = useMemo(
    () => [
      {
        key: "home",
        label: "首页",
        href: "/",
      },
      {
        key: "pricing",
        label: "价格方案",
        href: "/pricing",
      },
      {
        key: "editorial",
        label: "开发者说",
        href: "/editorial/developers-note",
      },
      {
        key: "vision",
        label: "长期方向",
        href: "/vision",
      },
    ],
    []
  );

  const primaryCta = getNavbarPrimaryAction(isLoggedIn);
  const secondaryCta = getNavbarSecondaryAction(isLoggedIn);
  const activePrimaryKey = (() => {
    switch (currentPage) {
      case "home":
        return "home";
      case "pricing":
        return "pricing";
      case "editorial":
        return "editorial";
      case "vision":
        return "vision";
      case "score":
      case "legal":
        return null;
      default:
        return null;
    }
  })();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:h-14 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="whitespace-nowrap text-[18px] font-semibold leading-none tracking-tight text-white sm:text-sm"
        >
          集盒FolioBox
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {primaryItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`text-sm transition-colors ${
                activePrimaryKey === item.key
                  ? "text-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          {!isLoggedIn && (
            <Link
              href={secondaryCta.href}
              className="hidden px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white lg:block"
            >
              {secondaryCta.label}
            </Link>
          )}
          <Link
            href={primaryCta.href}
            className="flex h-12 min-w-[124px] items-center justify-center bg-white px-5 text-base font-semibold text-black transition-colors hover:bg-white/90 sm:h-auto sm:min-w-0 sm:px-4 sm:py-1.5 sm:text-sm"
          >
            <span className="sm:hidden">{isLoggedIn ? "进入工作台" : "开始评分"}</span>
            <span className="hidden sm:inline">{primaryCta.label} →</span>
          </Link>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-xl border border-white/10 bg-white/4 text-white hover:bg-white/10 hover:text-white md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="top-0 left-auto right-0 h-screen max-w-[320px] translate-x-0 translate-y-0 rounded-l-3xl border-white/10 bg-neutral-950 p-0 text-white data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
              <DialogHeader className="border-b border-white/10 px-5 py-4 text-left">
                <DialogTitle className="text-sm font-semibold tracking-tight text-white">
                  集盒FolioBox
                </DialogTitle>
              </DialogHeader>

              <div className="flex h-full flex-col px-5 py-5">
                <div className="space-y-2">
                  {primaryItems.map((item) => (
                    <DialogClose asChild key={item.key}>
                      <Link
                        href={item.href}
                        className={`block px-3 py-3 text-sm transition-colors ${
                          activePrimaryKey === item.key
                            ? "bg-white/10 text-white"
                            : "text-white/65 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </DialogClose>
                  ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                  <DialogClose asChild>
                    <Link
                      href={primaryCta.href}
                      className="flex h-11 items-center justify-center bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-white/90"
                    >
                      {primaryCta.label}
                    </Link>
                  </DialogClose>
                  {!isLoggedIn && (
                    <DialogClose asChild>
                      <Link
                        href={secondaryCta.href}
                        className="flex h-11 items-center justify-center border border-white/15 px-4 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
                      >
                        {secondaryCta.label}
                      </Link>
                    </DialogClose>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

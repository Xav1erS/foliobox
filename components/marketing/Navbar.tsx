import Link from "next/link";

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          集盒 FolioBox
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="#cases" className="text-sm text-white/50 hover:text-white transition-colors">
            案例展示
          </Link>
          <Link href="#how" className="text-sm text-white/50 hover:text-white transition-colors">
            使用流程
          </Link>
          <Link href="#score" className="text-sm text-white/50 hover:text-white transition-colors">
            评分诊断
          </Link>
          <Link href="#faq" className="text-sm text-white/50 hover:text-white transition-colors">
            FAQ
          </Link>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-1.5 text-sm text-white/60 hover:text-white transition-colors sm:block"
          >
            登录
          </Link>
          <Link
            href="/score"
            className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
          >
            开始评分 →
          </Link>
        </div>
      </div>
    </header>
  );
}

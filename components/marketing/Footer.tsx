import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-6 py-10">
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-white">集盒 FolioBox</p>
            <p className="mt-0.5 text-xs text-white/25">
              把零散项目整理成拿得出手的作品集
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/25">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">服务条款</Link>
            <span>© {new Date().getFullYear()} 集盒FolioBox</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

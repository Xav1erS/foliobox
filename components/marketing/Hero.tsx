import Link from "next/link";
import {
  getHeroPrimaryAction,
  getHeroSecondaryAction,
} from "@/lib/marketing-cta";

export function Hero({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const primaryAction = isLoggedIn
    ? getHeroPrimaryAction(isLoggedIn)
    : { href: "/score", label: "先看看现在能不能投" };
  const secondaryAction = isLoggedIn
    ? getHeroSecondaryAction(isLoggedIn)
    : { href: "/login?next=/projects/new", label: "开始整理第一版" };

  return (
    <section className="relative overflow-hidden pt-14">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Radial fade over grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)]" />
      {/* Dot matrix accent */}
      <div
        className="pointer-events-none absolute bottom-24 right-4 h-28 w-36 opacity-55 sm:bottom-32 sm:right-10 sm:h-40 sm:w-52"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
          maskImage: "linear-gradient(135deg, transparent 0%, black 18%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(135deg, transparent 0%, black 18%, black 100%)",
        }}
      />

      {/* Above-fold content */}
      <div className="relative flex min-h-[calc(100vh-56px)] flex-col items-center justify-start px-5 pb-10 pt-16 text-center sm:px-6 sm:pt-20 md:justify-center md:pt-0">
        {/* Badge */}
        <div className="mb-6 inline-flex max-w-full items-center gap-2 border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11px] text-white/70 sm:mb-8 sm:px-4 sm:text-xs">
          <span className="h-1.5 w-1.5 bg-emerald-400" />
          <span className="whitespace-nowrap">集盒FolioBox · 从作品集整理开始</span>
        </div>

        {/* Heading */}
        <h1 className="mx-auto max-w-[340px] font-bold text-white sm:max-w-[760px] sm:text-6xl sm:leading-[1.02] sm:tracking-tight lg:max-w-[980px] lg:text-[72px] lg:leading-[1.06]">
          <span className="text-[34px] leading-[0.98] tracking-[-0.05em] sm:hidden">
            <span className="block whitespace-nowrap">把零散项目整理成</span>
            <span className="mt-1.5 block whitespace-nowrap text-white/38">拿得出手的</span>
            <span className="mt-1.5 block whitespace-nowrap">UI/UX 作品集</span>
          </span>
          <span className="hidden sm:block">
            <span className="block">把零散项目整理成</span>
            <span className="block">
              <span className="text-white/38">拿得出手的</span> UI/UX 作品集
            </span>
          </span>
        </h1>

        <p
          className="mx-auto mt-6 max-w-[340px] text-base leading-8 text-white/60 sm:max-w-[640px] sm:text-lg sm:leading-relaxed"
        >
          如果你手上已经有项目和经历，只是还没整理成一版能投的作品集，
          我可以先帮你把结构搭起来。
          <br />
          不是替你把一切一次写完，而是先把最难开始的那一段理顺。
        </p>

        {/* Trust clarification */}
        <p className="mx-auto mt-3 max-w-[340px] text-sm leading-7 text-white/40 sm:max-w-[560px] sm:leading-normal">
          可以先看清现在能不能投，也可以直接开始整理。后面再慢慢把项目表达、简历线索和求职叙事接起来。
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row">
          <Link
            href={primaryAction.href}
            className="flex h-12 min-w-[220px] items-center justify-center bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90 sm:min-w-[200px]"
          >
            {primaryAction.label}
          </Link>
          <Link
            href={secondaryAction.href}
            className="flex h-12 min-w-[220px] items-center justify-center border border-white/15 px-8 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white sm:min-w-[200px]"
          >
            {secondaryAction.label}
          </Link>
        </div>

        {/* Trust line */}
        <div className="mt-9 flex max-w-[340px] flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/30 sm:mt-10 sm:max-w-none sm:flex-nowrap">
          <span>先判断从哪一步开始</span>
          <span className="h-px w-4 bg-white/15" />
          <span>支持 Figma / 图片导入</span>
          <span className="h-px w-4 bg-white/15" />
          <span>生成第一版后还能继续修改</span>
        </div>
      </div>

      {/* Product preview mock — below fold */}
      <div className="relative flex justify-center px-4 pb-32 sm:px-6">
        <div
          className="relative w-full"
          style={{ maxWidth: 960, perspective: "1000px" }}
        >
          {/* Main mock: portfolio preview */}
          <div
            className="relative overflow-hidden border border-white/10 bg-neutral-950"
            style={{
              transform: "rotateX(5deg)",
              transformOrigin: "top center",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 bg-white/10" />
                <div className="h-3 w-3 bg-white/10" />
                <div className="h-3 w-3 bg-white/10" />
              </div>
              <div className="bg-white/[0.05] px-4 py-1 text-center text-[11px] text-white/20" style={{ width: 260 }}>
                foliobox.art/portfolio/preview
              </div>
            </div>

            {/* Portfolio content */}
            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]" style={{ minHeight: 400 }}>
              {/* Left sidebar: project list */}
              <div className="border-b border-white/[0.06] bg-white/[0.015] p-5 sm:border-b-0 sm:border-r">
                <p className="mb-4 text-[10px] uppercase tracking-widest text-white/25">我的项目</p>
                <div className="space-y-1">
                  {[
                    { label: "企业数据中台改版", active: true },
                    { label: "消费金融 App 账单体验" },
                    { label: "政务服务无障碍升级" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2.5 px-3 py-2.5 ${
                        item.active
                          ? "bg-white/[0.08] border border-white/10"
                          : "border border-transparent"
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 shrink-0 ${item.active ? "bg-emerald-400" : "bg-white/20"}`} />
                      <span className={`text-xs leading-snug ${item.active ? "text-white/80" : "text-white/35"}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-white/[0.06] pt-5">
                  <p className="mb-3 text-[10px] uppercase tracking-widest text-white/20">导出</p>
                  <div className="space-y-2">
                    <div className="flex h-7 items-center justify-center border border-white/10 bg-white/[0.08] text-[11px] text-white/50">
                      分享链接
                    </div>
                    <div className="flex h-7 items-center justify-center border border-white/[0.06] text-[11px] text-white/30">
                      导出 PDF
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: portfolio page content */}
              <div className="p-6 sm:p-8">
                {/* Project header */}
                <div className="mb-6 border-b border-white/[0.06] pb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400">
                      B 端 · 数据可视化
                    </span>
                    <span className="border border-white/[0.08] px-2.5 py-0.5 text-[11px] text-white/35">
                      UX 设计师
                    </span>
                  </div>
                  <div className="mb-2 h-6 w-3/5 bg-white/15" />
                  <div className="h-2 w-2/5 bg-white/[0.08]" />
                </div>

                {/* Content sections */}
                <div className="space-y-6">
                  {[
                    { section: "项目背景", lines: [90, 75, 85, 60] },
                    { section: "设计过程", lines: [85, 70, 90, 55, 78] },
                    { section: "最终结果", lines: [80, 65, 72] },
                  ].map((block) => (
                    <div key={block.section}>
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-3 w-1 bg-white/30" />
                        <span className="text-xs font-medium text-white/50">{block.section}</span>
                      </div>
                      <div className="space-y-2">
                        {block.lines.map((w, i) => (
                          <div
                            key={i}
                            className="h-1.5 bg-white/[0.08]"
                            style={{ width: `${w}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
          </div>

          {/* Score overlay card — bottom right */}
          <div
            className="absolute bottom-6 right-4 sm:right-8 overflow-hidden border border-white/10 bg-neutral-950/95 backdrop-blur-sm"
            style={{
              width: 200,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
              transform: "rotateX(5deg)",
              transformOrigin: "top center",
            }}
          >
            <div className="p-4">
              <p className="mb-2 text-[10px] text-white/30">评分报告</p>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold tabular-nums text-white">72</span>
                <span className="mb-1 text-xs text-white/30">/ 100</span>
              </div>
              <div className="mb-3 inline-flex items-center gap-1.5 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">
                <span className="h-1 w-1 bg-amber-400" />
                具备投递价值，但建议局部优化
              </div>
              <div className="space-y-2">
                {[
                  { label: "角色清晰度", score: 52 },
                  { label: "结果表达", score: 48 },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="mb-1 flex justify-between">
                      <span className="text-[10px] text-white/35">{d.label}</span>
                      <span className="font-mono text-[10px] text-white/25">{d.score}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden bg-white/[0.08]">
                      <div
                        className="h-full bg-red-500/50"
                        style={{ width: `${d.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Glow under mock */}
          <div className="pointer-events-none absolute -bottom-12 left-1/2 h-28 w-3/4 -translate-x-1/2 bg-white/[0.04] blur-3xl" />
        </div>
      </div>
    </section>
  );
}

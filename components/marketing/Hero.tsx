import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-14">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
      {/* Radial fade over grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)]" />

      {/* Above-fold content */}
      <div className="relative flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-6 pb-10 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          面向国内设计师 · 作品集整理与评分
        </div>

        {/* Heading — 860px cap */}
        <h1
          className="mx-auto text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-[72px]"
          style={{ maxWidth: 860 }}
        >
          把零散项目整理成
          <br />
          <span className="text-white/40">拿得出手的</span>作品集
        </h1>

        <p
          className="mx-auto mt-6 text-lg leading-relaxed text-white/50"
          style={{ maxWidth: 520 }}
        >
          导入设计稿和个人简历，补充项目关键信息，把零散项目快速整理成作品集初稿。
          <br />
          20 分钟内完成第一版，不靠模板堆砌，也不做廉价感包装。
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login?next=/score"
            className="flex h-12 min-w-[200px] items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            先给我的作品集打分
          </Link>
          <Link
            href="/login"
            className="flex h-12 min-w-[200px] items-center justify-center rounded-xl border border-white/15 px-8 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            直接开始整理作品集
          </Link>
        </div>

        {/* Trust line */}
        <div className="mt-10 flex items-center gap-4 text-xs text-white/25">
          <span>支持 Figma 导入</span>
          <span className="h-px w-4 bg-white/15" />
          <span>支持图片上传</span>
          <span className="h-px w-4 bg-white/15" />
          <span>专为国内大厂投递设计</span>
        </div>
      </div>

      {/* Product preview mock — below fold */}
      <div className="relative flex justify-center px-4 pb-32 sm:px-6">
        <div
          className="relative w-full overflow-hidden"
          style={{ maxWidth: 920, perspective: "1000px" }}
        >
          <div
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950"
            style={{
              transform: "rotateX(5deg)",
              transformOrigin: "top center",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
                <div className="h-3 w-3 rounded-full bg-white/10" />
              </div>
              <div className="rounded bg-white/[0.05] px-4 py-1 text-center text-[11px] text-white/20" style={{ width: 240 }}>
                foliobox.design/score/result
              </div>
            </div>

            {/* Score result page */}
            <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr]">
              {/* Left: score overview */}
              <div className="border-b border-white/[0.06] p-6 sm:border-b-0 sm:border-r sm:p-8">
                <p className="mb-6 text-xs text-white/25">评分报告</p>
                <div className="mb-1 text-6xl font-bold tabular-nums text-white">72</div>
                <div className="mb-5 text-xs text-white/30">/ 100 分</div>
                <div className="mb-8 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  建议改进后投递
                </div>
                <div>
                  <p className="mb-3 text-xs text-white/25">主要问题</p>
                  <div className="space-y-2">
                    {["角色表达不够清晰", "缺少量化结果数据", "项目选择需要精简"].map((p) => (
                      <div key={p} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />
                        <span className="text-xs leading-relaxed text-white/40">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: dimensions */}
              <div className="p-6 sm:p-8">
                <p className="mb-6 text-xs text-white/25">维度评分</p>
                <div className="space-y-5">
                  {[
                    { label: "首屏专业感", score: 65 },
                    { label: "角色清晰度", score: 52 },
                    { label: "问题定义与设计判断", score: 78 },
                    { label: "结果与价值证明", score: 48 },
                    { label: "可扫描性", score: 72 },
                  ].map((d) => (
                    <div key={d.label}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-white/60">{d.label}</span>
                        <span className="font-mono text-xs text-white/35">{d.score}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                        <div
                          className={`h-full rounded-full ${
                            d.score >= 70
                              ? "bg-emerald-500/60"
                              : d.score >= 55
                              ? "bg-amber-500/60"
                              : "bg-red-500/50"
                          }`}
                          style={{ width: `${d.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations placeholder */}
                <div className="mt-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="mb-3 text-xs font-medium text-white/35">优先改进建议</p>
                  <div className="space-y-2">
                    <div className="h-2 w-4/5 rounded-full bg-white/[0.07]" />
                    <div className="h-2 w-3/5 rounded-full bg-white/[0.07]" />
                    <div className="h-2 w-4/5 rounded-full bg-white/[0.07]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          </div>

          {/* Glow under mock */}
          <div className="pointer-events-none absolute -bottom-12 left-1/2 h-28 w-3/4 -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />
        </div>
      </div>
    </section>
  );
}

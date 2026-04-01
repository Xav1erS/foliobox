import Link from "next/link";

const SCORE_DIMENSIONS = [
  { label: "首屏专业感", score: 65, weight: 15 },
  { label: "角色清晰度", score: 52, weight: 15 },
  { label: "问题定义与设计判断", score: 78, weight: 20 },
  { label: "结果与价值证明", score: 48, weight: 15 },
  { label: "可扫描性", score: 72, weight: 15 },
];

export function ScoreFeature() {
  return (
    <section id="score" className="px-6 py-28">
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <div className="grid gap-16 items-center lg:grid-cols-2 lg:gap-20">
          {/* Left */}
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-white/25">
              评分诊断能力
            </p>
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              先知道哪里
              <br />
              不行，再改
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/45">
              上传现有作品集，系统按 8 个维度出具评分报告。
              不只给分，还告诉你具体哪里不过线、优先修哪里。
            </p>
            <p className="mt-3 max-w-sm text-sm font-medium text-white/60">
              先看问题，再决定要不要重做。
            </p>

            {/* Score levels */}
            <div className="mt-8 flex flex-col gap-2">
              {[
                { range: "85–100 分", label: "可直接投递", color: "bg-emerald-500" },
                { range: "50–84 分", label: "建议局部修改", color: "bg-amber-500" },
                { range: "50 分以下", label: "暂不建议投递", color: "bg-red-500/60" },
              ].map((level) => (
                <div key={level.range} className="flex items-center gap-3">
                  <span className={`h-1.5 w-1.5 rounded-full ${level.color}`} />
                  <span className="font-mono text-xs text-white/40">{level.range}</span>
                  <span className="text-xs text-white/30">—</span>
                  <span className="text-xs text-white/50">{level.label}</span>
                </div>
              ))}
            </div>

            <Link
              href="/login?next=/score"
              className="mt-10 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              免费给作品集打分
            </Link>
          </div>

          {/* Right: score result mock */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            {/* Mock header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <div className="ml-3 text-[11px] text-white/20">评分结果示例</div>
            </div>

            {/* Score content */}
            <div className="p-6">
              {/* Top: score + level */}
              <div className="mb-6 flex items-end gap-4">
                <div>
                  <div className="text-5xl font-bold tabular-nums text-white">72</div>
                  <div className="mt-1 text-xs text-white/30">/ 100 分</div>
                </div>
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  建议改进后投递
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-4">
                {SCORE_DIMENSIONS.map((d) => (
                  <div key={d.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/65">{d.label}</span>
                        <span className="text-[10px] text-white/25">{d.weight} 分权重</span>
                      </div>
                      <span className="font-mono text-xs text-white/40">{d.score}</span>
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

              {/* Summary issues */}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-medium text-white/40">主要问题</p>
                <div className="space-y-2">
                  {["角色表达不够清晰", "缺少量化结果数据", "项目选择需要精简"].map((p) => (
                    <div key={p} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400/50" />
                      <span className="text-xs leading-relaxed text-white/40">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

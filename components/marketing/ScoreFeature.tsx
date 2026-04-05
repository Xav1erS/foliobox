import Link from "next/link";
import {
  PORTFOLIO_SCORE_LEVEL_CONFIG,
  PORTFOLIO_SCORE_LEVEL_ORDER,
} from "@/lib/portfolio-score-level";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

const SCORE_DIMENSIONS = [
  { label: "首屏专业感", score: 65, weight: 15 },
  { label: "角色清晰度", score: 52, weight: 15 },
  { label: "问题定义与设计判断", score: 78, weight: 20 },
  { label: "结果与价值证明", score: 48, weight: 15 },
  { label: "可扫描性", score: 72, weight: 15 },
];

export function ScoreFeature() {
  return (
    <section id="score" className="px-6 py-20">
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <div className="grid gap-10 items-center lg:grid-cols-2 lg:gap-14">
          {/* Left */}
          <div>
            <SectionEyebrow label="评分诊断能力" className="mb-3" />
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              <span className="block md:hidden">先知道现在卡在哪，</span>
              <span className="block md:hidden">再决定怎么整理</span>
              <span className="hidden md:block">先知道现在</span>
              <span className="hidden md:block">卡在哪，</span>
              <span className="hidden md:block">再决定怎么整理</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              上传现有作品集后，我会先用评分帮你看清楚：
              这份东西现在能不能投，最该优先补的是哪里。
            </p>
            <p className="mt-3 max-w-sm text-sm font-medium text-white/60">
              分数不是为了评判你，而是为了帮你少走弯路。
            </p>

            {/* Score levels */}
            <div className="mt-6 flex flex-col gap-2">
              {PORTFOLIO_SCORE_LEVEL_ORDER.map((levelKey) => {
                const level = PORTFOLIO_SCORE_LEVEL_CONFIG[levelKey];
                return (
                  <div key={level.rangeLabel} className="flex items-center gap-3">
                    <span className={`h-1.5 w-1.5 ${level.indicatorClassName}`} />
                    <span className="font-mono text-xs text-white/50">
                      {level.rangeLabel}
                    </span>
                    <span className="text-xs text-white/30">—</span>
                    <span className="text-xs text-white/50">{level.label}</span>
                  </div>
                );
              })}
            </div>

            <Link
              href="/score"
              className="mt-8 inline-flex h-11 items-center gap-2 bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              先看这份作品集现在能不能投
            </Link>
          </div>

          {/* Right: score result mock */}
          <div className="overflow-hidden border border-white/10 bg-neutral-950">
            {/* Mock header */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 bg-white/10" />
                <div className="h-2.5 w-2.5 bg-white/10" />
                <div className="h-2.5 w-2.5 bg-white/10" />
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
                <div
                  className={`mb-1 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium ${PORTFOLIO_SCORE_LEVEL_CONFIG.NEEDS_IMPROVEMENT.badgeClassName}`}
                >
                  <span
                    className={`h-1.5 w-1.5 ${PORTFOLIO_SCORE_LEVEL_CONFIG.NEEDS_IMPROVEMENT.indicatorClassName}`}
                  />
                  {PORTFOLIO_SCORE_LEVEL_CONFIG.NEEDS_IMPROVEMENT.label}
                </div>
              </div>

              {/* Dimensions */}
              <div className="space-y-4">
                {SCORE_DIMENSIONS.map((d) => (
                  <div key={d.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/65">{d.label}</span>
                        <span className="text-[10px] text-white/35">{d.weight} 分权重</span>
                      </div>
                      <span className="font-mono text-xs text-white/50">{d.score}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden bg-white/[0.08]">
                      <div
                        className={`h-full ${
                          d.score >= 85
                            ? "bg-emerald-500/60"
                            : d.score >= 70
                            ? "bg-emerald-400/60"
                            : d.score >= 50
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
              <div className="mt-6 border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-3 text-xs font-medium text-white/50">主要问题</p>
                <div className="space-y-2">
                  {["角色表达不够清晰", "缺少量化结果数据", "项目选择需要精简"].map((p) => (
                    <div key={p} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-red-400/50" />
                      <span className="text-xs leading-relaxed text-white/50">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-white/[0.07] pt-4">
                <div className="grid grid-cols-3 gap-3 text-[11px] leading-[1.7] text-white/35">
                  <div className="border border-white/[0.07] px-3 py-2">
                    01 上传现状
                  </div>
                  <div className="border border-white/[0.07] px-3 py-2">
                    02 看清问题
                  </div>
                  <div className="border border-white/[0.07] px-3 py-2">
                    03 再继续整理
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

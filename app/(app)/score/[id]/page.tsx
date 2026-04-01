import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ChevronLeft } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DimensionScore {
  score: number;
  comment: string;
}

interface DimensionScores {
  firstScreenProfessionalism: DimensionScore;
  scannability: DimensionScore;
  projectSelection: DimensionScore;
  roleClarity: DimensionScore;
  problemDefinition: DimensionScore;
  resultEvidence: DimensionScore;
  authenticity: DimensionScore;
  jobFit: DimensionScore;
}

const DIMENSION_LABELS: { key: keyof DimensionScores; label: string; weight: number }[] = [
  { key: "firstScreenProfessionalism", label: "首屏专业感", weight: 15 },
  { key: "scannability", label: "可扫描性", weight: 15 },
  { key: "roleClarity", label: "角色清晰度", weight: 15 },
  { key: "problemDefinition", label: "问题定义与设计判断", weight: 20 },
  { key: "resultEvidence", label: "结果与价值证明", weight: 15 },
  { key: "projectSelection", label: "项目选择质量", weight: 10 },
  { key: "authenticity", label: "真实性与可信度", weight: 5 },
  { key: "jobFit", label: "投递适配度", weight: 5 },
];

const LEVEL_CONFIG = {
  READY: {
    label: "可投递",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    desc: "这份作品集已具备直接投递的质量。",
  },
  NEEDS_IMPROVEMENT: {
    label: "建议优化",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    desc: "已具备投递价值，建议针对以下问题局部修改后再投递。",
  },
  NOT_READY: {
    label: "暂不建议投递",
    color: "bg-red-500/15 text-red-400 border-red-500/20",
    desc: "作品集还有较大提升空间，建议重制后再投递。",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScoreResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const score = await db.portfolioScore.findUnique({ where: { id } });

  if (!score) notFound();

  const dimensions = score.dimensionScores as unknown as DimensionScores;
  const level = LEVEL_CONFIG[score.level];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Back */}
      <Link
        href="/score"
        className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        重新评分
      </Link>

      {/* Score header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">综合得分</p>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-bold tabular-nums">{score.totalScore}</span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`mt-2 rounded-lg px-3 py-1.5 text-sm font-medium ${level.color}`}
        >
          {level.label}
        </Badge>
      </div>

      <p className="mb-8 text-sm text-muted-foreground">{level.desc}</p>

      {/* Dimension scores */}
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-semibold">8 维度评分</h2>
        <div className="flex flex-col gap-4">
          {DIMENSION_LABELS.map(({ key, label, weight }) => {
            const dim = dimensions[key];
            if (!dim) return null;
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/80">{label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(dim.score * weight / 100)}
                    <span className="text-muted-foreground/50">/{weight}</span>
                  </span>
                </div>
                <Progress value={dim.score} className="h-1.5" />
                {dim.comment && (
                  <p className="text-xs text-muted-foreground">{dim.comment}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary points */}
      {score.summaryPoints.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold">主要问题</h2>
          <ul className="flex flex-col gap-2">
            {score.summaryPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended actions */}
      {score.recommendedActions.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-sm font-semibold">改进建议</h2>
          <ul className="flex flex-col gap-2">
            {score.recommendedActions.map((action, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="shrink-0 font-mono text-xs text-emerald-500/80 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="rounded-2xl border border-border bg-muted/10 p-6 text-center">
        <h3 className="text-base font-semibold mb-2">用 FolioBox 重制这份作品集</h3>
        <p className="text-sm text-muted-foreground mb-5">
          导入设计稿，补充项目事实，10–20 分钟生成可投递初稿。
        </p>
        <Button asChild className="h-11 rounded-xl px-8">
          <Link href="/dashboard">
            开始重制
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

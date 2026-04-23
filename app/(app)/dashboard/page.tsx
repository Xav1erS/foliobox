import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  CreditCard,
  FolderOpen,
  Layers,
  PlusCircle,
  User,
} from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/app/PageHeader";
import { getRequiredSession } from "@/lib/required-session";
import type { ScoreCoverage } from "@/lib/score-contract";
import {
  PORTFOLIO_SCORE_LEVEL_CONFIG,
  resolvePortfolioScoreLevel,
  type PortfolioScoreLevel,
} from "@/lib/portfolio-score-level";
import {
  computeTotalScoreFromDimensions,
  normalizeDimensionScoresForComputation,
} from "@/lib/score-math";
import {
  getScoreNextStep,
  isProfileReadyForGeneration,
} from "@/lib/score-next-step";
import {
  PROJECT_STAGE_LABEL,
  PROJECT_STATUS_LABEL,
  formatProjectDate,
  getProjectContinuePath,
  getProjectStageSummary,
} from "@/lib/project-workflow";
import { getEntitlementSummary } from "@/lib/entitlement";
import {
  getPortfolioContinuePath,
  PORTFOLIO_STATUS_LABEL,
} from "@/lib/portfolio-workflow";
import { ProjectsCollection } from "@/components/app/ProjectsCollection";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { CreateProjectDialog } from "@/components/app/CreateProjectDialog";

const PLAN_COPY: Record<string, { title: string; description: string }> = {
  FREE: {
    title: "免费体验",
    description: "可继续整理项目、生成草稿。完整排版、发布与 PDF 导出需解锁后可用。",
  },
  PRO: {
    title: "标准版",
    description: "已解锁完整生成流程、正式 PDF 导出和在线链接发布。",
  },
  SPRINT: {
    title: "进阶版",
    description: "已解锁更高配额与更高频生成能力，适合求职冲刺期。",
  },
};

const LEVEL_COLOR: Record<PortfolioScoreLevel, { fg: string; bg: string }> = {
  READY: { fg: "text-emerald-200", bg: "bg-emerald-500/18" },
  NEEDS_IMPROVEMENT: { fg: "text-amber-200", bg: "bg-amber-500/18" },
  DRAFT: { fg: "text-orange-200", bg: "bg-orange-500/18" },
  NOT_READY: { fg: "text-red-200", bg: "bg-red-500/18" },
};

const DASHBOARD_QUOTA_LABELS = {
  activeProjects: "同时进行项目",
  projectLayouts: "项目排版",
  portfolioPackagings: "作品集包装",
  publishLinks: "发布链接",
} as const;

const DASHBOARD_QUOTA_ORDER = [
  "activeProjects",
  "projectLayouts",
  "portfolioPackagings",
  "publishLinks",
] as const;

const DASHBOARD_TWO_COLUMN_GRID =
  "grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]";

const DASHBOARD_QUICK_LINKS = [
  { icon: BookOpen, label: "新建作品集", href: "/portfolios/new" },
  { icon: FolderOpen, label: "查看全部项目", href: "/projects" },
  { icon: Layers, label: "查看全部作品集", href: "/portfolios" },
  { icon: User, label: "设计师档案", href: "/profile" },
] as const;

function getQuotaUsageRatio(
  key: (typeof DASHBOARD_QUOTA_ORDER)[number],
  quota: { used: number; remaining: number; limit: number }
) {
  if (quota.limit <= 0) return 0;
  if (key === "activeProjects") return quota.used / quota.limit;
  return (quota.limit - quota.remaining) / quota.limit;
}

function DashboardHeroArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 920 520" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="dashboard-hero-door-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(244,248,251,0.34)" />
            <stop offset="45%" stopColor="rgba(192,207,219,0.16)" />
            <stop offset="100%" stopColor="rgba(192,207,219,0)" />
          </radialGradient>
          <radialGradient id="dashboard-hero-ground-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(206,219,229,0.18)" />
            <stop offset="100%" stopColor="rgba(206,219,229,0)" />
          </radialGradient>
          <linearGradient id="dashboard-hero-line" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(225,234,241,0)" />
            <stop offset="50%" stopColor="rgba(225,234,241,0.34)" />
            <stop offset="100%" stopColor="rgba(225,234,241,0.05)" />
          </linearGradient>
          <linearGradient id="dashboard-hero-top-wash" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="920" height="520" fill="url(#dashboard-hero-top-wash)" />

        <ellipse cx="815" cy="110" rx="112" ry="112" fill="url(#dashboard-hero-door-glow)" />
        <rect x="778" y="64" width="108" height="174" fill="none" stroke="rgba(220,229,236,0.5)" strokeWidth="1.3" />

        <ellipse cx="760" cy="432" rx="168" ry="34" fill="url(#dashboard-hero-ground-glow)" />
        <ellipse cx="758" cy="426" rx="170" ry="30" fill="none" stroke="rgba(213,224,232,0.08)" strokeWidth="1" />
        <ellipse cx="782" cy="450" rx="182" ry="24" fill="none" stroke="rgba(213,224,232,0.06)" strokeWidth="1" />

        <g fill="none" strokeLinecap="round">
          <path d="M370 274C482 252 598 250 742 266C794 271 838 278 882 288" stroke="url(#dashboard-hero-line)" strokeWidth="1.2" />
          <path d="M420 286C546 261 658 263 778 281C820 288 852 294 900 306" stroke="url(#dashboard-hero-line)" strokeWidth="1.05" opacity="0.86" />
          <path d="M470 302C586 278 690 281 798 300C840 308 875 315 920 324" stroke="url(#dashboard-hero-line)" strokeWidth="0.95" opacity="0.72" />
          <path d="M512 320C620 296 710 300 810 319C850 326 885 332 920 338" stroke="url(#dashboard-hero-line)" strokeWidth="0.9" opacity="0.54" />
          <path d="M560 344C658 322 742 326 834 342C868 348 894 354 920 360" stroke="url(#dashboard-hero-line)" strokeWidth="0.85" opacity="0.42" />
        </g>
      </svg>
    </div>
  );
}

function DashboardPlanArt() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg viewBox="0 0 920 320" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="dashboard-plan-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(239,245,249,0.22)" />
            <stop offset="100%" stopColor="rgba(239,245,249,0)" />
          </radialGradient>
          <linearGradient id="dashboard-plan-beam" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(226,236,242,0)" />
            <stop offset="56%" stopColor="rgba(226,236,242,0.65)" />
            <stop offset="100%" stopColor="rgba(226,236,242,0.04)" />
          </linearGradient>
          <linearGradient id="dashboard-plan-top-wash" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="920" height="320" fill="url(#dashboard-plan-top-wash)" />
        <ellipse cx="822" cy="46" rx="88" ry="88" fill="url(#dashboard-plan-glow)" />
        <path d="M660 320L920 92" stroke="url(#dashboard-plan-beam)" strokeWidth="1.4" />

        <g transform="translate(702 104)" fill="none" stroke="rgba(219,229,237,0.46)" strokeWidth="1.25">
          <path d="M0 38L52 8L104 38L52 68L0 38Z" />
          <path d="M0 38V108L52 140V68" />
          <path d="M104 38V108L52 140" />
          <path d="M52 68L104 38" />
        </g>
      </svg>
    </div>
  );
}

function DashboardScoreArt() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(188,204,216,0.14),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_32%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-36 w-44 bg-[radial-gradient(rgba(217,227,236,0.6)_0.8px,transparent_0.8px)] [background-size:12px_12px] opacity-[0.26] [mask-image:linear-gradient(180deg,transparent,black_30%)]"
      />
    </>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession("/dashboard");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromScore = resolvedSearchParams?.from === "score";
  const scoreId =
    typeof resolvedSearchParams?.sid === "string" ? resolvedSearchParams.sid : null;

  const [
    projectCount,
    recentProject,
    activePortfolio,
    projects,
    latestScore,
    focusedScore,
    entitlementSummary,
    profile,
  ] = await Promise.all([
    db.project.count({ where: { userId: session.user.id } }),
    db.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        stage: true,
        importStatus: true,
        updatedAt: true,
        _count: { select: { assets: true } },
      },
    }),
    db.portfolio.findFirst({
      where: { userId: session.user.id, status: { not: "PUBLISHED" } },
      orderBy: { updatedAt: "desc" },
    }),
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        stage: true,
        importStatus: true,
        updatedAt: true,
        _count: { select: { assets: true } },
        assets: {
          where: { isCover: true, selected: true },
          take: 1,
          select: { imageUrl: true },
        },
      },
    }),
    db.portfolioScore.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    scoreId
      ? db.portfolioScore.findFirst({
          where: { id: scoreId, userId: session.user.id },
        })
      : Promise.resolve(null),
    getEntitlementSummary(session.user.id),
    db.designerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        currentTitle: true,
        yearsOfExperience: true,
        targetRole: true,
        specialties: true,
        strengths: true,
      },
    }),
  ]);

  // Compute scores
  const latestScoreTotal = latestScore
    ? computeTotalScoreFromDimensions(
        normalizeDimensionScoresForComputation(
          latestScore.dimensionScores as Parameters<typeof computeTotalScoreFromDimensions>[0],
          latestScore.totalScore
        )
      )
    : null;
  const focusedScoreTotal = focusedScore
    ? computeTotalScoreFromDimensions(
        normalizeDimensionScoresForComputation(
          focusedScore.dimensionScores as Parameters<typeof computeTotalScoreFromDimensions>[0],
          focusedScore.totalScore
        )
      )
    : null;
  const latestScoreLevel =
    latestScore && latestScoreTotal !== null
      ? resolvePortfolioScoreLevel(latestScoreTotal, latestScore.level)
      : null;
  const focusedScoreLevel =
    focusedScore && focusedScoreTotal !== null
      ? resolvePortfolioScoreLevel(focusedScoreTotal, focusedScore.level)
      : null;

  const currentPlan = entitlementSummary.planType;
  const planCopy = PLAN_COPY[currentPlan] ?? PLAN_COPY.FREE;
  const profileReady = isProfileReadyForGeneration(profile);
  const focusedScoreCoverage = focusedScore
    ? (((focusedScore.coverageJson ?? {
        inputType: focusedScore.inputType.toLowerCase(),
        totalUnits: 0,
        isFullCoverage: false,
        detectedProjects: 0,
        scoringSources: [],
        visualAnchorUnits: [],
      }) as unknown) as ScoreCoverage)
    : null;
  const scoreNextStep =
    focusedScore && focusedScoreCoverage
      ? getScoreNextStep({
          scoreId: focusedScore.id,
          level: focusedScoreLevel ?? "DRAFT",
          coverage: focusedScoreCoverage,
          isLoggedIn: true,
          profileReady,
        })
      : null;
  const scorePrimaryHref = scoreNextStep?.primaryHref ?? `/projects?create=1&from=score&sid=${scoreId}`;
  const scorePrimaryLabel = scoreNextStep?.primaryLabel ?? "新建项目开始整理";
  const scorePrimaryCreatesProject = scorePrimaryHref.startsWith("/projects?create=1");

  // Primary/secondary object logic (spec §12.3): active Portfolio > active Project
  const primaryIsPortfolio = !!activePortfolio;
  const secondaryProject = primaryIsPortfolio && recentProject ? recentProject : null;
  const primaryContinuePath =
    primaryIsPortfolio && activePortfolio
      ? getPortfolioContinuePath(activePortfolio)
      : recentProject
        ? getProjectContinuePath(recentProject)
        : null;
  const primaryTitle =
    primaryIsPortfolio && activePortfolio ? activePortfolio.name : recentProject?.name ?? null;
  const primaryDescription = primaryContinuePath?.label ?? null;
  const primaryStatus =
    primaryIsPortfolio && activePortfolio
      ? (PORTFOLIO_STATUS_LABEL[activePortfolio.status] ?? activePortfolio.status)
      : projectStageLabel(recentProject);
  const primaryUpdatedAt =
    primaryIsPortfolio && activePortfolio
      ? formatProjectDate(activePortfolio.updatedAt)
      : recentProject
        ? formatProjectDate(recentProject.updatedAt)
        : null;
  const primaryCtaLabel = primaryIsPortfolio ? "继续编辑作品集" : "继续编辑项目";
  const primaryPriorityLabel = primaryIsPortfolio ? "先继续作品集" : "先继续项目";
  const nextPreparationCard = profileReady
    ? {
        title: "资料已经基本齐了",
        description: "可以继续推进项目整理，后续 AI 会按当前定位和目标岗位组织表达。",
        href: "/projects",
        cta: "查看项目池",
      }
    : {
        title: "先补设计师档案会更顺手",
        description: "把职位、经验和目标岗位写清楚，再回到项目或作品集，后续生成会更贴近投递方向。",
        href: "/profile",
        cta: "完善设计师档案",
      };

  const projectsWithCover = projects.map((p) => ({
    id: p.id,
    name: p.name,
    updatedAt: formatProjectDate(p.updatedAt),
    importStatus: p.importStatus,
    stage: p.stage,
    nextStep: getProjectContinuePath(p),
    stageSummary: getProjectStageSummary(p),
    coverImageUrl: p.assets[0] ? buildPrivateBlobProxyUrl(p.assets[0].imageUrl) : null,
  }));

  const hasObjects = projectCount > 0 || !!activePortfolio;

  // Stage label for project main card
  function projectStageLabel(project: typeof recentProject) {
    if (!project) return "";
    if (project.stage && project.stage !== "DRAFT") {
      return PROJECT_STAGE_LABEL[project.stage]?.label ?? project.stage;
    }
    return PROJECT_STATUS_LABEL[project.importStatus]?.label ?? "草稿";
  }

  const secondaryProjectToken = secondaryProject ? "01" : "项目";

  return (
    <div className="mx-auto max-w-[1480px] space-y-8 px-6 py-10">
      <div className="space-y-5">
        <div className="h-1 w-10 rounded-full bg-[linear-gradient(90deg,rgba(249,252,255,0.98),rgba(170,189,205,0.8))] shadow-[0_0_18px_rgba(168,190,208,0.38)]" />
        <PageHeader
          eyebrow="工作台"
          title="工作台首页"
          description="从这里继续你最近在做的事。"
          className="gap-6"
        />
      </div>

      <Separator className="-mx-6 w-auto bg-white/[0.06]" />

      {fromScore ? (
        <Card className="app-panel relative overflow-hidden border-white/10 bg-[#101318] shadow-none">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(170,189,205,0.14),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_34%)]"
          />
          <CardHeader className="relative gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/76"
                >
                  来自评分
                </Badge>
                {focusedScoreLevel ? (
                  <Badge
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[focusedScoreLevel].fg} ${LEVEL_COLOR[focusedScoreLevel].bg}`}
                  >
                    {PORTFOLIO_SCORE_LEVEL_CONFIG[focusedScoreLevel].label}
                  </Badge>
                ) : null}
              </div>
              {focusedScore ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black leading-none tracking-tight text-foreground">
                      {focusedScoreTotal ?? focusedScore.totalScore}
                    </span>
                    <span className="text-sm tabular-nums text-muted-foreground">/100</span>
                  </div>
                  <CardTitle className="text-xl">{scoreNextStep?.title ?? "带着评分继续下一步"}</CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6">
                    {scoreNextStep?.title ?? focusedScore.summaryPoints.slice(0, 2).join(" · ")}
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-xl">带着评分回到工作区继续整理</CardTitle>
                  <CardDescription className="max-w-3xl text-sm leading-6">
                  评分结果本身不会替你生成作品集，但它可以帮助你带着更清楚的问题进入后续整理流程。
                  </CardDescription>
                </>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              {focusedScore ? (
                <Button asChild variant="outline" className="h-11 px-5">
                  <Link href={`/score/${focusedScore.id}`}>
                    查看这次评分结果
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              {scorePrimaryCreatesProject ? (
                <CreateProjectDialog>
                  <Button className="h-11 border-white/12 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(224,231,237,0.92))] px-5 text-[#0b0d10] shadow-[0_18px_48px_-30px_rgba(189,207,222,0.42)] hover:bg-white">
                    {scorePrimaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CreateProjectDialog>
              ) : (
                <Button
                  asChild
                  className="h-11 border-white/12 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(224,231,237,0.92))] px-5 text-[#0b0d10] shadow-[0_18px_48px_-30px_rgba(189,207,222,0.42)] hover:bg-white"
                >
                  <Link href={scorePrimaryHref}>
                    {scorePrimaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {scoreNextStep?.secondaryHref ? (
                <Button asChild variant="outline" className="h-11 px-5">
                  <Link href={scoreNextStep.secondaryHref}>
                    {scoreNextStep.secondaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {!hasObjects ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
          <Card className="app-panel-elevated shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
                  开始使用
                </Badge>
              </div>
              <CardTitle className="text-3xl">还没有项目</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                先新建一个真实项目进入编辑器，再逐步补素材、项目事实和风格参考，后续就能继续生成排版和组装作品集。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <CreateProjectDialog>
                  <Button className="h-11 px-5">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新建第一个项目
                  </Button>
                </CreateProjectDialog>
                <Button asChild variant="outline" className="h-11 px-5">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    先补设计师档案
                  </Link>
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <CreateProjectDialog>
                  <button
                    type="button"
                    className="rounded-[24px] border border-border bg-secondary p-5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
                          入口一
                        </p>
                        <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                          新建空白项目
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          先输入项目名称，进入 editor 后再补素材、事实和风格参考。
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                </CreateProjectDialog>

                <Link
                  href="/profile"
                  className="rounded-[24px] border border-border bg-secondary p-5 transition-colors hover:bg-accent"
                >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
                          入口二
                        </p>
                      <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        先补设计师档案
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        完善职位、年限与目标岗位，后续生成的表达重心会更稳定。
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="app-panel-muted shadow-none">
              <CardHeader>
                <Badge variant="secondary" className="w-fit px-2 py-0.5 text-xs font-medium">
                  主链路
                </Badge>
                <CardTitle className="text-xl">先从一个项目开始，不必先凑整份作品集</CardTitle>
                <CardDescription className="text-sm leading-6">
                  当前工作台只需要帮助你进入最近上下文。对象创建后，会沿着同一条 editor 主链路继续推进。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  "新建项目",
                  "进入 Project Editor",
                  "组装作品集",
                  "发布或导出",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border bg-secondary px-4 py-3"
                  >
                    <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
                      0{index + 1}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="app-panel-muted shadow-none">
              <CardHeader>
                <Badge variant="secondary" className="w-fit px-2 py-0.5 text-xs font-medium">
                  当前权益
                </Badge>
                <CardTitle className="text-xl">{planCopy.title}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {planCopy.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="h-10 px-4">
                  <Link href={currentPlan === "FREE" ? "/pricing" : "/profile?panel=account"}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    查看完整权益
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className={DASHBOARD_TWO_COLUMN_GRID}>
            <Card className="app-panel-elevated relative flex h-full flex-col overflow-hidden border-white/10 bg-[#0f1115] shadow-[0_40px_110px_-82px_rgba(0,0,0,0.96)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(166,186,201,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_18%,transparent_44%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(217,228,237,0.54),transparent)]"
              />
              <DashboardHeroArt />
              <CardHeader className="relative z-10 min-h-[220px] max-w-3xl space-y-4 pb-2 lg:max-w-[54%]">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/80"
                  >
                    继续工作
                  </Badge>
                  {primaryIsPortfolio && activePortfolio ? (
                    <Badge
                      variant="outline"
                      className="border-[#d4e1ec]/10 bg-[#12161c]/80 px-2.5 py-1 text-[11px] font-medium text-[#d9e4ed]"
                    >
                      {primaryPriorityLabel}
                    </Badge>
                  ) : null}
                </div>
                {primaryTitle ? (
                  <CardTitle className="text-[2.6rem] leading-[1.02] tracking-[-0.055em] text-[#f4f7fa]">
                    {primaryTitle}
                  </CardTitle>
                ) : null}
                {primaryDescription ? (
                  <CardDescription className="max-w-3xl text-[15px] leading-7 text-white/62">
                    {primaryDescription}
                  </CardDescription>
                ) : null}
              </CardHeader>

              <CardContent className="relative z-10 space-y-5 pt-0">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryStatus ? (
                      <Badge
                        variant="outline"
                        className="border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/76"
                      >
                        {primaryStatus}
                      </Badge>
                    ) : null}
                    {primaryUpdatedAt ? (
                      <span className="flex items-center gap-1.5 text-xs tabular-nums text-[#9ca9b5]">
                        <Clock3 className="h-3 w-3" />
                        最近更新于 {primaryUpdatedAt}
                      </span>
                    ) : null}
                  </div>

                  {primaryContinuePath ? (
                    <div className="flex flex-wrap gap-3 sm:justify-end">
                      <Button
                        asChild
                        className="h-11 border-white/12 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(224,231,237,0.92))] px-5 text-[#0b0d10] shadow-[0_18px_48px_-30px_rgba(189,207,222,0.45)] hover:bg-white"
                      >
                        <Link href={primaryContinuePath.href}>
                          {primaryCtaLabel}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 border-[#d4e0ea]/12 bg-white/[0.03] px-5 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#dbe6ef]/18 hover:bg-[#181d24]"
                      >
                        <Link href={primaryIsPortfolio ? "/portfolios" : "/projects"}>
                          {primaryIsPortfolio ? "查看全部作品集" : "查看全部项目"}
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {secondaryProject ? (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-medium text-[#9ca9b5]">
                        同时进行
                      </p>
                      <Badge
                        variant="outline"
                        className="border-white/10 bg-[#11151b]/88 px-2 py-0.5 text-xs font-medium text-white/70"
                      >
                        项目
                      </Badge>
                    </div>
                    <Link
                      href={getProjectContinuePath(secondaryProject).href}
                      className="mt-4 flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-[#11151b]/90 px-4 py-4 transition-all hover:border-[#d9e4ed]/16 hover:bg-[#171c23]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[#d6e3ed]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] text-lg font-semibold tracking-[-0.04em] text-[#eef4f8] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                          {secondaryProjectToken}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-base font-medium text-[#f2f6f9]">
                              {secondaryProject.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-medium text-white/68"
                            >
                              {projectStageLabel(secondaryProject)}
                            </Badge>
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-[#8e9ba7]">
                            <Clock3 className="h-3 w-3" />
                            {formatProjectDate(secondaryProject.updatedAt)}
                          </span>
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#93a7b7]" />
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="app-panel relative flex h-full flex-col overflow-hidden border-white/10 bg-[#101317] shadow-none">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,181,198,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_28%)]"
              />
              <CardHeader className="relative min-h-[180px] space-y-3 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/76"
                  >
                    快速入口
                  </Badge>
                </div>
                <CardTitle className="text-[1.9rem] tracking-[-0.05em] text-[#f4f7fa]">
                  常用入口
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-white/58">
                  常用入口都在这里，不需要再回旧的流程页。
                </CardDescription>
              </CardHeader>
              <CardContent className="relative grid flex-1 gap-3 pt-0">
                <CreateProjectDialog>
                  <button
                    type="button"
                    className="group flex min-h-[62px] items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-3.5 text-left transition-all hover:border-[#dbe6ef]/18 hover:bg-[#171c23]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8e4ed]/10 bg-white/[0.03] text-[#dbe6ee] transition-colors group-hover:border-[#dbe6ef]/18">
                      <PlusCircle className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-[#f1f5f8]">新建项目</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#8fa3b2]" />
                  </button>
                </CreateProjectDialog>
                {DASHBOARD_QUICK_LINKS.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex min-h-[62px] items-center gap-3 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-3.5 transition-all hover:border-[#dbe6ef]/18 hover:bg-[#171c23]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d8e4ed]/10 bg-white/[0.03] text-[#dbe6ee] transition-colors group-hover:border-[#dbe6ef]/18">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-[#f1f5f8]">{label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#8fa3b2]" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="app-panel-muted relative flex h-full flex-col overflow-hidden border-white/10 bg-[#0f1216] shadow-none">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,181,198,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]"
              />
              <DashboardPlanArt />
              <CardContent className="relative flex h-full flex-col space-y-5 p-5">
                <div className="flex min-h-[140px] flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/76"
                      >
                        套餐与额度
                      </Badge>
                    </div>
                    <p className="text-[2.1rem] font-semibold tracking-[-0.05em] text-[#f5f8fa]">
                      {planCopy.title}
                    </p>
                    <p className="max-w-[34rem] text-sm leading-6 text-white/58">
                      {planCopy.description}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 border-[#d4e0ea]/12 bg-white/[0.03] px-4 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#dbe6ef]/18 hover:bg-[#171c23]"
                  >
                    <Link href={currentPlan === "FREE" ? "/pricing" : "/profile?panel=account"}>
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                      查看权益
                    </Link>
                  </Button>
                </div>
                {entitlementSummary.expiresAt ? (
                  <p className="text-xs tabular-nums text-[#94a2af]">
                    有效期至 {formatProjectDate(entitlementSummary.expiresAt)}
                  </p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {DASHBOARD_QUOTA_ORDER.map((quotaKey) => {
                    const quota = entitlementSummary.quotas[quotaKey];
                    const usageRatio = getQuotaUsageRatio(quotaKey, quota);
                    const usageLabel =
                      quota.limit <= 0
                        ? "未解锁"
                        : quotaKey === "activeProjects"
                          ? `${quota.used}/${quota.limit}`
                          : `${quota.remaining} / ${quota.limit} 次`;
                    return (
                      <div
                        key={quotaKey}
                        className="min-h-[112px] rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018))] px-4 py-3.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-[#94a2af]">
                            {DASHBOARD_QUOTA_LABELS[quotaKey]}
                          </p>
                          <span className="text-[11px] font-medium text-white/34">
                            {quota.limit <= 0 ? "锁定" : `${Math.round(usageRatio * 100)}%`}
                          </span>
                        </div>
                        <p className="mt-3 text-base font-semibold text-[#f2f6f9]">
                          {usageLabel}
                        </p>
                        <div className="mt-4 h-[5px] rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(246,249,252,0.95),rgba(164,185,201,0.86))]"
                            style={{
                              width:
                                usageRatio > 0
                                  ? `${Math.max(usageRatio * 100, 12)}%`
                                  : "0%",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {latestScore && latestScoreTotal !== null ? (
              <Card className="app-panel-muted relative flex h-full flex-col overflow-hidden border-white/10 bg-[#0f1115] shadow-none">
                <DashboardScoreArt />
                <CardContent className="relative flex h-full flex-col space-y-5 p-5">
                  <div className="flex min-h-[140px] flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/76"
                      >
                        最近一次评分
                      </Badge>
                      {latestScoreLevel ? (
                        <Badge
                          className={`px-2 py-0.5 text-xs font-medium ${LEVEL_COLOR[latestScoreLevel].fg} ${LEVEL_COLOR[latestScoreLevel].bg}`}
                        >
                          {PORTFOLIO_SCORE_LEVEL_CONFIG[latestScoreLevel].label}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="flex items-end gap-2">
                          <p className="text-[3.25rem] font-semibold leading-none tracking-[-0.06em] text-[#f4f8fb]">
                            {latestScoreTotal}
                          </p>
                          <span className="pb-1 text-sm text-[#93a4b2]">/100</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-white/58">
                          {formatProjectDate(latestScore.createdAt)} 的结果，可作为接下来整理和发布前的参考。
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-auto h-10 self-start border-[#d4e0ea]/12 bg-white/[0.03] px-4 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#dbe6ef]/18 hover:bg-[#171c23]"
                  >
                    <Link href={`/score/${latestScore.id}`}>
                      查看完整评分结果
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="app-panel-muted relative flex h-full flex-col overflow-hidden border-white/10 bg-[#0f1115] shadow-none">
                <DashboardScoreArt />
                <CardContent className="relative flex h-full flex-col space-y-5 p-5">
                  <div className="flex min-h-[140px] flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/76"
                      >
                        接下来建议
                      </Badge>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#f2f6f9]">
                        {nextPreparationCard.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/58">
                        {nextPreparationCard.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-auto h-10 self-start border-[#d4e0ea]/12 bg-white/[0.03] px-4 text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-[#dbe6ef]/18 hover:bg-[#171c23]"
                  >
                    <Link href={nextPreparationCard.href}>
                      {nextPreparationCard.cta}
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {projects.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-px w-8 bg-[linear-gradient(90deg,rgba(247,250,252,0.92),rgba(163,181,198,0.56))]" />
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      最近项目
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      项目会持续沉淀在这里，需要时可以直接回到编辑器。
                    </p>
                  </div>
                </div>
                <Button asChild variant="ghost" className="h-9 px-0 text-white/74 hover:text-white">
                  <Link href="/projects">
                    查看全部项目
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <ProjectsCollection projects={projectsWithCover} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

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
  READY: { fg: "text-emerald-700", bg: "bg-emerald-50" },
  NEEDS_IMPROVEMENT: { fg: "text-amber-700", bg: "bg-amber-50" },
  DRAFT: { fg: "text-orange-700", bg: "bg-orange-50" },
  NOT_READY: { fg: "text-red-700", bg: "bg-red-50" },
};

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

  return (
    <div className="space-y-6 px-6 py-10">
      <PageHeader
        eyebrow="Workspace"
        title="工作台首页"
        description="这里的任务只有一个：帮你尽快回到最近的工作上下文。"
      />

      <Separator className="-mx-6 w-auto" />

      {fromScore ? (
        <Card className="border-border/70 bg-card/95 shadow-xs">
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                  来自评分
                </Badge>
                {focusedScoreLevel ? (
                  <Badge
                    className={`rounded-md px-2 py-0.5 font-mono text-xs ${LEVEL_COLOR[focusedScoreLevel].fg} ${LEVEL_COLOR[focusedScoreLevel].bg}`}
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
                    <span className="text-sm font-mono text-muted-foreground">/100</span>
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
                  <Button className="h-11 px-5">
                    {scorePrimaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CreateProjectDialog>
              ) : (
                <Button asChild className="h-11 px-5">
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <Card className="border-border/70 bg-card/95 shadow-xs">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                  开始使用
                </Badge>
              </div>
              <CardTitle className="text-3xl">还没有项目</CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6">
                先新建一个真实项目进入编辑器，再逐步补素材、项目事实和风格参考，后续就能继续生成排版和组装作品集。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <CreateProjectDialog>
                <Button className="h-11 px-5">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  新建第一个项目
                </Button>
              </CreateProjectDialog>

              <Separator />

              <div className="grid gap-3">
                <CreateProjectDialog>
                  <button
                    type="button"
                    className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <PlusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">新建空白项目</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        先输入项目名称，进入编辑器后再补素材、事实和风格参考。
                      </span>
                    </span>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </CreateProjectDialog>

                <Link
                  href="/profile"
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-background px-4 py-4 transition-colors hover:bg-muted/50"
                >
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">先补个人资料</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      完善职位、年限与目标岗位，影响 AI 生成的表达重心。
                    </span>
                  </span>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden border-border/70 bg-card/95 shadow-xs lg:flex lg:flex-col lg:justify-center">
            <CardContent className="flex h-full flex-col items-center justify-center gap-5 p-10 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/illustrations/isometric-workspace.png"
                alt=""
                className="w-full max-w-[320px] opacity-75 mix-blend-multiply"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">从一个项目开始，不必先凑完整作品集</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  当前 V3 主流程已经收敛成 <code>新建项目 -&gt; editor -&gt; portfolio editor -&gt; publish</code>。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/95 shadow-xs">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                    继续工作
                  </Badge>
                  {primaryIsPortfolio && activePortfolio ? (
                    <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-xs">
                      作品集优先
                    </Badge>
                  ) : null}
                </div>

                {primaryIsPortfolio && activePortfolio ? (
                  <>
                    <CardTitle className="text-3xl">{activePortfolio.name}</CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {getPortfolioContinuePath(activePortfolio).label}
                    </CardDescription>
                  </>
                ) : recentProject ? (
                  <>
                    <CardTitle className="text-3xl">{recentProject.name}</CardTitle>
                    <CardDescription className="text-sm leading-6">
                      {getProjectContinuePath(recentProject).label}
                    </CardDescription>
                  </>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-5">
                {primaryIsPortfolio && activePortfolio ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-xs">
                        {PORTFOLIO_STATUS_LABEL[activePortfolio.status] ?? activePortfolio.status}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        最近更新于 {formatProjectDate(activePortfolio.updatedAt)}
                      </span>
                    </div>
                    <Button asChild className="h-11 px-6">
                      <Link href={getPortfolioContinuePath(activePortfolio).href}>
                        继续编辑作品集
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : recentProject ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-xs">
                        {projectStageLabel(recentProject)}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        最近更新于 {formatProjectDate(recentProject.updatedAt)}
                      </span>
                    </div>
                    <Button asChild className="h-11 px-6">
                      <Link href={getProjectContinuePath(recentProject).href}>
                        继续编辑项目
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}

                {secondaryProject ? (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        同时进行
                      </p>
                      <Link
                        href={getProjectContinuePath(secondaryProject).href}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-4 py-4 transition-colors hover:bg-muted/50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">{secondaryProject.name}</span>
                            <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-eyebrow">
                              {projectStageLabel(secondaryProject)}
                            </Badge>
                          </span>
                          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="h-3 w-3" />
                            {formatProjectDate(secondaryProject.updatedAt)}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {projects.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                      最近项目
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">项目对象会持续沉淀在这里，后续可以直接回到 editor。</p>
                  </div>
                  <Button asChild variant="ghost" className="h-9 px-0">
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

          <div className="space-y-6">
            <Card className="border-border/70 bg-card/95 shadow-xs">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                    快速入口
                  </Badge>
                </div>
                <CardTitle className="text-xl">直接进入当前主链路</CardTitle>
                <CardDescription className="text-sm leading-6">
                  后台入口已经收敛到 editor、portfolio editor、publish 和 profile，不再依赖旧 workflow 页面。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <CreateProjectDialog>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <PlusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground">新建项目</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </CreateProjectDialog>
                {[
                  { icon: BookOpen, label: "新建作品集", href: "/portfolios/new" },
                  { icon: FolderOpen, label: "查看全部项目", href: "/projects" },
                  { icon: Layers, label: "查看全部作品集", href: "/portfolios" },
                  { icon: User, label: "个人资料", href: "/profile" },
                ].map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-background px-4 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/95 shadow-xs">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                    当前权益
                  </Badge>
                </div>
                <CardTitle className="text-xl">{planCopy.title}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {planCopy.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {entitlementSummary.expiresAt ? (
                  <p className="text-xs font-mono text-muted-foreground">
                    有效期至 {formatProjectDate(entitlementSummary.expiresAt)}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    entitlementSummary.quotas.activeProjects,
                    entitlementSummary.quotas.projectLayouts,
                    entitlementSummary.quotas.portfolioPackagings,
                    entitlementSummary.quotas.publishLinks,
                  ].map((quota) => (
                    <div
                      key={quota.label}
                      className="rounded-xl border border-border/70 bg-background px-4 py-3"
                    >
                      <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        {quota.label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {quota.label === "可激活项目"
                          ? `${quota.used}/${quota.limit}`
                          : `${quota.remaining} / ${quota.limit} 次`}
                      </p>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="h-10 px-4">
                  <Link href={currentPlan === "FREE" ? "/pricing" : "/profile"}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    查看完整权益
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {latestScore && latestScoreTotal !== null ? (
              <Card className="border-border/70 bg-card/95 shadow-xs">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                      最近评分
                    </Badge>
                    {latestScoreLevel ? (
                      <Badge
                        className={`rounded-md px-2 py-0.5 font-mono text-xs ${LEVEL_COLOR[latestScoreLevel].fg} ${LEVEL_COLOR[latestScoreLevel].bg}`}
                      >
                        {PORTFOLIO_SCORE_LEVEL_CONFIG[latestScoreLevel].label}
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-3xl">{latestScoreTotal}</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    {formatProjectDate(latestScore.createdAt)} 的评分结果，适合作为后续整理和发布前的基线。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="h-10 px-4">
                    <Link href={`/score/${latestScore.id}`}>
                      查看完整评分结果
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

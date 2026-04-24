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
] as const satisfies ReadonlyArray<keyof typeof DASHBOARD_QUOTA_LABELS>;

const DASHBOARD_QUICK_LINKS = [
  { icon: BookOpen, label: "新建作品集", href: "/portfolios/new" },
  { icon: FolderOpen, label: "查看全部项目", href: "/projects" },
  { icon: Layers, label: "查看全部作品集", href: "/portfolios" },
  { icon: User, label: "设计师档案", href: "/profile" },
] as const;

const DASHBOARD_TWO_COLUMN_GRID =
  "grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]";

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

  return (
    <div className="mx-auto max-w-[1480px] space-y-8 px-6 py-10">
      <PageHeader
        eyebrow="工作台"
        title="工作台首页"
        description="从这里继续你最近在做的事。"
      />

      <Separator className="-mx-6 w-auto" />

      {fromScore ? (
        <Card className="app-panel shadow-none">
          <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs font-medium">
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
            <Card className="app-panel-elevated flex h-full flex-col shadow-none">
              <CardHeader className="min-h-[180px] space-y-3 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
                    继续工作
                  </Badge>
                  {primaryIsPortfolio && activePortfolio ? (
                    <Badge variant="outline" className="px-2 py-0.5 text-xs font-medium">
                      {primaryPriorityLabel}
                    </Badge>
                  ) : null}
                </div>
                {primaryTitle ? <CardTitle className="text-3xl">{primaryTitle}</CardTitle> : null}
                {primaryDescription ? (
                  <CardDescription className="max-w-3xl text-sm leading-6">
                    {primaryDescription}
                  </CardDescription>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {primaryStatus ? (
                      <Badge variant="outline" className="px-2 py-0.5 text-xs font-medium">
                        {primaryStatus}
                      </Badge>
                    ) : null}
                    {primaryUpdatedAt ? (
                      <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        最近更新于 {primaryUpdatedAt}
                      </span>
                    ) : null}
                  </div>

                  {primaryContinuePath ? (
                    <div className="flex flex-wrap gap-3 sm:justify-end">
                      <Button asChild className="h-11 px-5">
                        <Link href={primaryContinuePath.href}>
                          {primaryCtaLabel}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-11 px-5">
                        <Link href={primaryIsPortfolio ? "/portfolios" : "/projects"}>
                          {primaryIsPortfolio ? "查看全部作品集" : "查看全部项目"}
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </div>

                {secondaryProject ? (
                  <div className="rounded-[24px] border border-border bg-secondary p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        同时进行
                      </p>
                      <Badge variant="outline" className="px-2 py-0.5 text-xs font-medium">
                        项目
                      </Badge>
                    </div>
                    <Link
                      href={getProjectContinuePath(secondaryProject).href}
                      className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{secondaryProject.name}</span>
                          <Badge variant="outline" className="px-2 py-0.5 text-xs font-medium">
                            {projectStageLabel(secondaryProject)}
                          </Badge>
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {formatProjectDate(secondaryProject.updatedAt)}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="app-panel flex h-full flex-col shadow-none">
              <CardHeader className="min-h-[180px] space-y-3 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
                    快速入口
                  </Badge>
                </div>
                <CardTitle className="text-xl">常用入口</CardTitle>
                <CardDescription className="text-sm leading-6">
                  常用入口都在这里，不需要再回旧的流程页。
                </CardDescription>
              </CardHeader>
              <CardContent className="grid flex-1 gap-3 pt-0">
                <CreateProjectDialog>
                  <button
                    type="button"
                    className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5 text-left transition-colors hover:bg-accent"
                  >
                    <PlusCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground">新建项目</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </CreateProjectDialog>
                {DASHBOARD_QUICK_LINKS.map(({ icon: Icon, label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3.5 transition-colors hover:bg-accent"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="app-panel-muted flex h-full flex-col shadow-none">
              <CardContent className="flex h-full flex-col space-y-4 p-5">
                <div className="flex min-h-[140px] flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
                        套餐与额度
                      </Badge>
                    </div>
                    <p className="text-base font-semibold text-foreground">{planCopy.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {planCopy.description}
                    </p>
                  </div>
                  <Button asChild variant="outline" className="h-9 px-3.5">
                    <Link href={currentPlan === "FREE" ? "/pricing" : "/profile?panel=account"}>
                      <CreditCard className="mr-2 h-3.5 w-3.5" />
                      查看权益
                    </Link>
                  </Button>
                </div>
                {entitlementSummary.expiresAt ? (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    有效期至 {formatProjectDate(entitlementSummary.expiresAt)}
                  </p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {DASHBOARD_QUOTA_ORDER.map((quotaKey) => {
                    const quota = entitlementSummary.quotas[quotaKey];
                    return (
                      <div
                        key={quotaKey}
                        className="min-h-[74px] rounded-lg border border-border bg-secondary px-3 py-2.5"
                      >
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {DASHBOARD_QUOTA_LABELS[quotaKey]}
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {quotaKey === "activeProjects"
                            ? `${quota.used}/${quota.limit}`
                            : `${quota.remaining} / ${quota.limit} 次`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {latestScore && latestScoreTotal !== null ? (
              <Card className="app-panel-muted flex h-full flex-col shadow-none">
                <CardContent className="flex h-full flex-col space-y-4 p-5">
                  <div className="flex min-h-[140px] flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
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
                        <p className="text-2xl font-semibold text-foreground">{latestScoreTotal}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {formatProjectDate(latestScore.createdAt)} 的结果，可作为接下来整理和发布前的参考。
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="mt-auto h-9 self-start px-3.5">
                    <Link href={`/score/${latestScore.id}`}>
                      查看完整评分结果
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="app-panel-muted flex h-full flex-col shadow-none">
                <CardContent className="flex h-full flex-col space-y-4 p-5">
                  <div className="flex min-h-[140px] flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs font-medium">
                        接下来建议
                      </Badge>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">{nextPreparationCard.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {nextPreparationCard.description}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="mt-auto h-9 self-start px-3.5">
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
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    最近项目
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">项目会持续沉淀在这里，需要时可以直接回到编辑器。</p>
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
      )}
    </div>
  );
}

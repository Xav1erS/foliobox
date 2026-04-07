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
import { Button } from "@/components/ui/button";
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
import { ProjectsCollection } from "@/components/app/ProjectsCollection";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";

const PLAN_COPY: Record<string, { title: string; description: string }> = {
  FREE: {
    title: "免费体验",
    description: "可继续整理项目、生成草稿。完整排版、发布与 PDF 导出需解锁后可用。",
  },
  PRO: {
    title: "起稿陪跑",
    description: "已解锁完整生成流程、PDF 导出和在线链接发布。",
  },
  SPRINT: {
    title: "细化陪跑",
    description: "已解锁更高配额与更强生成能力，适合求职冲刺期。",
  },
};

const LEVEL_COLOR: Record<PortfolioScoreLevel, { fg: string; bg: string }> = {
  READY: { fg: "text-emerald-700", bg: "bg-emerald-50" },
  NEEDS_IMPROVEMENT: { fg: "text-amber-700", bg: "bg-amber-50" },
  DRAFT: { fg: "text-orange-700", bg: "bg-orange-50" },
  NOT_READY: { fg: "text-red-700", bg: "bg-red-50" },
};

const PORTFOLIO_STAGE_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  SELECTION: "选择项目",
  OUTLINE: "确认结构",
  EDITOR: "修改中",
  PUBLISHED: "已发布",
};

function getPortfolioNextStep(portfolio: { id: string; status: string }): {
  href: string;
  label: string;
} {
  switch (portfolio.status) {
    case "EDITOR":
    case "PUBLISHED":
      return { href: `/portfolios/${portfolio.id}/editor`, label: "继续修改作品集" };
    case "OUTLINE":
      return { href: `/portfolios/${portfolio.id}/outline`, label: "继续确认结构" };
    default:
      return { href: `/portfolios/${portfolio.id}/outline`, label: "开始组装作品集" };
  }
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
    userPlan,
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
    db.userPlan.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { planType: true, expiresAt: true },
    }),
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

  const currentPlan = userPlan?.planType ?? "FREE";
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
    <div className="px-6 py-10">
      <PageHeader
        eyebrow="Workspace"
        title="工作台首页"
        description="这里的任务只有一个：帮你尽快回到最近的工作上下文。"
      />

      {/* 2px structural divider — -mx-6 breaks out of px-6 padding to span edge-to-edge */}
      <div className="mt-6 -mx-6 border-t-2 border-black" />

      {/* From-score banner */}
      {fromScore ? (
        <div className="border-b border-neutral-200 py-6">
          <p className="mb-4 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
            来自评分
          </p>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              {focusedScore ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-black leading-none tracking-tight text-neutral-900">
                      {focusedScoreTotal}
                    </span>
                    <span className="text-sm font-mono text-neutral-400">/100</span>
                    {focusedScoreLevel ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${LEVEL_COLOR[focusedScoreLevel].fg} ${LEVEL_COLOR[focusedScoreLevel].bg}`}
                      >
                        {PORTFOLIO_SCORE_LEVEL_CONFIG[focusedScoreLevel].label}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm leading-6 text-neutral-500">
                    {scoreNextStep?.title ?? focusedScore.summaryPoints.slice(0, 2).join(" · ")}
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-neutral-500">
                  评分结果本身不会替你生成作品集，但它可以帮助你带着更清楚的问题进入后续整理流程。
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {focusedScore ? (
                <Button asChild variant="outline" className="h-11 rounded-none px-5">
                  <Link href={`/score/${focusedScore.id}`}>
                    查看这次评分结果
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
              <Button asChild className="h-11 rounded-none px-5">
                <Link href={scoreNextStep?.primaryHref ?? `/projects/new?from=score&sid=${scoreId}`}>
                  {scoreNextStep?.primaryLabel ?? "新建项目开始整理"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {scoreNextStep?.secondaryHref ? (
                <Button asChild variant="outline" className="h-11 rounded-none px-5">
                  <Link href={scoreNextStep.secondaryHref}>
                    {scoreNextStep.secondaryLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Main content */}
      {!hasObjects ? (
        /* ── Empty state ── */
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2 lg:divide-x-2 lg:divide-black">
          <div className="py-10 pr-0 lg:pr-10">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
              开始使用
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
              还没有项目
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              先导入一个真实项目，再补充项目关键信息，生成第一版作品集初稿。
            </p>
            <div className="mt-6">
              <Button asChild className="h-11 rounded-none px-5">
                <Link href="/projects/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  导入第一个项目
                </Link>
              </Button>
            </div>

            <div className="mt-8 border-t border-neutral-200">
              {[
                {
                  icon: FolderOpen,
                  title: "从 Figma 开始",
                  desc: "保存 Figma 链接，进入素材确认页后手动上传关键截图。",
                  href: "/projects/new",
                },
                {
                  icon: BookOpen,
                  title: "从截图开始",
                  desc: "上传页面截图后直接进入素材选择与后续整理流程。",
                  href: "/projects/new",
                },
                {
                  icon: User,
                  title: "先补个人资料",
                  desc: "完善职位、年限与目标岗位，影响 AI 生成的表达重心。",
                  href: "/profile",
                },
              ].map(({ icon: Icon, title, desc, href }) => (
                <Link
                  key={href + title}
                  href={href}
                  className="group relative flex items-start gap-3 border-b border-neutral-200 py-4 pl-4 pr-2 transition-colors hover:bg-neutral-50"
                >
                  <span className="absolute left-0 top-0 h-full w-[2px] bg-transparent transition-colors group-hover:bg-brand-red" />
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-500">{desc}</p>
                  </div>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-600" />
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center justify-center py-10 pl-10 lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/illustrations/isometric-workspace.png"
              alt=""
              className="w-full max-w-[340px] opacity-75 mix-blend-multiply"
            />
          </div>
        </div>
      ) : (
        /* ── Has objects ── */
        <div>
          {/* Outer grid: [left-area | right: plan+score] — 2px black vertical divide */}
          <div className="grid grid-cols-1 divide-y-2 divide-black lg:grid-cols-[1fr_280px] lg:divide-x-2 lg:divide-y-0">

            {/* LEFT AREA: inner grid [继续 | 快速入口] — 1px neutral vertical divide */}
            <div className="grid grid-cols-1 divide-y divide-neutral-200 lg:grid-cols-[1fr_280px] lg:divide-x lg:divide-y-0">

              {/* 01 — Primary active object (wider, primary action) */}
              <div className="py-6 pr-0 lg:pr-8">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                  01 / 继续
                </p>

                {primaryIsPortfolio && activePortfolio ? (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
                        {activePortfolio.name}
                      </h2>
                      <span className="inline-flex items-center border border-neutral-300 px-2 py-0.5 text-xs font-mono uppercase tracking-wide text-neutral-500">
                        作品集
                      </span>
                      <span className="inline-flex items-center border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-mono uppercase tracking-wide text-neutral-400">
                        {PORTFOLIO_STAGE_LABEL[activePortfolio.status] ?? activePortfolio.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-neutral-600">
                      <span className="mr-1.5 text-neutral-400">—</span>
                      {getPortfolioNextStep(activePortfolio).label}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-neutral-400">
                      <Clock3 className="h-3 w-3" />
                      最近更新于 {formatProjectDate(activePortfolio.updatedAt)}
                    </p>
                    <div className="mt-5">
                      <Button asChild className="h-11 rounded-none px-6">
                        <Link href={getPortfolioNextStep(activePortfolio).href}>
                          继续
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : recentProject ? (
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-bold tracking-tight text-neutral-900">
                        {recentProject.name}
                      </h2>
                      <span className="inline-flex items-center border border-neutral-300 px-2 py-0.5 text-xs font-mono uppercase tracking-wide text-neutral-500">
                        项目
                      </span>
                      <span className="inline-flex items-center border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-mono uppercase tracking-wide text-neutral-400">
                        {projectStageLabel(recentProject)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-neutral-600">
                      <span className="mr-1.5 text-neutral-400">—</span>
                      {getProjectContinuePath(recentProject).label}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-neutral-400">
                      <Clock3 className="h-3 w-3" />
                      最近更新于 {formatProjectDate(recentProject.updatedAt)}
                    </p>
                    <div className="mt-5">
                      <Button asChild className="h-11 rounded-none px-6">
                        <Link href={getProjectContinuePath(recentProject).href}>
                          继续
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Secondary active object — compact row below button when both exist */}
                {secondaryProject ? (
                  <div className="mt-5 border-t border-neutral-200 pt-4">
                    <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                      同时进行
                    </p>
                    <Link
                      href={getProjectContinuePath(secondaryProject).href}
                      className="group mt-2 flex items-center gap-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium text-neutral-900 truncate">
                            {secondaryProject.name}
                          </span>
                          <span className="inline-flex items-center border border-neutral-200 px-1.5 py-0 text-[9px] font-mono uppercase tracking-wide text-neutral-400">
                            项目
                          </span>
                          <span className="inline-flex items-center border border-neutral-100 bg-neutral-50 px-1.5 py-0 text-[9px] font-mono uppercase tracking-wide text-neutral-400">
                            {projectStageLabel(secondaryProject)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                          <Clock3 className="h-3 w-3" />
                          {formatProjectDate(secondaryProject.updatedAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-neutral-600 group-hover:text-neutral-900">继续</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-600" />
                    </Link>
                  </div>
                ) : null}
              </div>

              {/* 02 — Quick access (280px, aligned with right column) */}
              <div className="py-6 pl-0 lg:pl-8 lg:pr-6">
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                  02 / 快速入口
                </p>
                <div className="mt-3">
                  {[
                    { icon: PlusCircle, label: "新建项目", href: "/projects/new" },
                    { icon: BookOpen, label: "新建作品集", href: "/portfolios/new" },
                    { icon: FolderOpen, label: "查看全部项目", href: "/projects" },
                    { icon: Layers, label: "查看全部作品集", href: "/portfolios" },
                    { icon: User, label: "个人资料", href: "/profile" },
                  ].map(({ icon: Icon, label, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className="group relative flex items-center gap-2.5 border-b border-neutral-200 py-2.5 pl-3 pr-3 transition-colors hover:bg-neutral-50"
                    >
                      <span className="absolute left-0 top-0 h-full w-[2px] bg-transparent transition-colors group-hover:bg-brand-red" />
                      <Icon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      <span className="flex-1 text-sm font-medium text-neutral-800">{label}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-600" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: plan summary + score — flex-col so score sits at bottom */}
            <div className="flex flex-col py-6 pl-0 lg:pl-8">

              {/* Plan / budget summary */}
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                  当前权益
                </p>
                <div className="mt-3">
                  <p className="text-xl font-bold tracking-tight text-neutral-900">
                    {planCopy.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                    {planCopy.description}
                  </p>
                  {userPlan?.expiresAt ? (
                    <p className="mt-2 text-xs font-mono text-neutral-400">
                      有效期至 {formatProjectDate(userPlan.expiresAt)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-neutral-500">预算充足</span>
                  </div>
                  {currentPlan === "FREE" ? (
                    <Link
                      href="/pricing"
                      className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      查看完整权益
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ) : (
                    <Link
                      href="/profile"
                      className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                    >
                      查看完整权益
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Score — mt-auto pushes it to the bottom of the right column */}
              {latestScore && latestScoreTotal !== null ? (
                <div className="mt-auto border-t border-neutral-200 pt-5">
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                    最近评分
                  </p>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black leading-none tracking-tight text-neutral-900">
                        {latestScoreTotal}
                      </span>
                      <span className="text-xs font-mono text-neutral-400">/100</span>
                      {latestScoreLevel ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${LEVEL_COLOR[latestScoreLevel].fg} ${LEVEL_COLOR[latestScoreLevel].bg}`}
                        >
                          {PORTFOLIO_SCORE_LEVEL_CONFIG[latestScoreLevel].label}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs font-mono text-neutral-400">
                      {formatProjectDate(latestScore.createdAt)}
                    </p>
                    <Link
                      href={`/score/${latestScore.id}`}
                      className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                    >
                      查看完整评分结果
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* 2px structural divider above project grid */}
          <div className="-mx-6 border-t-2 border-black" />

          {/* Project grid */}
          {projects.length > 0 ? (
            <div className="py-6">
              <p className="mb-5 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                最近项目
              </p>
              <ProjectsCollection projects={projectsWithCover} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

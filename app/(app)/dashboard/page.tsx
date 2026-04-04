import Link from "next/link";
import { ArrowRight, Clock3, CreditCard, FileText, PlusCircle, Star, User } from "lucide-react";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { getRequiredSession } from "@/lib/required-session";
import type { ScoreCoverage } from "@/lib/score-contract";
import {
  PORTFOLIO_SCORE_LEVEL_CONFIG,
  resolvePortfolioScoreLevel,
} from "@/lib/portfolio-score-level";
import { computeTotalScoreFromDimensions } from "@/lib/score-math";
import {
  getScoreNextStep,
  isProfileReadyForGeneration,
} from "@/lib/score-next-step";
import {
  PROJECT_STATUS_LABEL,
  formatProjectDate,
  getProjectContinuePath,
} from "@/lib/project-workflow";

const PLAN_COPY: Record<string, { title: string; description: string }> = {
  FREE: {
    title: "免费版",
    description: "可继续体验评分、创建项目，并在需要完整生成、发布和导出时再解锁。",
  },
  PRO: {
    title: "Pro 版",
    description: "已解锁完整评分结果、整理流程、PDF 导出和在线链接发布。",
  },
  SPRINT: {
    title: "求职冲刺版",
    description: "已解锁更高配额与更适合求职窗口期的强化能力。",
  },
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

  const [projectCount, recentProject, latestScore, focusedScore, userPlan, profile] = await Promise.all([
    db.project.count({
      where: { userId: session.user.id },
    }),
    db.project.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { assets: true } },
        facts: { select: { updatedAt: true } },
        outlines: {
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true },
          take: 1,
        },
        drafts: {
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true, status: true },
          take: 1,
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

  const latestScoreDisplayTotal = latestScore
    ? computeTotalScoreFromDimensions(
        latestScore.dimensionScores as Parameters<typeof computeTotalScoreFromDimensions>[0]
      )
    : null;
  const focusedScoreDisplayTotal = focusedScore
    ? computeTotalScoreFromDimensions(
        focusedScore.dimensionScores as Parameters<typeof computeTotalScoreFromDimensions>[0]
      )
    : null;
  const latestScoreLevel =
    latestScore && latestScoreDisplayTotal !== null
      ? resolvePortfolioScoreLevel(latestScoreDisplayTotal, latestScore.level)
      : null;
  const focusedScoreLevel =
    focusedScore && focusedScoreDisplayTotal !== null
      ? resolvePortfolioScoreLevel(focusedScoreDisplayTotal, focusedScore.level)
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        eyebrow="Workspace"
        title="工作台首页"
        description="这里的任务只有一个：帮你尽快回到最近的工作上下文。全部项目管理请进入“我的项目”。"
        actions={
          <Button asChild className="h-11 rounded-xl px-5">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              新建项目
            </Link>
          </Button>
        }
      />

      {fromScore ? (
        <div className="mt-6">
          <SectionCard
            title="从评分结果继续"
            description={
              scoreNextStep?.description ??
              "你刚才的评分结果已经带进工作台了。接下来可以新建项目，开始把零散内容整理成第一版。"
            }
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                {focusedScore ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-3xl font-semibold tracking-tight text-neutral-900">
                          {focusedScoreDisplayTotal}
                        </span>
                        <span className="text-sm text-neutral-400">/100</span>
                      {focusedScoreLevel ? (
                        <Badge variant="outline">
                          {PORTFOLIO_SCORE_LEVEL_CONFIG[focusedScoreLevel].label}
                        </Badge>
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
                  <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                    <Link href={`/score/${focusedScore.id}`}>
                      查看这次评分结果
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button asChild className="h-11 rounded-xl px-5">
                  <Link href={scoreNextStep?.primaryHref ?? `/projects/new?from=score&sid=${scoreId}`}>
                    {scoreNextStep?.primaryLabel ?? "新建项目开始整理"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                {scoreNextStep?.secondaryHref ? (
                  <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                    <Link href={scoreNextStep.secondaryHref}>
                      {scoreNextStep.secondaryLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      <div className="mt-8">
        {projectCount === 0 ? (
          <div className="space-y-4">
            <EmptyState
              icon={<FileText className="h-6 w-6 text-neutral-400" />}
              title="还没有项目"
              description="先导入一个真实项目，再补充项目关键信息，生成第一版作品集初稿。"
              action={
                <Button asChild className="h-11 rounded-xl px-5">
                  <Link href="/projects/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    导入第一个项目
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard
                title="从 Figma 开始"
                description="保存链接后继续进入素材确认页，MVP 阶段仍由你手动上传关键截图。"
              >
                <Link href="/projects/new" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                  去导入项目
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SectionCard>
              <SectionCard
                title="从截图开始"
                description="适合已经准备好页面截图的项目，上传后可直接进入素材选择与后续整理流程。"
              >
                <Link href="/projects/new" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                  上传截图
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SectionCard>
              <SectionCard
                title="先补设计师档案"
                description="完善你的职位、年限、优势和目标岗位，这会影响 AI 生成的自我定位与表达重心。"
              >
                <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                  去设计师档案
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </SectionCard>
            </div>

            <SectionCard
              title="工具"
              description="这些入口更像辅助工具，不属于工作台主流程，但你随时都可以使用。"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Link
                  href="/score"
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
                >
                  <Star className="h-4 w-4 text-neutral-900" />
                  <p className="mt-3 text-sm font-medium text-neutral-900">先给作品集打分</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    如果你已经有现成作品集，可以先做一次评分，判断现在是否已经拿得出手。
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-900">
                    先给我的作品集打分
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </SectionCard>
          </div>
        ) : (
          <div className="space-y-6">
            <SectionCard
              title="继续上一次整理"
              description="这是工作台首页的主任务区块。先回到最近一个项目的下一步，不需要重新找入口。"
            >
              {recentProject ? (
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div>
                        <p className="text-xl font-semibold text-neutral-900">{recentProject.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          最近更新于 {formatProjectDate(recentProject.updatedAt)}
                        </p>
                      </div>
                      <Badge variant={(PROJECT_STATUS_LABEL[recentProject.importStatus] ?? PROJECT_STATUS_LABEL.DRAFT).variant}>
                        {(PROJECT_STATUS_LABEL[recentProject.importStatus] ?? PROJECT_STATUS_LABEL.DRAFT).label}
                      </Badge>
                    </div>

                    <div className="inline-flex rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">下一步动作</p>
                        <p className="mt-1 text-sm font-medium text-neutral-900">
                          {getProjectContinuePath(recentProject).label}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button asChild className="h-12 rounded-xl px-6">
                    <Link href={getProjectContinuePath(recentProject).href}>
                      {getProjectContinuePath(recentProject).label}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </SectionCard>

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionCard title="最近一次评分" description="评分记录是辅助信息块，用来回到诊断结果，不与主任务区块同权竞争。">
                {latestScore ? (
                  <div className="space-y-4">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-semibold tracking-tight text-neutral-900">
                        {latestScoreDisplayTotal}
                      </span>
                      <span className="pb-1 text-sm text-neutral-400">/100</span>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <p className="text-sm font-medium text-neutral-900">
                        {latestScoreLevel
                          ? PORTFOLIO_SCORE_LEVEL_CONFIG[latestScoreLevel].label
                          : "评分已生成"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">生成于 {formatProjectDate(latestScore.createdAt)}</p>
                    </div>
                    <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                      <Link href={`/score/${latestScore.id}`}>
                        查看评分结果
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm leading-6 text-neutral-500">你还没有登录后的评分记录。可以先给现有作品集打分，再决定是否继续整理。</p>
                    <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                      <Link href="/score">
                        先给我的作品集打分
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </SectionCard>

              <SectionCard title="当前套餐状态" description="权益决定你能否查看完整评分结果、导出 PDF 和发布在线链接。">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <p className="text-sm font-medium text-neutral-900">{planCopy.title}</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-500">{planCopy.description}</p>
                    {userPlan?.expiresAt ? (
                      <p className="mt-2 text-xs text-neutral-400">有效期至 {formatProjectDate(userPlan.expiresAt)}</p>
                    ) : null}
                  </div>
                  <Button asChild variant="outline" className="h-11 rounded-xl px-5">
                    <Link href="/pricing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      查看套餐与权益
                    </Link>
                  </Button>
                </div>
              </SectionCard>

              <SectionCard title="快捷入口" description="这里只保留高频入口；完整项目管理请进入“我的项目”页面。">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <Link href="/projects/new" className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100">
                    <PlusCircle className="h-4 w-4 text-neutral-900" />
                    <p className="mt-3 text-sm font-medium text-neutral-900">新建项目</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">从 Figma 链接或截图开始整理作品集。</p>
                  </Link>
                  <Link href="/projects" className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100">
                    <FileText className="h-4 w-4 text-neutral-900" />
                    <p className="mt-3 text-sm font-medium text-neutral-900">查看全部项目</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">集中管理全部项目，不依赖工作台首页的最近项目。</p>
                  </Link>
                  <Link href={latestScore ? `/score/${latestScore.id}` : "/score"} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100">
                    <Star className="h-4 w-4 text-neutral-900" />
                    <p className="mt-3 text-sm font-medium text-neutral-900">查看评分结果</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">先看当前作品集有没有明显短板，再决定是否继续整理。</p>
                  </Link>
                  <Link href="/profile" className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100">
                    <User className="h-4 w-4 text-neutral-900" />
                    <p className="mt-3 text-sm font-medium text-neutral-900">去设计师档案</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">完善职位、经验和目标岗位，影响 AI 的表达重心。</p>
                  </Link>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

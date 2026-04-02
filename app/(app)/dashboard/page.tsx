import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { FileText, Clock3, ArrowRight, PlusCircle, CreditCard, Star, User } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  IMPORTING: { label: "导入中", variant: "outline" },
  IMPORTED: { label: "已导入", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
};

const SCORE_LABEL: Record<string, string> = {
  READY: "可直接投递",
  NEEDS_IMPROVEMENT: "建议改进后投递",
  NOT_READY: "暂不建议投递",
};

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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getContinuePath(project: {
  id: string;
  facts: { updatedAt: Date } | null;
  outlines: Array<{ id: string; updatedAt: Date }>;
  drafts: Array<{ id: string; updatedAt: Date; status: string }>;
}) {
  const latestDraft = project.drafts[0];
  if (latestDraft) {
    return {
      href: `/projects/${project.id}/editor?did=${latestDraft.id}`,
      label: "继续编辑草稿",
    };
  }

  const latestOutline = project.outlines[0];
  if (latestOutline) {
    return {
      href: `/projects/${project.id}/outline?oid=${latestOutline.id}`,
      label: "继续确认大纲",
    };
  }

  if (project.facts) {
    return {
      href: `/projects/${project.id}/facts`,
      label: "继续补充项目事实",
    };
  }

  return {
    href: `/projects/${project.id}/assets`,
    label: "继续确认素材",
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [projects, latestScore, userPlan] = await Promise.all([
    db.project.findMany({
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
    db.userPlan.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { planType: true, expiresAt: true },
    }),
  ]);

  const recentProject = projects[0] ?? null;
  const currentPlan = userPlan?.planType ?? "FREE";
  const planCopy = PLAN_COPY[currentPlan] ?? PLAN_COPY.FREE;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        eyebrow="Workspace"
        title="工作台首页"
        description="从这里继续你上一次的评分、项目整理和发布动作，不需要重新找入口。"
        actions={
          <Button asChild className="h-11 rounded-xl px-5">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              新建项目
            </Link>
          </Button>
        }
      />

      <div className="mt-8">
        {projects.length === 0 ? (
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
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard title="最近一次编辑" description="继续回到上一次最接近产出的步骤。">
                {recentProject ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-neutral-900">{recentProject.name}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          最近更新于 {formatDate(recentProject.updatedAt)}
                        </p>
                      </div>
                      <Badge variant={(STATUS_LABEL[recentProject.importStatus] ?? STATUS_LABEL.DRAFT).variant}>
                        {(STATUS_LABEL[recentProject.importStatus] ?? STATUS_LABEL.DRAFT).label}
                      </Badge>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <p className="text-xs text-neutral-500">下一步</p>
                      <p className="mt-1 text-sm font-medium text-neutral-900">
                        {getContinuePath(recentProject).label}
                      </p>
                    </div>
                    <Button asChild className="h-11 rounded-xl px-5">
                      <Link href={getContinuePath(recentProject).href}>
                        {getContinuePath(recentProject).label}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard title="最近一次评分" description="先判断现在这份作品集是否拿得出手，再决定是否继续整理。">
                {latestScore ? (
                  <div className="space-y-4">
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-semibold tracking-tight text-neutral-900">{latestScore.totalScore}</span>
                      <span className="pb-1 text-sm text-neutral-400">/100</span>
                    </div>
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                      <p className="text-sm font-medium text-neutral-900">{SCORE_LABEL[latestScore.level] ?? "评分已生成"}</p>
                      <p className="mt-1 text-xs text-neutral-500">生成于 {formatDate(latestScore.createdAt)}</p>
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
                        开始评分
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
                      <p className="mt-2 text-xs text-neutral-400">有效期至 {formatDate(userPlan.expiresAt)}</p>
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

              <SectionCard title="快捷入口" description="常用动作集中在这里，帮助你快速继续而不是重新开始。">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Link href="/projects/new" className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100">
                    <PlusCircle className="h-4 w-4 text-neutral-900" />
                    <p className="mt-3 text-sm font-medium text-neutral-900">新建项目</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">从 Figma 链接或截图开始整理作品集。</p>
                  </Link>
                  <Link href={recentProject ? getContinuePath(recentProject).href : "/projects/new"} className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100">
                    <FileText className="h-4 w-4 text-neutral-900" />
                    <p className="mt-3 text-sm font-medium text-neutral-900">继续上次编辑</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">回到最近一个项目的下一步，不丢上下文。</p>
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

            <SectionCard
              title="我的项目"
              description={`共 ${projects.length} 个项目。所有项目卡片都直接落到当前可继续的真实步骤。`}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => {
                  const status = STATUS_LABEL[project.importStatus] ?? STATUS_LABEL.DRAFT;
                  const nextStep = getContinuePath(project);

                  return (
                    <Link
                      key={project.id}
                      href={nextStep.href}
                      className="group rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-sm"
                    >
                      <div className="flex h-32 items-center justify-center rounded-xl bg-neutral-50 transition-colors group-hover:bg-neutral-100">
                        <FileText className="h-8 w-8 text-neutral-300" />
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900">{project.name}</p>
                          <p className="mt-1 text-xs text-neutral-400">{formatDate(project.updatedAt)}</p>
                        </div>
                        <Badge variant={status.variant} className="shrink-0 text-xs">
                          {status.label}
                        </Badge>
                      </div>

                      <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">继续路径</p>
                        <p className="mt-1 text-sm font-medium text-neutral-800">{nextStep.label}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {project._count.assets} 张素材
                          {project.facts ? " · 已补充项目事实" : ""}
                          {project.outlines.length > 0 ? " · 已生成大纲" : ""}
                          {project.drafts.length > 0 ? " · 已生成草稿" : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, FileText, PlusCircle } from "lucide-react";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import {
  formatProjectDate,
  getProjectContinuePath,
  getProjectStageSummary,
} from "@/lib/project-workflow";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { ProjectsCollection } from "@/components/app/ProjectsCollection";

export default async function ProjectsPage() {
  const session = await getRequiredSession("/projects");

  const projects = await db.project.findMany({
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
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        eyebrow="Projects"
        title="我的项目"
        description="这里集中查看和管理当前账号下的全部项目。工作台首页只负责帮你回到最近上下文，不替代完整项目列表。"
        actions={
          <Button asChild className="h-11 rounded-none px-5">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              新建项目
            </Link>
          </Button>
        }
      />

      <div className="mt-8">
        {projects.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6 text-neutral-400" />}
            title="你还没有项目"
            description="项目不会丢，也不会被新的入口顶掉。先导入第一个真实项目，后面都可以在这里集中查看和继续。"
            action={
              <Button asChild className="h-11 rounded-none px-5">
                <Link href="/projects/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  导入第一个项目
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="border border-neutral-300 bg-white/88 px-6 py-5 backdrop-blur-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">全部项目</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    共 {projects.length} 个项目，按最近更新时间倒序排列。每张卡片都会直接落到当前可继续的真实步骤。
                  </p>
                </div>
                {projects[0] ? (
                  <Link
                    href={getProjectContinuePath(projects[0]).href}
                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900"
                  >
                    继续最近项目：{projects[0].name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>

            <ProjectsCollection
              projects={projects.map((project) => ({
                id: project.id,
                name: project.name,
                updatedAt: formatProjectDate(project.updatedAt),
                importStatus: project.importStatus,
                nextStep: getProjectContinuePath(project),
                stageSummary: getProjectStageSummary(project),
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

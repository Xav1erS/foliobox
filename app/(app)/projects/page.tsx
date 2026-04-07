import Link from "next/link";
import { ArrowRight, FileText, PlusCircle } from "lucide-react";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
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
  });

  return (
    <div className="px-6 py-10">
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

      {/* 2px structural divider */}
      <div className="mt-6 -mx-6 border-t-2 border-black" />

      <div className="mt-6">
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
          <div>
            {/* Meta row */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                全部项目 · {projects.length} 个
              </p>
              {projects[0] ? (
                <Link
                  href={getProjectContinuePath(projects[0]).href}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  继续最近：{projects[0].name}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : null}
            </div>

            <ProjectsCollection
              projects={projects.map((project) => ({
                id: project.id,
                name: project.name,
                updatedAt: formatProjectDate(project.updatedAt),
                importStatus: project.importStatus,
                stage: project.stage,
                nextStep: getProjectContinuePath(project),
                stageSummary: getProjectStageSummary(project),
                coverImageUrl: project.assets[0]
                  ? buildPrivateBlobProxyUrl(project.assets[0].imageUrl)
                  : null,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

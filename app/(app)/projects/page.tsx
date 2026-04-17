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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProjectsCollection } from "@/components/app/ProjectsCollection";
import { CreateProjectDialog } from "@/components/app/CreateProjectDialog";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession("/projects");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const createRequested = resolvedSearchParams?.create === "1";

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
    <div className="mx-auto max-w-[1480px] px-6 py-10">
      <PageHeader
        eyebrow="Projects"
        title="我的项目"
        description="这里集中管理全部项目对象。新建项目会直接进入编辑器，后续素材、事实和排版都在项目内完成。"
        actions={
          <CreateProjectDialog defaultOpen={createRequested}>
            <Button className="h-11 px-5">
              <PlusCircle className="mr-2 h-4 w-4" />
              新建项目
            </Button>
          </CreateProjectDialog>
        }
      />

      {/* 2px structural divider */}
      <div className="app-section-divider mt-6 -mx-6" />

      <div className="mt-6">
        {projects.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6 text-white/44" />}
            title="你还没有项目"
            description="先输入项目名称进入编辑器，再逐步补素材、项目事实和风格参考。后续所有项目都会集中收在这里。"
            action={
              <CreateProjectDialog defaultOpen={createRequested}>
                <Button className="h-11 px-5">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  新建第一个项目
                </Button>
              </CreateProjectDialog>
            }
          />
        ) : (
          <div className="space-y-6">
            <Card className="app-panel">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-0.5 font-mono text-xs">
                      全部项目
                    </Badge>
                    <span className="text-sm text-muted-foreground">{projects.length} 个对象</span>
                  </div>
                    <p className="max-w-2xl text-sm leading-6 text-white/52">
                    这里保留完整项目池。项目一旦创建，就会沿着同一条 editor 主链路继续整理，不再拆成旧多步骤页面。
                  </p>
                </div>
                {projects[0] ? (
                  <Button asChild variant="outline" className="h-10 px-4">
                    <Link href={getProjectContinuePath(projects[0]).href}>
                      继续最近：{projects[0].name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Separator />
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

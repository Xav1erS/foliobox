"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PROJECT_STATUS_LABEL, PROJECT_STAGE_LABEL } from "@/lib/project-workflow";

type ProjectCard = {
  id: string;
  name: string;
  updatedAt: string;
  importStatus: string;
  stage?: string;
  nextStep: { href: string; label: string };
  stageSummary: string;
  coverImageUrl: string | null;
};

export function ProjectsCollection({
  projects,
}: {
  projects: ProjectCard[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(projectId: string, projectName: string) {
    const confirmed = window.confirm(`确认删除「${projectName}」吗？该操作不可恢复。`);
    if (!confirmed) return;

    setDeletingId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert("删除失败，请稍后重试。");
        return;
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      window.alert("删除失败，请稍后重试。");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const status =
          project.stage && project.stage !== "DRAFT"
            ? (PROJECT_STAGE_LABEL[project.stage] ?? PROJECT_STATUS_LABEL.DRAFT)
            : (PROJECT_STATUS_LABEL[project.importStatus] ?? PROJECT_STATUS_LABEL.DRAFT);
        const deleting = deletingId === project.id;

        return (
          <Card
            key={project.id}
            className="app-panel group overflow-hidden transition-all hover:-translate-y-0.5 hover:border-border"
          >
            <div className="relative h-40 overflow-hidden border-b border-border bg-secondary">
              {project.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.coverImageUrl}
                  alt={`${project.name} 封面`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-4xl font-semibold text-white/10">
                    {project.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-snug text-white/94">
                    {project.name}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-white/40">{project.updatedAt}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 px-2 py-0.5 text-xs font-medium">
                  {status.label}
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-[11px] font-medium text-white/40">
                    下一步
                  </p>
                  <p className="mt-1 text-sm text-white/84">
                    {project.nextStep.label}
                  </p>
                </div>
                {project.stageSummary ? (
                  <p className="text-sm leading-6 text-white/52">{project.stageSummary}</p>
                ) : null}
              </div>
            </CardContent>

            <Separator />

            <CardFooter className="flex items-center justify-between p-4">
              <Button asChild variant="ghost" className="h-9 px-0 text-sm font-medium text-white/84 hover:bg-transparent hover:text-white">
                <Link href={project.nextStep.href}>
                  继续编辑
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(project.id, project.name)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-secondary text-white/54 transition-colors hover:bg-accent hover:text-white/80 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

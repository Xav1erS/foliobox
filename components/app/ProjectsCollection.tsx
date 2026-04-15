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
            className="group overflow-hidden border-border/70 bg-card/95 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative h-40 overflow-hidden border-b border-neutral-200 bg-neutral-100">
              {project.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.coverImageUrl}
                  alt={`${project.name} 封面`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-4xl font-semibold text-neutral-200">
                    {project.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold leading-snug text-card-foreground">
                    {project.name}
                  </p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">{project.updatedAt}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-md px-2 py-0.5 font-mono text-xs">
                  {status.label}
                </Badge>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
                    下一步
                  </p>
                  <p className="mt-1 text-sm text-foreground/88">
                    {project.nextStep.label}
                  </p>
                </div>
                {project.stageSummary ? (
                  <p className="text-sm leading-6 text-muted-foreground">{project.stageSummary}</p>
                ) : null}
              </div>
            </CardContent>

            <Separator />

            <CardFooter className="flex items-center justify-between p-4">
              <Button asChild variant="ghost" className="h-9 px-0 text-sm font-medium text-foreground hover:bg-transparent hover:text-foreground">
                <Link href={project.nextStep.href}>
                  继续编辑
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(project.id, project.name)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
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

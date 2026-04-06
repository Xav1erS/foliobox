"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ArrowRight, FileText, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_LABEL, PROJECT_STAGE_LABEL } from "@/lib/project-workflow";

type ProjectCard = {
  id: string;
  name: string;
  updatedAt: string;
  importStatus: string;
  stage?: string;
  nextStep: { href: string; label: string };
  stageSummary: string;
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
          <div
            key={project.id}
            className="border border-neutral-300 bg-white/88 p-5 backdrop-blur-sm transition-colors hover:border-neutral-400 hover:bg-white"
          >
            <div className="flex h-32 items-center justify-center border border-neutral-300 bg-neutral-100/85">
              <FileText className="h-8 w-8 text-neutral-300" />
            </div>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-neutral-900">{project.name}</p>
                <p className="mt-1 text-xs text-neutral-400">{project.updatedAt}</p>
              </div>
              <Badge variant={status.variant} className="shrink-0 rounded-none text-xs">
                {status.label}
              </Badge>
            </div>

            <div className="mt-4 border border-neutral-300 bg-neutral-100/85 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">下一步</p>
              <p className="mt-1 text-sm font-medium text-neutral-800">{project.nextStep.label}</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">{project.stageSummary}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button asChild className="h-10 flex-1 rounded-none px-4">
                <Link href={project.nextStep.href}>
                  继续
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-none px-3"
                disabled={deleting}
                onClick={() => handleDelete(project.id, project.name)}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
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
          <div
            key={project.id}
            className="group border border-neutral-300 bg-white/88 backdrop-blur-sm transition-colors hover:bg-white"
          >
            {/* Cover image */}
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

            {/* Info */}
            <div className="px-4 pt-4 pb-3">
              {/* Name row */}
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-[15px] font-semibold text-neutral-900 leading-snug">
                  {project.name}
                </p>
                <span className="shrink-0 border border-neutral-200 px-2 py-0.5 text-xs font-mono text-neutral-500">
                  {status.label}
                </span>
              </div>
              <p className="mt-1 text-xs font-mono text-neutral-400">{project.updatedAt}</p>

              {/* Next step */}
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <p className="text-xs text-neutral-400">
                  <span className="mr-1 text-neutral-300">—</span>
                  {project.nextStep.label}
                </p>
                {project.stageSummary ? (
                  <p className="mt-0.5 text-xs leading-5 text-neutral-400">{project.stageSummary}</p>
                ) : null}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center border-t border-neutral-200 px-4 py-3">
              <Link
                href={project.nextStep.href}
                className="flex flex-1 items-center gap-1.5 text-sm font-medium text-neutral-900 hover:text-neutral-600"
              >
                继续
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(project.id, project.name)}
                className="flex h-8 w-8 items-center justify-center text-neutral-300 transition-colors hover:text-neutral-600 disabled:opacity-40"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

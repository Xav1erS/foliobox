import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { ProjectStructureWorkbench } from "@/components/editor/ProjectStructureWorkbench";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";

export default async function ProjectStructurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/structure`);

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      layoutJson: true,
    },
  });

  if (!project) notFound();

  const layout = project.layoutJson as LayoutJson | null;
  const boards = layout?.editorScene?.boards ?? [];
  const hasExistingBoards =
    boards.length > 1 ||
    boards.some((board) => Array.isArray(board.nodes) && board.nodes.length > 0);

  return (
    <ProjectStructureWorkbench
      projectId={project.id}
      projectName={project.name}
      initialStructureDraft={layout?.structureSuggestion ?? null}
      initialMaterialRecognition={layout?.materialRecognition ?? null}
      initialHasExistingBoards={hasExistingBoards}
    />
  );
}

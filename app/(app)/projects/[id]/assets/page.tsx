import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/required-session";
import { AssetsClient } from "./AssetsClient";

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/assets`);

  const project = await db.project.findUnique({
    where: { id, userId: session.user.id },
    include: {
      assets: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-xs text-neutral-400">{project.name}</p>
        <h1 className="text-xl font-semibold text-neutral-900">选择展示页</h1>
        <p className="mt-1 text-sm text-neutral-500">
          勾选要展示的设计稿页面，调整顺序，设置封面。
        </p>
      </div>

      <AssetsClient
        projectId={id}
        sourceType={project.sourceType}
        initialAssets={project.assets.map((a) => ({
          id: a.id,
          imageUrl: a.imageUrl,
          title: a.title ?? "",
          selected: a.selected,
          sortOrder: a.sortOrder,
          isCover: a.isCover,
        }))}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getRequiredSession } from "@/lib/required-session";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { OutlineClient } from "./OutlineClient";

export default async function OutlinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oid?: string }>;
}) {
  const { id } = await params;
  const { oid } = await searchParams;

  if (!oid) notFound();

  const session = await getRequiredSession(
    `/projects/${id}/outline?oid=${encodeURIComponent(oid)}`
  );

  const [outline, rawAssets] = await Promise.all([
    db.portfolioOutline.findUnique({
      where: { id: oid, userId: session.user.id },
      include: { projects: { select: { id: true, name: true } } },
    }),
    db.projectAsset.findMany({
      where: { projectId: id, selected: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, imageUrl: true, title: true, isCover: true },
    }),
  ]);

  if (!outline) notFound();

  const projectName = outline.projects[0]?.name ?? "";
  const assets = rawAssets.map((a) => ({
    ...a,
    imageUrl: buildPrivateBlobProxyUrl(a.imageUrl),
    title: a.title ?? "",
  }));

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <p className="mb-1 text-xs text-neutral-400">{projectName}</p>
        <h1 className="text-xl font-semibold text-neutral-900">确认作品集大纲</h1>
        <p className="mt-1 text-sm text-neutral-500">
          确认板块结构、风格方向与封面图，再开始生成初稿。
        </p>
      </div>

      <OutlineClient
        outlineId={oid}
        projectId={id}
        initialSectionsJson={outline.sectionsJson as unknown as OutlineSectionsJson}
        initialTheme={outline.overallTheme}
        totalEstimatedPages={outline.totalEstimatedPages}
        assets={assets}
      />
    </div>
  );
}

export interface OutlineSection {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  estimatedPages: number;
  focus?: string[];
}

export interface OutlineSectionsJson {
  projectDisplayName?: string;
  totalEstimatedPages?: number;
  sections: OutlineSection[];
}

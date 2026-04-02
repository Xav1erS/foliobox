import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditorClient } from "./EditorClient";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ did?: string }>;
}) {
  const { id } = await params;
  const { did } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!did) notFound();

  const [draft, project, rawAssets] = await Promise.all([
    db.portfolioDraft.findUnique({ where: { id: did, userId: session.user.id } }),
    db.project.findUnique({ where: { id, userId: session.user.id } }),
    db.projectAsset.findMany({
      where: { projectId: id, selected: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, imageUrl: true, title: true },
    }),
  ]);

  if (!draft || !project) notFound();

  const assets = rawAssets.map((a) => ({ ...a, title: a.title ?? "" }));

  return (
    <EditorClient
      draftId={did}
      projectId={id}
      projectName={project.name}
      initialContentJson={draft.contentJson as unknown as DraftContentJson}
      assets={assets}
    />
  );
}

export interface Block {
  id: string;
  type:
    | "hero"
    | "section_heading"
    | "rich_text"
    | "bullet_list"
    | "stat_group"
    | "image_single"
    | "image_grid"
    | "caption"
    | "quote"
    | "divider"
    | "closing";
  data: Record<string, unknown>;
}

export interface Page {
  id: string;
  title: string;
  blocks: Block[];
}

export interface DraftContentJson {
  pages: Page[];
}

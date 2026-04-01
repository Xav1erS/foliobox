import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FactsForm } from "./FactsForm";

export default async function FactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await db.project.findUnique({ where: { id, userId: session.user.id } });
  if (!project) notFound();

  const facts = await db.projectFact.findUnique({ where: { projectId: id } });

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <p className="mb-1 text-xs text-neutral-400">{project.name}</p>
        <h1 className="text-xl font-semibold text-neutral-900">项目事实</h1>
        <p className="mt-1 text-sm text-neutral-500">
          这些信息是 AI 生成作品集的核心依据。填写越完整，生成质量越高。
        </p>
      </div>

      <FactsForm projectId={id} initialFacts={facts} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import {
  getEntitlementSummary,
  getProjectActionSummary,
  getPlanSummaryFromEntitlement,
} from "@/lib/entitlement";
import { ProjectEditorClient, type ProjectEditorInitialData } from "./ProjectEditorClient";

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/editor`);

  const [project, entitlementSummary, actionSummary, styleReferenceSets] = await Promise.all([
    db.project.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        sourceType: true,
        sourceUrl: true,
        stage: true,
        importStatus: true,
        packageMode: true,
        boundaryJson: true,
        completenessJson: true,
        packageJson: true,
        layoutJson: true,
        updatedAt: true,
        facts: {
          select: {
            projectType: true,
            industry: true,
            roleTitle: true,
            background: true,
            resultSummary: true,
          },
        },
        assets: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            imageUrl: true,
            title: true,
            selected: true,
            isCover: true,
          },
        },
      },
    }),
    getEntitlementSummary(session.user.id),
    getProjectActionSummary(session.user.id, id),
    db.styleReferenceSet.findMany({
      where: { userId: session.user.id },
      orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        imageUrls: true,
      },
    }),
  ]);

  if (!project) notFound();

  const initialData: ProjectEditorInitialData = {
    id: project.id,
    name: project.name,
    sourceType: project.sourceType,
    sourceUrl: project.sourceUrl,
    stage: project.stage,
    importStatus: project.importStatus,
    packageMode: project.packageMode,
    updatedAt: project.updatedAt.toISOString(),
    facts: {
      projectType: project.facts?.projectType ?? "",
      industry: project.facts?.industry ?? "",
      roleTitle: project.facts?.roleTitle ?? "",
      background: project.facts?.background ?? "",
      resultSummary: project.facts?.resultSummary ?? "",
    },
    assets: project.assets,
    boundaryAnalysis: project.boundaryJson as ProjectEditorInitialData["boundaryAnalysis"],
    completenessAnalysis:
      project.completenessJson as ProjectEditorInitialData["completenessAnalysis"],
    packageRecommendation:
      project.packageJson as ProjectEditorInitialData["packageRecommendation"],
    layout: project.layoutJson as ProjectEditorInitialData["layout"],
    actionSummary,
    styleReferenceSets,
  };

  return (
    <ProjectEditorClient
      initialData={initialData}
      planSummary={getPlanSummaryFromEntitlement(entitlementSummary)}
    />
  );
}

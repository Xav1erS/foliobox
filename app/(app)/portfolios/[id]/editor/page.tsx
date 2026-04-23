import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import {
  getEntitlementSummary,
  getPortfolioActionSummary,
  getPlanSummaryFromEntitlement,
} from "@/lib/entitlement";
import {
  resolvePortfolioEditorState,
  type PortfolioDiagnosis,
  type PortfolioPackagingContent,
  type PortfolioProjectAdmission,
  type PortfolioValidation,
  resolvePortfolioPackagingContent,
} from "@/lib/portfolio-editor";
import {
  resolvePortfolioProjectAdmissions,
  validatePortfolioPackaging,
} from "@/lib/portfolio-editor-validation";
import {
  PortfolioEditorClient,
  type PortfolioEditorInitialData,
} from "./PortfolioEditorClient";

export default async function PortfolioEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/portfolios/${id}/editor`);

  const [portfolio, allProjects, entitlementSummary, actionSummary, styleReferenceSets] = await Promise.all([
    db.portfolio.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        status: true,
        projectIds: true,
        outlineJson: true,
        contentJson: true,
        updatedAt: true,
      },
    }),
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        stage: true,
        packageMode: true,
        updatedAt: true,
        layoutJson: true,
        facts: {
          select: {
            background: true,
            resultSummary: true,
          },
        },
      },
    }),
    getEntitlementSummary(session.user.id),
    getPortfolioActionSummary(session.user.id, id),
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

  if (!portfolio) notFound();

  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);
  const packaging = resolvePortfolioPackagingContent(portfolio.contentJson);
  const portfolioProjects = allProjects.map((project) => ({
    id: project.id,
    name: project.name,
    stage: project.stage,
    packageMode: project.packageMode,
    updatedAt: project.updatedAt.toISOString(),
    layoutJson: project.layoutJson,
    layout: project.layoutJson as { narrativeSummary?: string; totalPages?: number } | null,
    background: project.facts?.background ?? null,
    resultSummary: project.facts?.resultSummary ?? null,
  }));
  const admissionsByProjectId = new Map(
    resolvePortfolioProjectAdmissions(portfolioProjects).map((item) => [item.projectId, item])
  );
  const validation = validatePortfolioPackaging({
    selectedProjectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    projects: portfolioProjects,
    packaging,
  });

  const initialData: PortfolioEditorInitialData = {
    id: portfolio.id,
    name: portfolio.name,
    status: portfolio.status,
    updatedAt: portfolio.updatedAt.toISOString(),
    selectedProjectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    diagnosis: editorState.diagnosis as PortfolioDiagnosis | null,
    packaging: packaging as PortfolioPackagingContent | null,
    validation: validation as PortfolioValidation | null,
    allProjects: portfolioProjects.map((project) => ({
      id: project.id,
      name: project.name,
      stage: project.stage,
      packageMode: project.packageMode,
      updatedAt: project.updatedAt,
      layout: project.layout,
      background: project.background,
      resultSummary: project.resultSummary,
      admission: admissionsByProjectId.get(project.id) as PortfolioProjectAdmission,
    })),
    packagingQuota: entitlementSummary.quotas.portfolioPackagings,
    actionSummary,
    styleReferenceSets,
  };

  return (
    <PortfolioEditorClient
      initialData={initialData}
      planSummary={getPlanSummaryFromEntitlement(entitlementSummary)}
    />
  );
}

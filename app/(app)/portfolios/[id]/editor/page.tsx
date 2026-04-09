import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import {
  getEntitlementSummary,
  getPlanSummaryFromEntitlement,
} from "@/lib/entitlement";
import {
  resolvePortfolioEditorState,
  type PortfolioDiagnosis,
  type PortfolioPackagingContent,
} from "@/lib/portfolio-editor";
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

  const [portfolio, allProjects, entitlementSummary] = await Promise.all([
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
  ]);

  if (!portfolio) notFound();

  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);

  const initialData: PortfolioEditorInitialData = {
    id: portfolio.id,
    name: portfolio.name,
    status: portfolio.status,
    updatedAt: portfolio.updatedAt.toISOString(),
    selectedProjectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    diagnosis: editorState.diagnosis as PortfolioDiagnosis | null,
    packaging: portfolio.contentJson as PortfolioPackagingContent | null,
    allProjects: allProjects.map((project) => ({
      id: project.id,
      name: project.name,
      stage: project.stage,
      packageMode: project.packageMode,
      updatedAt: project.updatedAt.toISOString(),
      layout: project.layoutJson as { narrativeSummary?: string; totalPages?: number } | null,
      background: project.facts?.background ?? null,
      resultSummary: project.facts?.resultSummary ?? null,
    })),
    packagingQuota: entitlementSummary.quotas.portfolioPackagings,
  };

  return (
    <PortfolioEditorClient
      initialData={initialData}
      planSummary={getPlanSummaryFromEntitlement(entitlementSummary)}
    />
  );
}


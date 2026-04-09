import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getEntitlementSummary,
  getPortfolioActionSummary,
} from "@/lib/entitlement";
import {
  findReusableGeneratedDraft,
  hashGenerationInput,
  writePrecheckLog,
} from "@/lib/generation-precheck";
import { resolvePortfolioEditorState } from "@/lib/portfolio-editor";
import {
  resolveStyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    styleSelection?: StyleReferenceSelection | null;
  };
  const styleSelection = body.styleSelection ?? { source: "none" as const };
  const styleProfile = resolveStyleProfile(styleSelection);
  const { id } = await params;

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      projectIds: true,
      outlineJson: true,
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [entitlementSummary, portfolioActionSummary, selectedProjects] = await Promise.all([
    getEntitlementSummary(session.user.id),
    getPortfolioActionSummary(session.user.id, portfolio.id),
    db.project.findMany({
      where: { id: { in: portfolio.projectIds }, userId: session.user.id },
      select: {
        id: true,
        layoutJson: true,
        packageMode: true,
      },
    }),
  ]);

  const actionType = portfolioActionSummary.packagingGenerations.used > 0
    ? "portfolio_packaging_regeneration"
    : "portfolio_packaging_generation";
  const actionQuota =
    actionType === "portfolio_packaging_regeneration"
      ? portfolioActionSummary.packagingRegenerations
      : portfolioActionSummary.packagingGenerations;
  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);
  const requestHash = hashGenerationInput({
    actionType,
    portfolioId: portfolio.id,
    projectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    selectedProjects,
    styleSelection,
  });
  const reusable = await findReusableGeneratedDraft({
    userId: session.user.id,
    objectType: "portfolio",
    objectId: portfolio.id,
    requestHash,
    draftType: "packaging",
  });

  const suggestedMode = reusable ? "reuse" : actionQuota.remaining <= 0 ? "block" : "continue";

  await writePrecheckLog({
    userId: session.user.id,
    objectType: "portfolio",
    objectId: portfolio.id,
    actionType,
    budgetStatus: actionQuota.remaining <= 1 ? "near_limit" : "healthy",
    suggestedMode,
    reusableDraftId: reusable?.draft.id,
  });

  return NextResponse.json({
    actionType,
    styleProfile,
    suggestedMode,
    consumesQuota: !reusable,
    failureCounts: false,
    activeProjectRemaining: entitlementSummary.quotas.activeProjects.remaining,
    actionRemaining: actionQuota.remaining,
    reusableDraftId: reusable?.draft.id ?? null,
    reusableTaskId: reusable?.task.id ?? null,
  });
}

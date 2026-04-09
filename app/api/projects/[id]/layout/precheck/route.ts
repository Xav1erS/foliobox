import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getEntitlementSummary,
  getProjectActionSummary,
} from "@/lib/entitlement";
import {
  findReusableGeneratedDraft,
  hashGenerationInput,
  writePrecheckLog,
} from "@/lib/generation-precheck";
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
  const { id: projectId } = await params;

  const project = await db.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: {
      id: true,
      packageMode: true,
      layoutJson: true,
      facts: true,
      assets: {
        where: { selected: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [entitlementSummary, projectActionSummary] = await Promise.all([
    getEntitlementSummary(session.user.id),
    getProjectActionSummary(session.user.id, projectId),
  ]);

  const isRegeneration = Boolean(project.layoutJson);
  const actionType = isRegeneration
    ? "project_layout_regeneration"
    : "project_layout_generation";
  const actionQuota = isRegeneration
    ? projectActionSummary.layoutRegenerations
    : projectActionSummary.layoutGenerations;
  const isProjectActivated =
    projectActionSummary.diagnoses.used +
      projectActionSummary.layoutGenerations.used +
      projectActionSummary.layoutRegenerations.used >
    0;

  const requestHash = hashGenerationInput({
    actionType,
    projectId,
    packageMode: project.packageMode,
    styleSelection,
    assetIds: project.assets.map((asset) => asset.id),
    facts: project.facts ?? {},
  });
  const reusable = await findReusableGeneratedDraft({
    userId: session.user.id,
    objectType: "project",
    objectId: projectId,
    requestHash,
    draftType: "layout",
  });

  const suggestedMode = reusable ? "reuse" : actionQuota.remaining <= 0 ? "block" : "continue";

  await writePrecheckLog({
    userId: session.user.id,
    objectType: "project",
    objectId: projectId,
    actionType,
    budgetStatus:
      !isProjectActivated && entitlementSummary.quotas.activeProjects.remaining <= 0
        ? "needs_topup"
        : actionQuota.remaining <= 1
          ? "near_limit"
          : "healthy",
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

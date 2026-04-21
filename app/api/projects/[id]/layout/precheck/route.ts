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
  GenerationScopeSchema,
  getPrototypeBoardIdsInScope,
  hasGeneratedLayoutData,
  resolveProjectEditorScene,
  serializeSceneForHash,
} from "@/lib/project-editor-scene";
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
    generationScope?: unknown;
  };
  const styleSelection = body.styleSelection ?? { source: "none" as const };
  const styleProfile = resolveStyleProfile(styleSelection);
  const parsedScope = GenerationScopeSchema.safeParse(body.generationScope);
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
        select: { id: true, title: true, isCover: true, metaJson: true },
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

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
  });
  const generationScope = parsedScope.success ? parsedScope.data : scene.generationScope;
  const scopedScene = {
    ...scene,
    generationScope,
  };
  const isRegeneration = hasGeneratedLayoutData(project.layoutJson);
  const actionType = isRegeneration
    ? "project_layout_regeneration"
    : "project_layout_generation";
  const actionQuota = isRegeneration
    ? projectActionSummary.layoutRegenerations
    : projectActionSummary.layoutGenerations;
  const isProjectActivated =
    projectActionSummary.layoutGenerations.used +
      projectActionSummary.layoutRegenerations.used >
    0;
  const prototypeBoardIds = getPrototypeBoardIdsInScope(scopedScene);
  const selectedBoardIds =
    generationScope.mode === "all"
      ? scene.boardOrder
      : generationScope.mode === "selected"
        ? generationScope.boardIds.filter((boardId) => scene.boardOrder.includes(boardId))
        : generationScope.boardIds.slice(0, 1);
  const skippedGeneratedBoardCount = selectedBoardIds.filter((boardId) => {
    const board = scene.boards.find((item) => item.id === boardId);
    return Boolean(board) && !prototypeBoardIds.includes(boardId) && !board?.locked;
  }).length;

  const requestHash = hashGenerationInput({
    actionType,
    projectId,
    packageMode: project.packageMode,
    styleSelection,
    assetIds: project.assets.map((asset) => asset.id),
    facts: project.facts ?? {},
    scene: serializeSceneForHash(scopedScene),
  });
  const reusable =
    prototypeBoardIds.length > 0
      ? await findReusableGeneratedDraft({
          userId: session.user.id,
          objectType: "project",
          objectId: projectId,
          requestHash,
          draftType: "layout",
        })
      : null;

  const blockReason = reusable
    ? null
    : prototypeBoardIds.length === 0
      ? null
    : !isProjectActivated && entitlementSummary.quotas.activeProjects.remaining <= 0
      ? "active_project_limit"
      : actionQuota.remaining <= 0
        ? "action_quota_exhausted"
        : null;
  const suggestedMode = reusable
    ? "reuse"
    : prototypeBoardIds.length === 0
      ? "skip"
      : blockReason
        ? "block"
        : "continue";
  const remainingAfterAction = reusable || prototypeBoardIds.length === 0
    ? actionQuota.remaining
    : Math.max(actionQuota.remaining - 1, 0);

  await writePrecheckLog({
    userId: session.user.id,
    objectType: "project",
    objectId: projectId,
    actionType,
    budgetStatus:
      prototypeBoardIds.length === 0
        ? "healthy"
        : !isProjectActivated && entitlementSummary.quotas.activeProjects.remaining <= 0
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
    isHighCostAction: true,
    actionLabel:
      actionType === "project_layout_regeneration" ? "重新生成排版" : "生成排版",
    suggestedMode,
    blockReason,
    consumesQuota: !reusable && prototypeBoardIds.length > 0,
    failureCounts: false,
    projectActivated: isProjectActivated,
    activeProjectRemaining: entitlementSummary.quotas.activeProjects.remaining,
    actionRemaining: actionQuota.remaining,
    remainingAfterAction,
    reusableDraftId: reusable?.draft.id ?? null,
    reusableTaskId: reusable?.task.id ?? null,
    generationScope,
    prototypeBoardCount: prototypeBoardIds.length,
    skippedGeneratedBoardCount,
  });
}

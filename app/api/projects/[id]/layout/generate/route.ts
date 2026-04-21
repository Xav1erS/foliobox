import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm";
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
  type StyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";
import {
  stampProjectValidationFailure,
  validateProjectEditorScene,
} from "@/lib/project-editor-validation";
import type {
  GeneratedLayoutPageSeed,
  ProjectBoard,
  ProjectEditorScene,
  ProjectLayoutValidation,
  ProjectMaterialRecognition,
  ProjectPageType,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";
import {
  applyGeneratedLayoutToScene,
  GenerationScopeSchema,
  getEffectiveGenerationBoardIds,
  MAX_PROJECT_BOARDS,
  getLockedBoardIdsInScope,
  getPrototypeBoardIdsInScope,
  hasGeneratedLayoutData,
  mergeProjectLayoutDocument,
  ProjectPageTypeSchema,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  serializeSceneForHash,
  summarizeProjectSceneForAI,
} from "@/lib/project-editor-scene";

// ─── Layout JSON schema ───────────────────────────────────────────────────────

const LayoutPageSchema = z.object({
  boardId: z.string(),
  pageNumber: z.number(),
  type: ProjectPageTypeSchema,
  titleSuggestion: z.string(),
  contentGuidance: z.string(),
  keyPoints: z.array(z.string()),
  assetHint: z.string().optional(),
  wordCountGuideline: z.string().optional(),
});

const LayoutJsonSchema = z.object({
  packageMode: z.enum(["DEEP", "LIGHT", "SUPPORTIVE"]),
  totalPages: z.number(),
  narrativeSummary: z.string(),
  pages: z.array(LayoutPageSchema),
  qualityNotes: z.array(z.string()),
});

export type LayoutJson = z.infer<typeof LayoutJsonSchema> & {
  styleProfile?: StyleProfile;
  validation?: ProjectLayoutValidation;
  editorScene?: ProjectEditorScene;
  materialRecognition?: ProjectMaterialRecognition;
  structureSuggestion?: ProjectStructureSuggestion;
  /** Setup 向导完成标记，只在用户点击"进入排版"时写入。 */
  setup?: { completedAt?: string | null };
};
export type LayoutPage = z.infer<typeof LayoutPageSchema>;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(project: {
  name: string;
  packageMode: string;
  assetCount: number;
  facts: Record<string, unknown> | null;
  styleSummary: string;
  sceneSummary: string;
  structureSummary: string;
  scopeLabel: string;
  boardPlanSummary: string;
}): string {
  const modeLabel =
    project.packageMode === "DEEP"
      ? "深讲（8–10页，完整呈现问题→方案→结果）"
      : project.packageMode === "LIGHT"
      ? "浅讲（3–5页，聚焦关键判断和核心成果）"
      : "补充展示（1–3页，以视觉展示为主）";

  const factsText = project.facts
    ? Object.entries(project.facts)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("、") : String(v)}`)
        .join("\n")
    : "（暂无项目事实数据）";

  return `你是一位资深作品集顾问，帮助设计师把已经确认好的项目原型画板，升级成高保真排版计划。

## 任务
当前项目已经完成结构确认，并已创建原型画板。
请基于当前原型范围，为每一张原型画板生成一份高保真排版计划。
你必须严格沿用当前原型画板的顺序和 boardId，一张原型对应一条计划，不能新增、删除或合并画板。

## 项目信息
项目名称：${project.name}
包装模式：${modeLabel}
已上传素材：${project.assetCount} 张

## 项目事实
${factsText}

## 风格约束
${project.styleSummary}

## 当前编辑画板摘要
本次生成范围：${project.scopeLabel}
${project.sceneSummary}

## 当前原型画板清单
${project.boardPlanSummary}

## 已有结构建议
${project.structureSummary}

## 要求
1. 严格按当前原型画板数量输出 pages；每条 pages 必须保留对应 boardId
2. page.type 必须从当前原型页型中选择，不要自造新页型
3. 每页给出：boardId、页面类型、标题建议、内容指导、3–5 个关键要点
4. 这是一份高保真排版计划：要帮助后续模板层决定主次、图文关系、信息密度与节奏，而不是重写结构
5. 给出一句话叙事摘要，说明这个项目的核心故事弧度
6. 给出 2–4 条质量提示，指出当前信息中可以加强的方向
7. 语言简洁专业，面向中国设计师

请输出 JSON，格式如下：
{
  "packageMode": "${project.packageMode}",
  "totalPages": <当前原型画板数>,
  "narrativeSummary": "<一句话描述项目叙事弧度>",
  "pages": [
    {
      "boardId": "<必须与输入里的 boardId 完全一致>",
      "pageNumber": 1,
      "type": "<沿用输入里已有的页型>",
      "titleSuggestion": "<页面标题建议>",
      "contentGuidance": "<这页应该呈现什么内容>",
      "keyPoints": ["要点1", "要点2", "要点3"],
      "assetHint": "<可选：建议用哪类素材>",
      "wordCountGuideline": "<可选：建议字数区间>"
    }
  ],
  "qualityNotes": ["提示1", "提示2"]
}`;
}

function buildBoardPlanSummary(boards: Array<{
  id: string;
  name: string;
  intent: string;
  pageType: ProjectPageType | null;
  structureSource?: {
    groupLabel?: string | null;
    sectionTitle?: string | null;
  } | null;
}>) {
  return boards
    .map((board, index) =>
      [
        `画板 ${index + 1}`,
        `boardId：${board.id}`,
        `页型：${board.pageType ?? "关键模块优化"}`,
        `名称：${board.name || "未命名"}`,
        board.structureSource?.groupLabel ? `结构分组：${board.structureSource.groupLabel}` : null,
        board.structureSource?.sectionTitle ? `结构章节：${board.structureSource.sectionTitle}` : null,
        `页面意图：${board.intent || "未填写"}`,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n")
    )
    .join("\n\n");
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: projectId } = await params;

  const body = (await request.json().catch(() => ({}))) as {
    styleSelection?: StyleReferenceSelection | null;
    generationScope?: unknown;
  };
  const styleSelection = body.styleSelection ?? { source: "none" as const };
  const parsedScope = GenerationScopeSchema.safeParse(body.generationScope);

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      name: true,
      stage: true,
      packageMode: true,
      layoutJson: true,
      facts: true,
      assets: {
        where: { selected: true },
        select: { id: true, title: true, isCover: true, sortOrder: true, metaJson: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!project.packageMode) {
    return NextResponse.json(
      { error: "包装模式未确认，请先完成骨架定稿" },
      { status: 400 }
    );
  }
  if (!["LAYOUT", "READY"].includes(project.stage)) {
    return NextResponse.json(
      { error: "项目尚未进入排版验收阶段" },
      { status: 400 }
    );
  }

  const [entitlementSummary, projectActionSummary] = await Promise.all([
    getEntitlementSummary(userId),
    getProjectActionSummary(userId, projectId),
  ]);

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const generationScope = parsedScope.success ? parsedScope.data : scene.generationScope;
  const scopedScene = {
    ...scene,
    generationScope,
  };
  // 锁定画板必须从 AI 写操作中显式跳过（参见 spec-system-v3/11 §9.4）。
  const lockedBoardIdsInScope = getLockedBoardIdsInScope(scopedScene);
  // 本次用户选择范围内、未锁定的画板。
  const effectiveBoardIds = getEffectiveGenerationBoardIds(scopedScene);
  if (effectiveBoardIds.length === 0) {
    return NextResponse.json(
      { error: "本次范围内所有画板都已锁定，没有可参与生成的画板" },
      { status: 400 }
    );
  }
  // 两阶段线性规则：已是 hi-fi 的画板不再参与本次生成，只显式跳过。
  const prototypeBoardIds = getPrototypeBoardIdsInScope(scopedScene);
  const skippedGeneratedBoardIds = effectiveBoardIds.filter(
    (boardId) => !prototypeBoardIds.includes(boardId)
  );
  // 单 Project 画板硬上限（参见 spec-system-v3/04 §4.5 与 spec-system-v3/09）。
  if (scopedScene.boards.length > MAX_PROJECT_BOARDS) {
    return NextResponse.json(
      {
        error: `单个项目的画板数量不能超过 ${MAX_PROJECT_BOARDS} 个，请先删减画板`,
      },
      { status: 400 }
    );
  }
  if (prototypeBoardIds.length === 0) {
    const layoutJson = mergeProjectLayoutDocument(project.layoutJson, {
      editorScene: scene,
    }) as LayoutJson;
    return NextResponse.json({
      layoutJson,
      skipped: true,
      skippedBoardIds: skippedGeneratedBoardIds,
      precheck: {
        suggestedMode: "skip",
        failureCounts: false,
        consumesQuota: false,
        reusableDraftId: null,
      },
    });
  }
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

  const styleProfile = resolveStyleProfile(styleSelection);
  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  if (styleSelection.source === "reference_set" && styleSelection.referenceSetId) {
    await db.styleReferenceSet.updateMany({
      where: { id: styleSelection.referenceSetId, userId },
      data: { lastUsedAt: new Date() },
    });
  }
  const requestHash = hashGenerationInput({
    actionType,
    projectId,
    packageMode: project.packageMode,
    styleSelection,
    assetIds: project.assets.map((asset) => asset.id),
    facts: project.facts ?? {},
    scene: serializeSceneForHash({
      ...scopedScene,
      generationScope: { mode: "selected", boardIds: prototypeBoardIds },
    }),
  });

  let reusable = await findReusableGeneratedDraft({
    userId,
    objectType: "project",
    objectId: projectId,
    requestHash,
    draftType: "layout",
  });

  let reusableLayoutJson: LayoutJson | null = null;
  if (reusable) {
    const candidateLayout = mergeProjectLayoutDocument(
      project.layoutJson,
      reusable.draft.contentJson as LayoutJson
    ) as LayoutJson;
    const candidateScene = resolveProjectEditorScene(candidateLayout, {
      assets: project.assets,
      projectName: project.name,
    });
    const reusableValidation = validateProjectEditorScene({
      scene: candidateScene,
      assets: project.assets,
      source: "layout_generation",
      previousScene: scene,
      previousValidation: layoutDocument.validation ?? null,
    });

    if (reusableValidation.projectState === "not_ready") {
      reusable = null;
    } else {
      reusableLayoutJson = mergeProjectLayoutDocument(candidateLayout, {
        validation: reusableValidation,
      }) as LayoutJson;
    }
  }

  if (!reusable) {
    if (!isProjectActivated && entitlementSummary.quotas.activeProjects.remaining <= 0) {
      return NextResponse.json(
        { error: "quota_exceeded", summary: entitlementSummary },
        { status: 403 }
      );
    }

    if (actionQuota.remaining <= 0) {
      return NextResponse.json(
        { error: "quota_exceeded", summary: entitlementSummary },
        { status: 403 }
      );
    }
  }

  if (reusable) {
    await writePrecheckLog({
      userId,
      objectType: "project",
      objectId: projectId,
      actionType,
      budgetStatus: "healthy",
      suggestedMode: "reuse",
      reusableDraftId: reusable.draft.id,
    });

    await db.generationTask.create({
      data: {
        userId,
        objectType: "project",
        objectId: projectId,
        actionType,
        usageClass: "high_cost",
        status: "reused",
        reusedFromTaskId: reusable.task.id,
        requestHash,
        provider: reusable.task.provider,
        model: reusable.task.model,
        wasSuccessful: true,
        countedToBudget: false,
      },
    });

    const layoutJson = reusableLayoutJson ?? ((reusable.draft.contentJson as LayoutJson) ?? null);
    await db.project.update({
      where: { id: projectId },
      data: { layoutJson: layoutJson as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      layoutJson,
      reused: true,
      precheck: {
        suggestedMode: "reuse",
        failureCounts: false,
        consumesQuota: false,
        reusableDraftId: reusable.draft.id,
      },
    });
  }

  // Create generation task
  const task = await db.generationTask.create({
    data: {
      userId,
      objectType: "project",
      objectId: projectId,
      actionType,
      usageClass: "high_cost",
      status: "running",
      provider: "openai",
      requestHash,
      styleReferenceSetHash:
        styleSelection.source === "reference_set"
          ? styleSelection.referenceSetId ?? undefined
          : styleSelection.source === "preset"
            ? styleSelection.presetKey ?? undefined
            : undefined,
    },
  });

  try {
    await writePrecheckLog({
      userId,
      objectType: "project",
      objectId: projectId,
      actionType,
      budgetStatus: actionQuota.remaining <= 1 ? "near_limit" : "healthy",
      suggestedMode: "continue",
    });

    const factsRecord = project.facts
      ? (project.facts as Record<string, unknown>)
      : null;
    const prototypeBoards = prototypeBoardIds
      .map((boardId) => scene.boards.find((board) => board.id === boardId))
      .filter((board): board is ProjectBoard => Boolean(board));

    const prompt = buildPrompt({
      name: project.name,
      packageMode: project.packageMode,
      assetCount: project.assets.length,
      facts: factsRecord,
      styleSummary: `${styleProfile.label}。${styleProfile.summary}`,
      sceneSummary: summarizeProjectSceneForAI({
        scene,
        assets: project.assets,
        scope: {
          mode: "selected",
          boardIds: prototypeBoardIds,
        },
      }),
      boardPlanSummary: buildBoardPlanSummary(prototypeBoards),
      structureSummary: layoutDocument.structureSuggestion
        ? [
            layoutDocument.structureSuggestion.summary,
            ...layoutDocument.structureSuggestion.groups.map(
              (group) =>
                `${group.label}：${group.sections
                  .map((section) => section.title)
                  .join("、")}`
            ),
          ].join("\n")
        : "（暂无结构建议，请基于项目事实和素材自行推导）",
      scopeLabel:
        generationScope.mode === "all"
          ? lockedBoardIdsInScope.length > 0
            ? `全部画板中的 ${prototypeBoardIds.length} 张原型画板（已跳过 ${lockedBoardIdsInScope.length} 个锁定画板，${skippedGeneratedBoardIds.length} 个已生成画板）`
            : `全部画板中的 ${prototypeBoardIds.length} 张原型画板`
          : generationScope.mode === "selected"
            ? lockedBoardIdsInScope.length > 0
              ? `已选择范围中的 ${prototypeBoardIds.length} 张原型画板（已跳过 ${lockedBoardIdsInScope.length} 个锁定画板，${skippedGeneratedBoardIds.length} 个已生成画板）`
              : `已选择范围中的 ${prototypeBoardIds.length} 张原型画板`
            : skippedGeneratedBoardIds.length > 0
              ? `当前范围中的原型画板（已跳过 ${skippedGeneratedBoardIds.length} 个已生成画板）`
              : "当前原型画板",
    });

    const generatedLayout = await llm.generateStructured(prompt, LayoutJsonSchema, {
      task: "project_layout_generation",
      temperature: 0.4,
      track: { userId, projectId },
    });
    const normalizedPages: GeneratedLayoutPageSeed[] = prototypeBoards.map((board, index) => {
      const matchedPage =
        generatedLayout.pages.find((page) => page.boardId === board.id) ??
        generatedLayout.pages[index];
      const fallbackType = (board.pageType ?? "关键模块优化") as ProjectPageType;
      return {
        boardId: board.id,
        pageNumber: index + 1,
        type: (matchedPage?.type ?? fallbackType) as ProjectPageType,
        titleSuggestion:
          matchedPage?.titleSuggestion?.trim() ||
          board.name ||
          board.structureSource?.sectionTitle ||
          `画板 ${index + 1}`,
        contentGuidance:
          matchedPage?.contentGuidance?.trim() ||
          board.intent ||
          "继续补齐这一页的重点内容。",
        keyPoints:
          matchedPage?.keyPoints?.filter(Boolean).slice(0, 5) ??
          board.contentSuggestions.slice(0, 5),
        assetHint: matchedPage?.assetHint,
        wordCountGuideline: matchedPage?.wordCountGuideline,
      };
    });
    const nextEditorScene = applyGeneratedLayoutToScene({
      scene,
      boardIds: prototypeBoardIds,
      layoutPages: normalizedPages,
      assets: project.assets,
      styleProfile,
      suggestion: layoutDocument.structureSuggestion ?? null,
      recognition: layoutDocument.materialRecognition ?? null,
    });
    const validation = validateProjectEditorScene({
      scene: nextEditorScene,
      assets: project.assets,
      source: "layout_generation",
      previousScene: scene,
      previousValidation: layoutDocument.validation ?? null,
    });

    if (validation.projectState === "not_ready") {
      const rollbackValidation = stampProjectValidationFailure({
        scene,
        validation: validateProjectEditorScene({
          scene,
          assets: project.assets,
          source: "export_check",
          previousValidation: layoutDocument.validation ?? null,
        }),
        summary: "本次生成未完成，已保留原内容。",
      });
      const rollbackLayout = mergeProjectLayoutDocument(project.layoutJson, {
        validation: rollbackValidation,
      }) as LayoutJson;

      await db.project.update({
        where: { id: projectId },
        data: { layoutJson: rollbackLayout as unknown as Prisma.InputJsonValue },
      });
      await db.generationTask.update({
        where: { id: task.id },
        data: {
          status: "failed",
          wasSuccessful: false,
          countedToBudget: false,
        },
      });

      return NextResponse.json({
        layoutJson: rollbackLayout,
        rolledBack: true,
        message: "本次生成未完成，已保留原内容。",
      });
    }

    const layoutJson = mergeProjectLayoutDocument(project.layoutJson, {
      ...generatedLayout,
      totalPages: normalizedPages.length,
      pages: normalizedPages,
      styleProfile,
      editorScene: nextEditorScene,
      validation,
    }) as LayoutJson;

    // Persist layout JSON to project
    await db.project.update({
      where: { id: projectId },
      data: { layoutJson: layoutJson as unknown as Prisma.InputJsonValue },
    });

    // Save generated draft
    const draft = await db.generatedDraft.create({
      data: {
        userId,
        objectType: "project",
        objectId: projectId,
        sourceTaskId: task.id,
        draftType: "layout",
        versionNumber: 1,
        contentJson: layoutJson as unknown as Prisma.InputJsonValue,
        isReusable: true,
      },
    });

    // Mark task done
    await db.generationTask.update({
      where: { id: task.id },
      data: { status: "done", wasSuccessful: true, countedToBudget: true },
    });

    return NextResponse.json({ layoutJson, taskId: task.id, draftId: draft.id });
  } catch (error) {
    await db.generationTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        wasSuccessful: false,
        countedToBudget: false,
      },
    });
    const message =
      error instanceof Error ? error.message : "生成失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

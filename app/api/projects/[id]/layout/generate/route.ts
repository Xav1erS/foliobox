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
import type {
  ProjectEditorScene,
  ProjectMaterialRecognition,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";
import {
  GenerationScopeSchema,
  getGenerationScopeBoardIds,
  hasGeneratedLayoutData,
  markBoardsAfterGeneration,
  mergeProjectLayoutDocument,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  serializeSceneForHash,
  summarizeProjectSceneForAI,
} from "@/lib/project-editor-scene";

// ─── Layout JSON schema ───────────────────────────────────────────────────────

const PAGE_TYPES = [
  "cover",
  "background",
  "problem",
  "process",
  "solution",
  "result",
  "reflection",
  "closing",
] as const;

const LayoutPageSchema = z.object({
  pageNumber: z.number(),
  type: z.enum(PAGE_TYPES),
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

  return `你是一位资深作品集顾问，帮助设计师规划单个项目的展示结构。

## 任务
为以下项目生成一份排版页面计划（page plan），用于指导作品集中该项目的排版方向。

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

## 已有结构建议
${project.structureSummary}

## 要求
1. 严格按照包装模式的页数范围生成页面计划
2. 每页给出：页面类型（cover/background/problem/process/solution/result/reflection/closing）、标题建议、内容指导、3–5个关键要点
3. 给出一句话叙事摘要，说明这个项目的核心故事弧度
4. 给出2–4条质量提示，指出当前信息中可以加强的方向
5. 语言简洁专业，面向中国设计师

请输出 JSON，格式如下：
{
  "packageMode": "${project.packageMode}",
  "totalPages": <数字>,
  "narrativeSummary": "<一句话描述项目叙事弧度>",
  "pages": [
    {
      "pageNumber": 1,
      "type": "<cover|background|problem|process|solution|result|reflection|closing>",
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
  const scopedBoardIds = getGenerationScopeBoardIds(scopedScene);
  const isRegeneration = hasGeneratedLayoutData(project.layoutJson);
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
    scene: serializeSceneForHash(scopedScene),
  });

  const reusable = await findReusableGeneratedDraft({
    userId,
    objectType: "project",
    objectId: projectId,
    requestHash,
    draftType: "layout",
  });

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

    const layoutJson = mergeProjectLayoutDocument(project.layoutJson, {
      ...(reusable.draft.contentJson as LayoutJson),
      editorScene: markBoardsAfterGeneration(scene, scopedBoardIds),
    }) as LayoutJson;
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

    const prompt = buildPrompt({
      name: project.name,
      packageMode: project.packageMode,
      assetCount: project.assets.length,
      facts: factsRecord,
      styleSummary: `${styleProfile.label}。${styleProfile.summary}`,
      sceneSummary: summarizeProjectSceneForAI({
        scene,
        assets: project.assets,
        scope: generationScope,
      }),
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
          ? "全部画板"
          : generationScope.mode === "selected"
            ? `已选择的 ${scopedBoardIds.length} 个画板`
            : "当前画板",
    });

    const generatedLayout = await llm.generateStructured(prompt, LayoutJsonSchema, {
      task: "project_layout_generation",
      temperature: 0.4,
      track: { userId, projectId },
    });
    const layoutJson = mergeProjectLayoutDocument(project.layoutJson, {
      ...generatedLayout,
      styleProfile,
      editorScene: markBoardsAfterGeneration(scene, scopedBoardIds),
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

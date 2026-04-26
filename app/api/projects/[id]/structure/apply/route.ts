import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm";
import { getPrivateBlob, isBlobStorageUrl, uploadFile } from "@/lib/storage";
import {
  buildProjectSceneFromStructureSuggestion,
  inferProjectPageType,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  ProjectPrototypeBoardDraftSchema,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  summarizeMaterialRecognitionForAI,
  type ProjectEditorScene,
  type ProjectLayoutIntent,
  type ProjectPackageMode,
  type ProjectPrototypeBoardDraft,
  type ProjectSceneSeedAsset,
  type ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";
import {
  planPrototypeVisualAssets,
  type GeneratedVisualKind,
} from "@/lib/project-visual-asset-generation";
import {
  buildLayoutIntentRubric,
  getFallbackLayoutIntent,
  getPreferredLayoutIntents,
} from "@/lib/project-editor-prompt-rubric";
import {
  stampProjectValidationFailure,
  validateProjectEditorScene,
} from "@/lib/project-editor-validation";
import type { ImageInput } from "@/lib/llm/provider";
import type { ApplyStructureWarning } from "@/lib/project-structure-apply-types";
import { generateAssetVisionReasonings } from "@/lib/project-asset-vision-reasoning";

const MAX_GENERATED_VISUAL_ASSETS_PER_APPLY = 3;
const SHOULD_SKIP_GENERATED_VISUALS =
  process.env.PLAYWRIGHT_SKIP_VISUAL_GENERATION === "1";

const PrototypeDraftResponseSchema = z.object({
  generatedAt: z.string().optional().default(""),
  summary: z.string(),
  boardDrafts: z.array(ProjectPrototypeBoardDraftSchema),
});

/**
 * 服务端兜底版式意图：
 * - LLM 漏填或返回 null → 用 pageType 的 fallback 意图填上
 * - 相邻两页意图相同 → 在 pageType 的 preferred 列表里换一个
 * 没有这步，buildPrototypeLayoutNodes 会回落到 8 个 legacy 模板（视觉接近），
 * 11 张缩略稿就会显著同质化。
 */
function normalizeLayoutIntents(params: {
  contentDrafts: ProjectPrototypeBoardDraft[];
  suggestion: ProjectStructureSuggestion;
  packageMode: ProjectPackageMode | undefined;
}): ProjectPrototypeBoardDraft[] {
  const { contentDrafts, suggestion, packageMode } = params;
  const draftBySectionId = new Map(contentDrafts.map((d) => [d.sectionId, d]));
  const totalBoards = suggestion.groups.reduce(
    (sum, group) => sum + group.sections.length,
    0
  );
  const ordered: ProjectPrototypeBoardDraft[] = [];
  let prevIntent: ProjectLayoutIntent | null = null;
  let boardIndex = 0;
  for (const group of suggestion.groups) {
    for (const section of group.sections) {
      const draft = draftBySectionId.get(section.id);
      if (!draft) continue;
      const pageType = inferProjectPageType({
        group,
        section,
        boardIndex,
        totalBoards,
        packageMode,
      });
      const fallback = getFallbackLayoutIntent(pageType);
      const preferred = getPreferredLayoutIntents(pageType);
      let intent: ProjectLayoutIntent =
        (draft.layoutIntent as ProjectLayoutIntent | null | undefined) ?? fallback;
      if (intent === prevIntent) {
        const alt = preferred.find((candidate) => candidate !== prevIntent);
        if (alt) intent = alt;
      }
      ordered.push({ ...draft, layoutIntent: intent });
      prevIntent = intent;
      boardIndex += 1;
    }
  }
  // 保留 LLM 给但 section 已不存在的 draft（理论上前面 filter 已挡掉，这里兜底）
  const handled = new Set(ordered.map((d) => d.sectionId));
  for (const draft of contentDrafts) {
    if (!handled.has(draft.sectionId)) ordered.push(draft);
  }
  return ordered;
}

function normalizePackageMode(value: string | null | undefined): ProjectPackageMode | undefined {
  if (value === "DEEP" || value === "LIGHT" || value === "SUPPORTIVE") {
    return value;
  }
  return undefined;
}

function buildContentSuggestionsFromDraft(draft: ProjectPrototypeBoardDraft) {
  return [
    draft.summary,
    draft.narrative,
    ...(draft.keyPoints ?? []),
    draft.missingAssetNote,
  ].filter((item): item is string => Boolean(item?.trim()));
}

function summarizeFacts(
  facts: {
    projectType?: string | null;
    audience?: string | null;
    platform?: string | null;
    projectNature?: string | null;
    industry?: string | null;
    timeline?: string | null;
    background?: string | null;
    targetUsers?: string | null;
    businessGoal?: string | null;
    constraints?: string | null;
    roleTitle?: string | null;
    involvementLevel?: string | null;
    biggestChallenge?: string | null;
    resultSummary?: string | null;
    measurableImpact?: string | null;
  } | null
) {
  if (!facts) return "（暂无项目背景资料）";

  return [
    facts.projectType ? `项目类型：${facts.projectType}` : null,
    facts.audience ? `受众：${facts.audience}` : null,
    facts.platform ? `平台：${facts.platform}` : null,
    facts.projectNature ? `项目性质：${facts.projectNature}` : null,
    facts.industry ? `所属行业：${facts.industry}` : null,
    facts.timeline ? `项目周期：${facts.timeline}` : null,
    facts.roleTitle ? `我的角色：${facts.roleTitle}` : null,
    facts.involvementLevel ? `参与程度：${facts.involvementLevel}` : null,
    facts.background ? `项目背景：${facts.background}` : null,
    facts.targetUsers ? `目标用户：${facts.targetUsers}` : null,
    facts.businessGoal ? `业务目标：${facts.businessGoal}` : null,
    facts.constraints ? `约束条件：${facts.constraints}` : null,
    facts.biggestChallenge ? `最大挑战：${facts.biggestChallenge}` : null,
    facts.resultSummary ? `结果摘要：${facts.resultSummary}` : null,
    facts.measurableImpact ? `量化影响：${facts.measurableImpact}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeAssets(
  assets: Array<{
    id: string;
    title: string | null;
    isCover: boolean;
    metaJson: unknown;
  }>
) {
  if (assets.length === 0) {
    return "（暂无设计图素材）";
  }

  return assets
    .map((asset, index) => {
      const meta = resolveProjectAssetMeta(asset.metaJson);
      return [
        `素材 ${index + 1}${asset.isCover ? "【封面候选】" : ""}`,
        `ID：${asset.id}`,
        `名称：${asset.title ?? asset.id}`,
        meta.roleTag ? `角色：${meta.roleTag}` : null,
        meta.note ? `备注：${meta.note}` : null,
      ]
        .filter(Boolean)
        .join("，");
    })
    .join("\n");
}

function summarizeStructure(suggestion: ProjectStructureSuggestion) {
  return suggestion.groups
    .map((group) =>
      [
        `组：${group.label}`,
        `作用：${group.narrativeRole}`,
        `理由：${group.rationale}`,
        ...group.sections.map((section, index) =>
          [
            `- sectionId：${section.id}`,
            `标题：${section.title}`,
            `目的：${section.purpose || "未填写"}`,
            section.recommendedContent.length > 0
              ? `建议内容：${section.recommendedContent.join("；")}`
              : null,
            section.suggestedAssets.length > 0
              ? `建议素材：${section.suggestedAssets.join("、")}`
              : null,
            section.locked ? "当前章节锁定：是" : null,
            index === group.sections.length - 1 ? "" : null,
          ]
            .filter(Boolean)
            .join(" | ")
        ),
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function summarizeExistingDraftBoardsForPrompt(scene: ProjectEditorScene) {
  if (scene.boardOrder.length === 0) {
    return "（暂无旧内容稿画板）";
  }

  return scene.boardOrder
    .map((boardId, index) => {
      const board = scene.boards.find((item) => item.id === boardId);
      if (!board) return null;
      return [
        `旧画板 ${index + 1}`,
        `名称：${board.name || "未命名"}`,
        board.structureSource?.groupLabel ? `结构分组：${board.structureSource.groupLabel}` : null,
        board.structureSource?.sectionTitle ? `结构章节：${board.structureSource.sectionTitle}` : null,
        board.pageType ? `页型：${board.pageType}` : null,
      ]
        .filter((line): line is string => Boolean(line))
        .join(" | ");
    })
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(input: {
  projectName: string;
  factsText: string;
  assetText: string;
  structureText: string;
  recognitionSummary: string;
  currentSceneSummary: string;
  visionSummary: string;
}) {
  return `你是一位资深作品集编辑器里的内容策划，帮助设计师在“已确认结构”基础上，直接生成每张画板的低保真内容稿。

## 任务目标
请为每一个 section 生成一份“低保真内容稿”，用于创建画板。

这里的“低保真内容稿”不是高保真排版，不需要完整视觉风格；它要做到：
1. 每页先讲清楚
2. 有图的页优先围绕已有设计图展开
3. 缺图的页先用文案、信息卡、流程块或规则块让页面成立
4. 为后续高保真排版提供稳定输入

## 重要约束
1. 你必须严格按输入里的 sectionId 输出，一条 section 对应一条 boardDraft，不能新增、删除或合并。
2. 不要编造不存在的研究数据、上线指标、用户反馈或业务结论。
3. 可以做保守推断，但推断内容必须写成草案口吻，例如“待确认”“建议补充”，不要装成已确认事实。
4. 标题保持短，不要改成营销语。
5. 低保真内容稿应优先服务“页面成立”，而不是追求文案华丽。
6. “旧内容稿上下文”只用于知道当前已有哪些页面，不要复用其中的标题、正文、logo 描述、版式或素材安排；这次要按当前结构、事实和素材重新写。
7. 封面 / 项目定位页如果存在完整界面图、封面图或首页截图候选，不要把 logo、图标、app icon 当主视觉。

## 项目名称
${input.projectName}

## 项目事实
${input.factsText}

## 已上传素材摘要
${input.assetText}

## 附图说明（与输入图片顺序一致）
${input.visionSummary}

## 已确认结构
${input.structureText}

## 已有素材识别结论
${input.recognitionSummary}

## 旧内容稿上下文（仅供避免遗漏，不可复用文案）
${input.currentSceneSummary}

## 版式意图指南
${buildLayoutIntentRubric()}

## 输出 JSON
{
  "generatedAt": "<ISO 时间字符串>",
  "summary": "<一句话说明这轮低保真内容稿的整体策略>",
  "boardDrafts": [
    {
      "sectionId": "<必须与输入 sectionId 完全一致>",
      "title": "<这页的低保真标题，中文不超过 12 字>",
      "summary": "<这页最核心的说明，1-2 句，偏事实和结论>",
      "narrative": "<可选：补充说明或待确认提示，1-2 句>",
      "keyPoints": ["<要点 1>", "<要点 2>", "<要点 3>"],
      "infoCards": [
        { "label": "<短标签>", "value": "<短内容>" }
      ],
      "visualBrief": "<如果有图，这张图在本页承担什么作用；如果缺图，应该补什么图>",
      "preferredAssetIds": ["<优先使用的素材 id>"],
      "missingAssetNote": "<如果缺图，明确写待补什么图；如果已有图，也可写空字符串>",
      "layoutIntent": "<必须从 hero / split_2_1 / grid_3 / grid_2x2 / timeline / narrative / showcase 中选一个，遵守版式意图指南>"
    }
  ]
}

## 字段长度硬约束
- title：中文不超过 12 字
- summary：60-90 中文字之间，过短或过长都不合格
- narrative：60-120 中文字之间。少于 60 字时补充背景或反思，多于 120 字时拆出 keyPoints
- keyPoints：每条 12-28 字，2 到 4 条
- infoCards：0 到 3 条；label ≤ 6 字，value ≤ 24 字（硬上限），优先用数字 / 短结论
- preferredAssetIds：只能从输入素材 id 中选择；如果没有合适素材，可为空数组
- layoutIntent：每页必填；相邻两页的 layoutIntent 不允许完全相同

只输出 JSON，不输出 markdown。`;
}

function getGeneratedVisualNote(kind: GeneratedVisualKind) {
  if (kind === "flow_diagram") return "AI 生成流程图草案";
  if (kind === "persona_board") return "AI 生成用户画像草案";
  if (kind === "journey_map") return "AI 生成体验地图草案";
  if (kind === "system_map") return "AI 生成规则映射图草案";
  return "AI 生成结果证据图草案";
}

function getImageExtension(mimeType: "image/png" | "image/jpeg" | "image/webp") {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function buildGeneratedVisualFilename(projectId: string, sectionId: string, mimeType: "image/png" | "image/jpeg" | "image/webp") {
  return `${projectId}-${sectionId}-ai-visual.${getImageExtension(mimeType)}`;
}

function normalizeVisionMimeType(contentType: string | null | undefined): ImageInput["mimeType"] | null {
  const normalized = (contentType ?? "").toLowerCase().split(";")[0].trim();
  if (normalized === "image/png") return "image/png";
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "image/jpeg";
  if (normalized === "image/webp") return "image/webp";
  if (normalized === "image/gif") return "image/gif";
  return null;
}

async function resolveAssetToImageInput(source: string): Promise<ImageInput | null> {
  if (source.startsWith("data:")) {
    const matched = source.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matched) return null;
    const mimeType = normalizeVisionMimeType(matched[1]);
    if (!mimeType) return null;
    return { mimeType, base64: matched[2] };
  }

  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    const result = await getPrivateBlob(source);
    const mimeType = normalizeVisionMimeType(result.blob.contentType);
    if (!mimeType) return null;
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return {
      mimeType,
      base64: Buffer.from(arrayBuffer).toString("base64"),
    };
  }

  if (isBlobStorageUrl(source)) {
    const result = await getPrivateBlob(source);
    const mimeType = normalizeVisionMimeType(result.blob.contentType);
    if (!mimeType) return null;
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return {
      mimeType,
      base64: Buffer.from(arrayBuffer).toString("base64"),
    };
  }

  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) return null;
  const mimeType = normalizeVisionMimeType(response.headers.get("content-type"));
  if (!mimeType) return null;
  const arrayBuffer = await response.arrayBuffer();
  return {
    mimeType,
    base64: Buffer.from(arrayBuffer).toString("base64"),
  };
}

function pickVisionAssets(
  assets: Array<{
    id: string;
    title: string | null;
    imageUrl: string;
    isCover: boolean;
    metaJson: unknown;
  }>,
  recognizedHeroIds: string[],
  recognizedSupportIds: string[]
) {
  const seen = new Set<string>();
  const orderedIds = [
    ...recognizedHeroIds,
    ...recognizedSupportIds,
    ...assets.filter((asset) => asset.isCover).map((asset) => asset.id),
    ...assets.map((asset) => asset.id),
  ].filter((assetId) => {
    if (!assetId || seen.has(assetId)) return false;
    seen.add(assetId);
    return true;
  });

  return orderedIds
    .map((assetId) => assets.find((asset) => asset.id === assetId))
    .filter((asset): asset is NonNullable<(typeof assets)[number]> => Boolean(asset))
    .slice(0, 6);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      packageMode: true,
      layoutJson: true,
      facts: {
        select: {
          projectType: true,
          audience: true,
          platform: true,
          projectNature: true,
          industry: true,
          timeline: true,
          background: true,
          targetUsers: true,
          businessGoal: true,
          constraints: true,
          roleTitle: true,
          involvementLevel: true,
          biggestChallenge: true,
          resultSummary: true,
          measurableImpact: true,
        },
      },
      assets: {
        where: { selected: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          isCover: true,
          selected: true,
          metaJson: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    markSetupCompleted?: boolean;
    applyMode?: "replace_boards" | "content_only";
    generateVisuals?: boolean;
  };
  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  const currentScene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const suggestion = layoutDocument.structureSuggestion;

  if (!suggestion) {
    return NextResponse.json({ error: "请先生成并确认结构，再生成低保真画板。" }, { status: 400 });
  }

  if (suggestion.status !== "confirmed") {
    return NextResponse.json({ error: "请先确认当前结构，再生成低保真画板。" }, { status: 400 });
  }

  const recognizedHeroIds = layoutDocument.materialRecognition?.heroAssetIds ?? [];
  const recognizedSupportIds = layoutDocument.materialRecognition?.supportingAssetIds ?? [];
  const visionAssets = pickVisionAssets(project.assets, recognizedHeroIds, recognizedSupportIds);
  const visionInputs = (
    await Promise.all(
      visionAssets.map(async (asset) => {
        try {
          const input = await resolveAssetToImageInput(asset.imageUrl);
          return input ? { asset, input } : null;
        } catch {
          return null;
        }
      })
    )
  ).filter(
    (
      item
    ): item is {
      asset: {
        id: string;
        title: string | null;
        imageUrl: string;
        isCover: boolean;
        selected: boolean;
        metaJson: unknown;
      };
      input: ImageInput;
    } => Boolean(item)
  );

  const prompt = buildPrompt({
    projectName: project.name,
    factsText: summarizeFacts(project.facts),
    assetText: summarizeAssets(project.assets),
    structureText: summarizeStructure(suggestion),
    recognitionSummary: summarizeMaterialRecognitionForAI({
      recognition: layoutDocument.materialRecognition,
      assets: project.assets,
    }),
    currentSceneSummary: summarizeExistingDraftBoardsForPrompt(currentScene),
    visionSummary:
      visionInputs.length > 0
        ? visionInputs
            .map(({ asset }, index) => {
              const meta = resolveProjectAssetMeta(asset.metaJson);
              return [
                `图片 ${index + 1}`,
                `assetId：${asset.id}`,
                `名称：${asset.title ?? asset.id}`,
                asset.isCover ? "封面候选：是" : null,
                meta.note ? `备注：${meta.note}` : null,
              ]
                .filter(Boolean)
                .join("，");
            })
            .join("\n")
        : "（本次没有可直接送入 vision 的图片，按文字上下文生成内容稿）",
  });

  let contentDrafts: ProjectPrototypeBoardDraft[] = [];
  try {
    const generated =
      visionInputs.length > 0
        ? await llm.generateStructuredWithImages(
            prompt,
            visionInputs.map((item) => item.input),
            PrototypeDraftResponseSchema,
            {
              task: "project_prototype_generation",
              temperature: 0.35,
              track: {
                userId: session.user.id,
                projectId: project.id,
                itemCount: visionInputs.length,
              },
            }
          )
        : await llm.generateStructured(prompt, PrototypeDraftResponseSchema, {
            task: "project_prototype_generation",
            temperature: 0.35,
            track: {
              userId: session.user.id,
              projectId: project.id,
            },
          });

    const validSectionIds = new Set(
      suggestion.groups.flatMap((group) => group.sections.map((section) => section.id))
    );
    const seenDraftIds = new Set<string>();
    contentDrafts = generated.boardDrafts
      .filter((draft) => {
        if (!validSectionIds.has(draft.sectionId)) return false;
        if (seenDraftIds.has(draft.sectionId)) return false;
        seenDraftIds.add(draft.sectionId);
        return true;
      })
      .map((draft) => ({
        sectionId: draft.sectionId,
        title: draft.title,
        summary: draft.summary,
        narrative: draft.narrative ?? "",
        keyPoints: draft.keyPoints ?? [],
        infoCards: draft.infoCards ?? [],
        visualBrief: draft.visualBrief ?? "",
        preferredAssetIds: draft.preferredAssetIds ?? [],
        missingAssetNote: draft.missingAssetNote ?? "",
        layoutIntent: draft.layoutIntent,
      }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "低保真内容稿生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const packageMode = normalizePackageMode(project.packageMode);

  // 版式意图归一化：LLM 经常漏填或回退到同一个 narrative，导致 11 张稿
  // silhouette 一模一样。这里按 pageType rubric 兜底，并强制相邻页不重复
  // —— 没有这步，缩略条里看不出版式差异。
  contentDrafts = normalizeLayoutIntents({
    contentDrafts,
    suggestion,
    packageMode,
  });

  if (body.applyMode === "content_only") {
    const draftBySectionId = new Map(contentDrafts.map((draft) => [draft.sectionId, draft]));
    const nextEditorScene = normalizeProjectEditorScene({
      ...currentScene,
      boards: currentScene.boards.map((board) => {
        const sectionId = board.structureSource?.sectionId;
        const draft = sectionId ? draftBySectionId.get(sectionId) : null;
        if (!draft) return board;

        return {
          ...board,
          intent: [draft.summary, draft.narrative].filter(Boolean).join(" ") || board.intent,
          contentSuggestions: buildContentSuggestionsFromDraft(draft),
          layoutIntent: draft.layoutIntent ?? board.layoutIntent,
        };
      }),
    });
    const nextLayout = mergeProjectLayoutDocument(project.layoutJson, {
      editorScene: nextEditorScene,
    });

    await db.project.update({
      where: { id },
      data: { layoutJson: nextLayout as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      layoutJson: nextLayout,
      assets: project.assets,
      status: "content_updated",
      message: "讲述建议已按当前结构刷新，画布内容未被替换。",
    });
  }

  const sceneAssets: ProjectSceneSeedAsset[] = [...project.assets];
  const visualGenerationWarnings: ApplyStructureWarning[] = [];
  const shouldGenerateVisuals = body.generateVisuals === true;
  const visualPlans = SHOULD_SKIP_GENERATED_VISUALS || !shouldGenerateVisuals
    ? []
    : planPrototypeVisualAssets({
        projectName: project.name,
        suggestion,
        packageMode,
        contentDrafts,
        assets: project.assets as ProjectSceneSeedAsset[],
        factsSummary: summarizeFacts(project.facts),
      }).slice(0, MAX_GENERATED_VISUAL_ASSETS_PER_APPLY);

  if (visualPlans.length > 0) {
    let nextSortOrder = await db.projectAsset.count({ where: { projectId: id } });
    const generatedAssetIdsBySectionId = new Map<string, string>();
    let imageModelBlocked = false;

    for (const plan of visualPlans) {
      if (imageModelBlocked) break;
      try {
        const generatedImage = await llm.generateImage(plan.prompt, {
          task: "project_visual_asset_generation",
          model: "gpt-image-2",
          quality: "medium",
          size: "1536x1024",
          outputFormat: "png",
          background: "opaque",
          track: {
            userId: session.user.id,
            projectId: project.id,
            metadata: {
              sectionId: plan.sectionId,
              pageType: plan.pageType,
              visualKind: plan.visualKind,
            },
          },
        });

        const imageBuffer = Buffer.from(generatedImage.base64, "base64");
        const imageUrl = await uploadFile(
          new Blob([imageBuffer], { type: generatedImage.mimeType }),
          "project-assets",
          buildGeneratedVisualFilename(project.id, plan.sectionId, generatedImage.mimeType),
          "private"
        );

        const createdAsset = await db.projectAsset.create({
          data: {
            projectId: id,
            assetType: "IMAGE",
            title: plan.title,
            imageUrl,
            sortOrder: nextSortOrder,
            selected: true,
            isCover: false,
            metaJson: {
              note: getGeneratedVisualNote(plan.visualKind),
              roleTag: "support",
              aiGenerated: true,
              sourceSectionId: plan.sectionId,
              visualKind: plan.visualKind,
              generationModel: "gpt-image-2",
              revisedPrompt: generatedImage.revisedPrompt ?? null,
            } as Prisma.InputJsonValue,
          },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            isCover: true,
            selected: true,
            metaJson: true,
          },
        });

        nextSortOrder += 1;
        sceneAssets.push(createdAsset);
        generatedAssetIdsBySectionId.set(plan.sectionId, createdAsset.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          /must be verified to use the model [`"]?gpt-image-2[`"]?/i.test(errorMessage) ||
          /verify organization/i.test(errorMessage)
        ) {
          imageModelBlocked = true;
          visualGenerationWarnings.push({
            code: "visual_generation_unavailable",
            message:
              "AI 补图暂不可用，本次已先生成内容稿。你可以上传图片、稍后补图，或继续生成排版。",
          });
        } else if (visualGenerationWarnings.length === 0) {
          visualGenerationWarnings.push({
            code: "visual_generation_partial_failed",
            message:
              "AI 补图部分失败，本次已先生成内容稿。你可以上传图片、稍后补图，或继续生成排版。",
          });
        }
        console.error("[project_visual_asset_generation] failed", {
          projectId: project.id,
          sectionId: plan.sectionId,
          pageType: plan.pageType,
          visualKind: plan.visualKind,
          error: errorMessage,
        });
      }
    }

    if (generatedAssetIdsBySectionId.size > 0) {
      contentDrafts = contentDrafts.map((draft) => {
        const generatedAssetId = generatedAssetIdsBySectionId.get(draft.sectionId);
        if (!generatedAssetId) return draft;
        return {
          ...draft,
          preferredAssetIds: [...draft.preferredAssetIds, generatedAssetId],
          missingAssetNote: "",
        };
      });
    }
  }

  // 视觉理由 sidecar：env-flagged，每次最多 4 张图，失败不阻塞主流程。
  const assetByIdMap = new Map<string, ProjectSceneSeedAsset>(
    sceneAssets.map((asset) => [asset.id, asset as ProjectSceneSeedAsset])
  );
  const assetReasoningVision = await generateAssetVisionReasonings({
    userId: session.user.id,
    projectId: project.id,
    suggestion,
    contentDrafts,
    assetById: assetByIdMap,
    resolveImage: async (assetId) => {
      const asset = assetByIdMap.get(assetId);
      if (!asset || !asset.imageUrl) return null;
      try {
        return await resolveAssetToImageInput(asset.imageUrl);
      } catch {
        return null;
      }
    },
  });

  const editorScene = buildProjectSceneFromStructureSuggestion({
    suggestion,
    assets: sceneAssets,
    projectName: project.name,
    recognition: layoutDocument.materialRecognition ?? undefined,
    packageMode,
    contentDrafts,
  });
  const validation = validateProjectEditorScene({
    scene: editorScene,
    assets: sceneAssets,
    source: "prototype_generation",
    previousValidation: layoutDocument.validation ?? null,
  });

  if (validation.projectState === "not_ready") {
    const fallbackValidation = stampProjectValidationFailure({
      scene: currentScene,
      validation: validateProjectEditorScene({
        scene: currentScene,
        assets: project.assets,
        source: "export_check",
        previousValidation: layoutDocument.validation ?? null,
      }),
      summary: "生成低保真画板未完成，已保留原内容。",
    });
    const fallbackLayout = mergeProjectLayoutDocument(project.layoutJson, {
      validation: fallbackValidation,
    });

    await db.project.update({
      where: { id },
      data: { layoutJson: fallbackLayout as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      layoutJson: fallbackLayout,
      assets: sceneAssets,
      status: "rolled_back",
      rolledBack: true,
      message: "生成低保真画板未完成，已保留原内容。",
    });
  }

  const nextLayout = mergeProjectLayoutDocument(project.layoutJson, {
    editorScene,
    validation,
    assetReasoningVision:
      Object.keys(assetReasoningVision).length > 0 ? assetReasoningVision : undefined,
    ...(body.markSetupCompleted ? { setup: { completedAt: new Date().toISOString() } } : {}),
  });

  await db.project.update({
    where: { id },
    data: { layoutJson: nextLayout as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({
    layoutJson: nextLayout,
    assets: sceneAssets,
    status: visualGenerationWarnings.length > 0 ? "partial_success" : "success",
    ...(visualGenerationWarnings.length > 0
      ? { warnings: visualGenerationWarnings }
      : {}),
    ...(visualGenerationWarnings.length > 0
      ? { message: visualGenerationWarnings.map((w) => w.message).join(" ") }
      : {}),
  });
}

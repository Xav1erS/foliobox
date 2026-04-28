import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm";
import {
  buildPrototypeNodesForPageType,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  ProjectPrototypeBoardDraftSchema,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  type ProjectBoard,
  type ProjectPageType,
  type ProjectStructureSection,
  type ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";

/**
 * POST /api/projects/[id]/boards/[boardId]/text/rewrite
 *
 * 单页 AI 优化文案：只重写这一张 board 的标题/正文/要点/信息卡，
 * 保留 layoutIntent / pageType / matchedAssetId / structureSource 不变，
 * 不影响其他画板。
 */

// 本路由不允许改 layoutIntent —— 用一个宽松版 schema 接收 LLM 输出。
// 原 ProjectPrototypeBoardDraftSchema 的 layoutIntent 是 .optional()（不接受 null），
// 但我们 prompt 明确要求 LLM 输出 "layoutIntent": null 作为"不修改"信号，
// 所以这里把字段类型放宽到 nullable / optional，落库时再统一保留板子原值。
const RewriteDraftSchema = ProjectPrototypeBoardDraftSchema.extend({
  layoutIntent: ProjectPrototypeBoardDraftSchema.shape.layoutIntent
    .nullable()
    .optional(),
});

const RewriteResponseSchema = z.object({
  draft: RewriteDraftSchema,
});

const RewriteRequestSchema = z
  .object({
    /** 用户提示：tighter（更精炼）/ expand（更展开）/ rephrase（换个说法）。可选。 */
    tone: z.enum(["tighter", "expand", "rephrase"]).optional(),
    /** 用户自己输入的额外指引。可选。 */
    instruction: z.string().max(400).optional(),
  })
  .partial();

function findSectionForBoard(
  board: ProjectBoard,
  suggestion: ProjectStructureSuggestion
): { section: ProjectStructureSection; groupLabel: string } | null {
  const sectionId = board.structureSource?.sectionId;
  if (!sectionId) return null;
  for (const group of suggestion.groups) {
    const section = group.sections.find((item) => item.id === sectionId);
    if (section) return { section, groupLabel: group.label };
  }
  return null;
}

function summarizeFactsForPrompt(
  facts: {
    audience?: string | null;
    platform?: string | null;
    background?: string | null;
    targetUsers?: string | null;
    businessGoal?: string | null;
    biggestChallenge?: string | null;
    resultSummary?: string | null;
  } | null
) {
  if (!facts) return "（暂无项目背景资料）";
  return [
    facts.audience ? `受众：${facts.audience}` : null,
    facts.platform ? `平台：${facts.platform}` : null,
    facts.background ? `项目背景：${facts.background}` : null,
    facts.targetUsers ? `目标用户：${facts.targetUsers}` : null,
    facts.businessGoal ? `业务目标：${facts.businessGoal}` : null,
    facts.biggestChallenge ? `最大挑战：${facts.biggestChallenge}` : null,
    facts.resultSummary ? `结果摘要：${facts.resultSummary}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function summarizeMatchedAsset(
  asset:
    | {
        id: string;
        title: string | null;
        metaJson: unknown;
      }
    | undefined
) {
  if (!asset) return "（本页未挂图，文案应用文字承担信息密度）";
  const meta = resolveProjectAssetMeta(asset.metaJson);
  return [
    `素材 ID：${asset.id}`,
    `素材名称：${asset.title ?? asset.id}`,
    meta.roleTag ? `角色：${meta.roleTag}` : null,
    meta.note ? `备注：${meta.note}` : null,
  ]
    .filter(Boolean)
    .join("，");
}

function summarizeCurrentDraft(board: ProjectBoard) {
  const lines: string[] = [];
  if (board.name) lines.push(`当前标题：${board.name}`);
  if (board.intent) lines.push(`当前一句话/正文：${board.intent}`);
  if (board.contentSuggestions?.length) {
    lines.push(
      `当前要点（参考，可改写、合并、删减）：\n${board.contentSuggestions
        .map((s) => `- ${s}`)
        .join("\n")}`
    );
  }
  return lines.length > 0 ? lines.join("\n") : "（当前画板尚无文案）";
}

function getToneInstruction(tone: "tighter" | "expand" | "rephrase" | undefined) {
  if (tone === "tighter") {
    return "本次目标：让文案更精炼，砍掉冗余修饰，保留事实和结论。";
  }
  if (tone === "expand") {
    return "本次目标：让文案更展开，补充背景或反思，但不要堆砌形容词。";
  }
  if (tone === "rephrase") {
    return "本次目标：换一种表达方式，但保留信息和结论不变。";
  }
  return "本次目标：在当前基础上整体优化；明显薄弱的字段重写，已经合格的字段可微调。";
}

function buildPrompt(input: {
  projectName: string;
  factsText: string;
  groupLabel: string;
  section: ProjectStructureSection;
  pageType: ProjectPageType | null;
  layoutIntent: string | null;
  assetText: string;
  currentDraftText: string;
  toneText: string;
  userInstruction: string;
}) {
  const layoutIntentText = input.layoutIntent
    ? `当前版式意图：${input.layoutIntent}（务必让文案适配该版式：例如 grid_3 / grid_2x2 应输出 3-4 个 infoCards；hero / showcase 围绕主视觉一句话定位；narrative 写一段连贯的反思；timeline 写步骤化的 keyPoints）。`
    : "当前未指定版式意图，按 narrative 处理（一段连贯说明 + 2-3 个右侧短 note）。";

  return `你是作品集编辑器里的文案重写助手，为单张低保真画板生成新一版文案。

## 任务目标
- 仅重写这一张画板的文案，不要影响其他画板。
- 保留它在项目结构里的作用（pageType / 章节归属），不要改主题。
- ${input.toneText}
${input.userInstruction ? `- 用户额外指引：${input.userInstruction}` : ""}

## 项目名称
${input.projectName}

## 项目事实
${input.factsText}

## 本页所属
${input.groupLabel} · sectionId=${input.section.id}
sectionTitle：${input.section.title}
purpose：${input.section.purpose || "未填写"}
recommendedContent：${input.section.recommendedContent.join("；") || "无"}
suggestedAssets：${input.section.suggestedAssets.join("、") || "无"}
pageType：${input.pageType ?? "未指定"}

${layoutIntentText}

## 本页配图
${input.assetText}

## 当前文案（baseline，可被替换或保留）
${input.currentDraftText}

## 输出 JSON
{
  "draft": {
    "sectionId": "${input.section.id}",
    "title": "<这页的低保真标题，中文不超过 12 字>",
    "summary": "<这页最核心的说明，1-2 句，偏事实和结论>",
    "narrative": "<可选：补充说明或待确认提示，1-2 句；narrative 版式建议 60-120 字>",
    "keyPoints": ["<要点 1>", "<要点 2>", "<要点 3>"],
    "infoCards": [
      { "label": "<短标签>", "value": "<短内容>" }
    ],
    "visualBrief": "<如果有图，这张图在本页承担什么作用；如果缺图，应该补什么图>",
    "preferredAssetIds": [],
    "missingAssetNote": "<如果缺图，明确写待补什么图；如果已有图，留空字符串>",
    "layoutIntent": null
  }
}

## 字段长度硬约束
- title：中文不超过 12 字
- summary：60-90 中文字之间
- narrative：60-120 中文字之间（除非版式意图明确不需要）
- keyPoints：每条 12-28 字，2 到 4 条
- infoCards：0 到 3 条；label ≤ 6 字，value ≤ 24 字（硬上限）
- preferredAssetIds 必须为空数组（本接口不允许换图）
- layoutIntent 必须为 null（本接口不允许改版式意图）

只输出 JSON，不输出 markdown。`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; boardId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, boardId } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      layoutJson: true,
      facts: {
        select: {
          audience: true,
          platform: true,
          background: true,
          targetUsers: true,
          businessGoal: true,
          biggestChallenge: true,
          resultSummary: true,
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

  const body = RewriteRequestSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!body.success) {
    return NextResponse.json({ error: "请求参数不合法。" }, { status: 400 });
  }

  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  const suggestion = layoutDocument.structureSuggestion;
  if (!suggestion) {
    return NextResponse.json(
      { error: "项目尚未确认结构，无法优化文案。" },
      { status: 400 }
    );
  }

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const targetBoard = scene.boards.find((item) => item.id === boardId);
  if (!targetBoard) {
    return NextResponse.json({ error: "画板不存在。" }, { status: 404 });
  }

  if (targetBoard.locked) {
    return NextResponse.json(
      { error: "该画板已锁定，无法 AI 优化文案。" },
      { status: 400 }
    );
  }

  const sectionRef = findSectionForBoard(targetBoard, suggestion);
  if (!sectionRef) {
    return NextResponse.json(
      { error: "该画板暂未挂接到结构章节，无法优化文案。" },
      { status: 400 }
    );
  }

  const matchedAsset = project.assets.find(
    (asset) => asset.id === targetBoard.thumbnailAssetId
  );

  const prompt = buildPrompt({
    projectName: project.name,
    factsText: summarizeFactsForPrompt(project.facts),
    groupLabel: sectionRef.groupLabel,
    section: sectionRef.section,
    pageType: targetBoard.pageType,
    layoutIntent: targetBoard.layoutIntent ?? null,
    assetText: summarizeMatchedAsset(matchedAsset),
    currentDraftText: summarizeCurrentDraft(targetBoard),
    toneText: getToneInstruction(body.data.tone),
    userInstruction: body.data.instruction?.trim() ?? "",
  });

  let generated;
  try {
    generated = await llm.generateStructured(prompt, RewriteResponseSchema, {
      task: "project_prototype_text_rewrite",
      temperature: 0.4,
      track: {
        userId: session.user.id,
        projectId: project.id,
        metadata: {
          boardId: targetBoard.id,
          sectionId: sectionRef.section.id,
          tone: body.data.tone ?? "neutral",
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 优化文案失败，请稍后再试。";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 强制保留当前 layoutIntent / matchedAssetId / preferredAssetIds，
  // 即使 LLM 试图改写也忽略，确保单张优化不会破坏整体结构。
  const newDraft: import("@/lib/project-editor-scene").ProjectPrototypeBoardDraft = {
    sectionId: sectionRef.section.id,
    title: generated.draft.title,
    summary: generated.draft.summary,
    narrative: generated.draft.narrative ?? "",
    keyPoints: generated.draft.keyPoints ?? [],
    infoCards: generated.draft.infoCards ?? [],
    visualBrief: generated.draft.visualBrief ?? "",
    preferredAssetIds: [],
    missingAssetNote: matchedAsset ? "" : generated.draft.missingAssetNote ?? "",
    layoutIntent: targetBoard.layoutIntent ?? undefined,
  };

  const matchedAssetTitle = matchedAsset?.title ?? null;
  const newNodes = buildPrototypeNodesForPageType({
    pageType: targetBoard.pageType ?? "总结 / 反思",
    groupLabel: sectionRef.groupLabel,
    sectionId: sectionRef.section.id,
    sectionTitle: sectionRef.section.title,
    purpose: sectionRef.section.purpose,
    recommendedContent: sectionRef.section.recommendedContent,
    matchedAssetId: targetBoard.thumbnailAssetId,
    matchedAssetTitle,
    contentDraft: newDraft,
  });

  const newContentSuggestions = [
    newDraft.summary,
    newDraft.narrative,
    ...(newDraft.keyPoints ?? []),
    newDraft.missingAssetNote,
  ].filter((item): item is string => Boolean(item?.trim()));

  const nextScene = normalizeProjectEditorScene({
    ...scene,
    activeBoardId: targetBoard.id,
    boards: scene.boards.map((board) => {
      if (board.id !== targetBoard.id) return board;
      return {
        ...board,
        intent:
          [newDraft.summary, newDraft.narrative].filter(Boolean).join(" ") ||
          board.intent,
        nodes: newNodes,
        contentSuggestions: newContentSuggestions,
      };
    }),
  });

  const nextLayout = mergeProjectLayoutDocument(project.layoutJson, {
    editorScene: nextScene,
  });

  await db.project.update({
    where: { id },
    data: { layoutJson: nextLayout as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({
    layoutJson: nextLayout,
    boardId: targetBoard.id,
    message: "文案已重写。",
  });
}

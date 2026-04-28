import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm";
import {
  buildPrototypeNodesForPageType,
  ProjectPrototypeBoardDraftSchema,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  type ProjectBoard,
  type ProjectBoardNode,
  type ProjectPageType,
  type ProjectStructureSection,
  type ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";

/**
 * POST /api/projects/[id]/boards/[boardId]/instruct
 *
 * 单页 AI 上下文助手（chat-style）。接收用户的自由指令 + 可选意图 hint，
 * 返回一个"候选版本"的 board patch（不落库）。前端预览，用户决定 应用 / 取消。
 *
 * 这是 plan B 的真正落地：把"AI 优化文案 / 缩短 / 检查可信度"等 chip
 * 都收敛到同一条接口，不同 chip = 不同 intent；自由 chat 直接送 instruction。
 */

const InstructIntentSchema = z.enum([
  "rewrite",     // 整体优化文案
  "shorten",     // 精简到约 70%
  "credibility", // 检查/修正可能夸大的表达
  "expand",      // 补充细节让页面更饱满
]);

type InstructIntent = z.infer<typeof InstructIntentSchema>;

const InstructRequestSchema = z.object({
  /** 用户在 chat 输入框里写的自由指令。和 intent 至少要有一个。 */
  instruction: z.string().max(600).optional().default(""),
  /** 来自快捷 chip 的结构化意图。 */
  intent: InstructIntentSchema.optional(),
});

// 接受 LLM 输出的宽松版 draft（layoutIntent 允许 null/缺省，落库时强制保留板子原值）
const InstructDraftSchema = ProjectPrototypeBoardDraftSchema.extend({
  layoutIntent: ProjectPrototypeBoardDraftSchema.shape.layoutIntent
    .nullable()
    .optional(),
});

const InstructResponseSchema = z.object({
  /** 一句话说 AI 这次改了什么，给前端 banner 用。 */
  summary: z.string(),
  draft: InstructDraftSchema,
});

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
  asset: { id: string; title: string | null; metaJson: unknown } | undefined
) {
  if (!asset) return "（本页未挂图，文案应承担信息密度）";
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

function summarizeCurrentBoardForPrompt(board: ProjectBoard) {
  const lines: string[] = [];
  if (board.name) lines.push(`当前标题：${board.name}`);
  if (board.intent) lines.push(`当前一句话/正文：${board.intent}`);
  if (board.contentSuggestions?.length) {
    lines.push(
      `当前要点：\n${board.contentSuggestions.map((s) => `- ${s}`).join("\n")}`
    );
  }
  return lines.length > 0 ? lines.join("\n") : "（当前画板尚无文案）";
}

function getIntentInstruction(intent: InstructIntent | undefined) {
  if (intent === "rewrite") return "整体优化这一页的文案：让标题更准、说明更清晰、要点更具体。";
  if (intent === "shorten") return "把这一页文案精简到约 70%：砍掉冗余修饰，保留事实和结论。";
  if (intent === "credibility")
    return "检查这一页是否存在可能夸大的表达：拔高个人职责、编造数据、空话/套话；逐条改成可信、可验证的版本。";
  if (intent === "expand") return "在不重复现有信息的前提下，给这一页补充背景或反思，让它更饱满。";
  return "";
}

function buildPrompt(input: {
  projectName: string;
  factsText: string;
  groupLabel: string;
  section: ProjectStructureSection;
  pageType: ProjectPageType | null;
  layoutIntent: string | null;
  assetText: string;
  currentBoardText: string;
  intentInstruction: string;
  userInstruction: string;
}) {
  const layoutIntentText = input.layoutIntent
    ? `当前版式意图：${input.layoutIntent}（务必让文案适配该版式：grid_3 / grid_2x2 输出 3-4 个 infoCards；hero / showcase 围绕主视觉一句话定位；narrative 写一段连贯的反思；timeline 写步骤化的 keyPoints）。`
    : "当前未指定版式意图，按 narrative 处理。";

  const userIntentLines = [
    input.intentInstruction ? `预设动作：${input.intentInstruction}` : "",
    input.userInstruction ? `用户指令：${input.userInstruction}` : "",
  ].filter(Boolean);

  return `你是 FolioBox 作品集编辑器里的"上下文助手"，按用户对当前页的指令产出一个候选版本。

## 任务
- 仅修改这一张画板的文案，不影响其他画板。
- 严格服从用户指令；如果指令含糊，按"整体优化"理解。
- 保留 sectionId / pageType / layoutIntent 不变。
- 输出一句 summary（≤ 30 字）描述这次改了什么，给前端 banner 用。

${userIntentLines.join("\n")}

## 项目名称
${input.projectName}

## 项目事实
${input.factsText}

## 本页所属
${input.groupLabel} · sectionId=${input.section.id}
sectionTitle：${input.section.title}
purpose：${input.section.purpose || "未填写"}
recommendedContent：${input.section.recommendedContent.join("；") || "无"}
pageType：${input.pageType ?? "未指定"}

${layoutIntentText}

## 本页配图
${input.assetText}

## 当前文案 baseline
${input.currentBoardText}

## 输出 JSON
{
  "summary": "<≤30 字，告诉用户这次改了什么>",
  "draft": {
    "sectionId": "${input.section.id}",
    "title": "<新标题，中文 ≤ 12 字>",
    "summary": "<新核心说明，60-90 中文字>",
    "narrative": "<新补充段落，60-120 中文字；如版式不需要可留空字符串>",
    "keyPoints": ["<要点 1>", "<要点 2>"],
    "infoCards": [{ "label": "<≤6 字>", "value": "<≤24 字>" }],
    "visualBrief": "<如果有图，描述它在这页承担什么>",
    "preferredAssetIds": [],
    "missingAssetNote": "",
    "layoutIntent": null
  }
}

## 字段长度硬约束
- title：中文 ≤ 12 字
- summary：60-90 中文字之间
- narrative：60-120 中文字之间，或空字符串
- keyPoints：每条 12-28 字，2-4 条
- infoCards：0-3 条；label ≤ 6 字，value ≤ 24 字
- preferredAssetIds：必须为空数组
- layoutIntent：必须为 null

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

  const body = InstructRequestSchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!body.success) {
    return NextResponse.json({ error: "请求参数不合法。" }, { status: 400 });
  }
  if (!body.data.instruction.trim() && !body.data.intent) {
    return NextResponse.json(
      { error: "请告诉 AI 你想怎么改这一页。" },
      { status: 400 }
    );
  }

  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  const suggestion = layoutDocument.structureSuggestion;
  if (!suggestion) {
    return NextResponse.json(
      { error: "项目尚未确认结构，无法对单页改写。" },
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
      { error: "该画板已锁定，无法 AI 改写。" },
      { status: 400 }
    );
  }

  const sectionRef = findSectionForBoard(targetBoard, suggestion);
  if (!sectionRef) {
    return NextResponse.json(
      { error: "该画板未挂接结构章节，无法 AI 改写。" },
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
    currentBoardText: summarizeCurrentBoardForPrompt(targetBoard),
    intentInstruction: getIntentInstruction(body.data.intent),
    userInstruction: body.data.instruction.trim(),
  });

  let generated;
  try {
    generated = await llm.generateStructured(prompt, InstructResponseSchema, {
      task: "project_prototype_text_instruct",
      // 上下文助手要求"按指令产出有差异的版本"，温度比 rewrite 高，
      // 让用户多次尝试 / 不同指令时能得到真的不同的结果。
      temperature: 0.85,
      track: {
        userId: session.user.id,
        projectId: project.id,
        metadata: {
          boardId: targetBoard.id,
          sectionId: sectionRef.section.id,
          intent: body.data.intent ?? "free",
          instructionLength: body.data.instruction.length,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AI 生成候选版本失败，请稍后再试。";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 强制保留板子原 layoutIntent / matchedAsset / structureSource 不被 LLM 覆盖。
  const newDraft: import("@/lib/project-editor-scene").ProjectPrototypeBoardDraft = {
    sectionId: sectionRef.section.id,
    title: generated.draft.title,
    summary: generated.draft.summary,
    narrative: generated.draft.narrative ?? "",
    keyPoints: generated.draft.keyPoints ?? [],
    infoCards: generated.draft.infoCards ?? [],
    visualBrief: generated.draft.visualBrief ?? "",
    preferredAssetIds: [],
    missingAssetNote: matchedAsset
      ? ""
      : generated.draft.missingAssetNote ?? "",
    layoutIntent: targetBoard.layoutIntent ?? undefined,
  };

  const matchedAssetTitle = matchedAsset?.title ?? null;
  const newNodes: ProjectBoardNode[] = buildPrototypeNodesForPageType({
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

  // 不落库。返回候选 patch，前端预览，用户决定 应用 / 取消。
  return NextResponse.json({
    summary: generated.summary,
    candidate: {
      boardId: targetBoard.id,
      name:
        [newDraft.title].filter(Boolean).join("") || targetBoard.name,
      intent:
        [newDraft.summary, newDraft.narrative].filter(Boolean).join(" ") ||
        targetBoard.intent,
      nodes: newNodes,
      contentSuggestions: newContentSuggestions,
    },
  });
}

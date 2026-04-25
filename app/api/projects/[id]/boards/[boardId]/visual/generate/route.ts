import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm";
import { uploadFile } from "@/lib/storage";
import {
  createProjectImageNode,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  type ProjectBoard,
  type ProjectPrototypeBoardDraft,
  type ProjectSceneSeedAsset,
  type ProjectStructureSection,
  type ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";
import { planPrototypeVisualAssets } from "@/lib/project-visual-asset-generation";

function getGeneratedVisualNote(kind: string) {
  if (kind === "flow_diagram") return "AI 生成流程图草案";
  if (kind === "persona_board") return "AI 生成用户画像草案";
  if (kind === "journey_map") return "AI 生成体验地图草案";
  if (kind === "system_map") return "AI 生成规则映射图草案";
  return "AI 生成结果证据图草案";
}

function getExtension(mime: "image/png" | "image/jpeg" | "image/webp") {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

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

function buildDraftFromBoard(
  board: ProjectBoard,
  sectionId: string
): ProjectPrototypeBoardDraft {
  const keyPoints = (board.contentSuggestions ?? []).slice(0, 6);
  return {
    sectionId,
    title: board.name,
    summary: board.intent || board.name,
    narrative: "",
    keyPoints,
    infoCards: [],
    visualBrief: "",
    preferredAssetIds: [],
    missingAssetNote: "",
  };
}

function summarizeFactsForPrompt(
  facts: {
    audience?: string | null;
    platform?: string | null;
    background?: string | null;
    targetUsers?: string | null;
    businessGoal?: string | null;
  } | null
) {
  if (!facts) return "";
  return [
    facts.audience ? `受众：${facts.audience}` : null,
    facts.platform ? `平台：${facts.platform}` : null,
    facts.background ? `项目背景：${facts.background}` : null,
    facts.targetUsers ? `目标用户：${facts.targetUsers}` : null,
    facts.businessGoal ? `业务目标：${facts.businessGoal}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(
  _request: NextRequest,
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

  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  const suggestion = layoutDocument.structureSuggestion;
  if (!suggestion) {
    return NextResponse.json(
      { error: "项目尚未确认结构，无法补图。" },
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

  const sectionRef = findSectionForBoard(targetBoard, suggestion);
  if (!sectionRef) {
    return NextResponse.json(
      { error: "该画板暂未挂接到结构章节，无法补图。" },
      { status: 400 }
    );
  }

  const draft = buildDraftFromBoard(targetBoard, sectionRef.section.id);
  const plans = planPrototypeVisualAssets({
    projectName: project.name,
    suggestion,
    contentDrafts: [draft],
    assets: project.assets as ProjectSceneSeedAsset[],
    factsSummary: summarizeFactsForPrompt(project.facts),
  });
  const plan = plans.find((item) => item.sectionId === sectionRef.section.id);
  if (!plan) {
    return NextResponse.json(
      { error: "这一页暂不适合 AI 补图，请换一种素材或修改讲述目标。" },
      { status: 400 }
    );
  }

  let imageResult;
  try {
    imageResult = await llm.generateImage(plan.prompt, {
      task: "project_prototype_visual_single",
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
          boardId: targetBoard.id,
          pageType: plan.pageType,
          visualKind: plan.visualKind,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 补图失败，请稍后再试。";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const buffer = Buffer.from(imageResult.base64, "base64");
  const extension = getExtension(imageResult.mimeType);
  const filename = `${project.id}-${targetBoard.id}-single-visual.${extension}`;
  const imageUrl = await uploadFile(
    new Blob([buffer], { type: imageResult.mimeType }),
    "project-assets",
    filename,
    "private"
  );

  const nextSortOrder = await db.projectAsset.count({
    where: { projectId: id },
  });
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
        sourceBoardId: targetBoard.id,
        visualKind: plan.visualKind,
        generationModel: "gpt-image-2",
        revisedPrompt: imageResult.revisedPrompt ?? null,
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

  const nextAssets = [...project.assets, createdAsset];
  const newImageNode = createProjectImageNode(createdAsset.id, {
    x: 1104,
    y: 192,
    width: 720,
    height: 540,
    note: getGeneratedVisualNote(plan.visualKind),
    roleTag: "support",
  });

  const nextScene = normalizeProjectEditorScene({
    ...scene,
    activeBoardId: targetBoard.id,
    boards: scene.boards.map((board) => {
      if (board.id !== targetBoard.id) return board;
      return {
        ...board,
        thumbnailAssetId: board.thumbnailAssetId ?? createdAsset.id,
        nodes: [...board.nodes, newImageNode],
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
    assets: nextAssets,
    message: `已为本页补一张${plan.title}。`,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llmLite } from "@/lib/llm";
import {
  mergeProjectLayoutDocument,
  ProjectMaterialRecognitionSchema,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  summarizeProjectSceneForAI,
  type ProjectMaterialRecognition,
} from "@/lib/project-editor-scene";

function summarizeFacts(
  facts: {
    projectType?: string | null;
    industry?: string | null;
    roleTitle?: string | null;
    background?: string | null;
    resultSummary?: string | null;
  } | null
) {
  if (!facts) return "（暂无项目背景资料）";

  return [
    facts.projectType ? `项目类型：${facts.projectType}` : null,
    facts.industry ? `所属行业：${facts.industry}` : null,
    facts.roleTitle ? `我的角色：${facts.roleTitle}` : null,
    facts.background ? `背景摘要：${facts.background}` : null,
    facts.resultSummary ? `结果摘要：${facts.resultSummary}` : null,
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
  if (assets.length === 0) return "（暂无新增素材）";

  return assets
    .map((asset, index) => {
      const meta = resolveProjectAssetMeta(asset.metaJson);
      return [
        `新增素材 ${index + 1}${asset.isCover ? "【封面候选】" : ""}`,
        `ID：${asset.id}`,
        `名称：${asset.title ?? asset.id}`,
        meta.note ? `备注：${meta.note}` : null,
        meta.roleTag ? `已有人为角色：${meta.roleTag}` : null,
      ]
        .filter(Boolean)
        .join("，");
    })
    .join("\n");
}

function summarizeExistingRecognition(recognition: ProjectMaterialRecognition | undefined) {
  if (!recognition) return "（暂无已有轻识别结果）";
  return [
    `总结：${recognition.summary}`,
    `识别类型：${recognition.recognizedTypes.join("、") || "无"}`,
    `主讲素材：${recognition.heroAssetIds.join("、") || "无"}`,
    `补充素材：${recognition.supportingAssetIds.join("、") || "无"}`,
    `装饰素材：${recognition.decorativeAssetIds.join("、") || "无"}`,
    `风险素材：${recognition.riskyAssetIds.join("、") || "无"}`,
    `缺失信息：${recognition.missingInfo.join("、") || "无"}`,
    `建议下一步：${recognition.suggestedNextStep}`,
    `已覆盖素材：${recognition.recognizedAssetIds.join("、") || "无"}`,
  ].join("\n");
}

function buildPrompt(input: {
  projectName: string;
  factsText: string;
  incrementalAssetText: string;
  existingRecognitionText: string;
  sceneSummary: string;
}) {
  return `你是一位作品集编辑器里的项目识别助手。当前项目已经做过一轮轻识别，现在又新增了一批设计图。请你只根据“新增素材”对已有理解做增量更新，不要整项目重写。

## 你的目标
1. 理解新增素材带来了什么新信息
2. 更新主讲/补充/装饰/风险素材判断
3. 更新缺失信息和建议下一步
4. 明确告诉系统：这次增量变化会不会影响当前结构建议

## 项目信息
项目名称：${input.projectName}

## 项目背景
${input.factsText}

## 已有轻识别结果
${input.existingRecognitionText}

## 新增素材
${input.incrementalAssetText}

## 当前画板上下文
${input.sceneSummary}

## 输出 JSON
{
  "generatedAt": "<ISO 时间字符串>",
  "summary": "<更新后的整体总结>",
  "recognizedTypes": ["<更新后的类型>"],
  "heroAssetIds": ["<更新后的主讲素材 id>"],
  "supportingAssetIds": ["<更新后的补充素材 id>"],
  "decorativeAssetIds": ["<更新后的装饰素材 id>"],
  "riskyAssetIds": ["<更新后的风险素材 id>"],
  "missingInfo": ["<更新后的缺失信息>"],
  "suggestedNextStep": "<更新后的下一步建议>",
  "recognizedAssetIds": ["<当前已经纳入识别范围的全部素材 id>"],
  "lastIncrementalDiff": {
    "generatedAt": "<ISO 时间字符串>",
    "newAssetIds": ["<本次新增素材 id>"],
    "summary": "<一句话总结本次新增素材带来的变化>",
    "changes": ["<变化点 1>", "<变化点 2>"],
    "shouldRefreshStructure": true
  }
}

要求：
- 只输出 JSON
- recognizedAssetIds 必须包含原本已识别素材和本次新增素材
- lastIncrementalDiff.newAssetIds 必须只包含本次新增素材 id
- shouldRefreshStructure 只有在新增素材明显改变结构判断时才为 true`;
}

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
  const body = (await request.json().catch(() => ({}))) as { assetIds?: unknown };
  const assetIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  if (assetIds.length === 0) {
    return NextResponse.json({ error: "请提供要增量识别的素材。" }, { status: 400 });
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      name: true,
      layoutJson: true,
      facts: {
        select: {
          projectType: true,
          industry: true,
          roleTitle: true,
          background: true,
          resultSummary: true,
        },
      },
      assets: {
        where: { selected: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          isCover: true,
          metaJson: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  const existingRecognition = layoutDocument.materialRecognition;
  const incrementalAssets = project.assets.filter((asset) => assetIds.includes(asset.id));

  if (incrementalAssets.length === 0) {
    return NextResponse.json({ error: "没有找到对应的新增素材。" }, { status: 400 });
  }

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });

  const prompt = buildPrompt({
    projectName: project.name,
    factsText: summarizeFacts(project.facts),
    incrementalAssetText: summarizeAssets(incrementalAssets),
    existingRecognitionText: summarizeExistingRecognition(existingRecognition),
    sceneSummary: summarizeProjectSceneForAI({
      scene,
      assets: project.assets,
      scope: {
        mode: "all",
        boardIds: scene.boardOrder,
      },
    }),
  });

  try {
    const recognition = await llmLite.generateStructured(
      prompt,
      ProjectMaterialRecognitionSchema,
      {
        task: "project_material_recognition",
        temperature: 0.2,
        track: { userId, projectId },
      }
    );

    const mergedRecognizedAssetIds = Array.from(
      new Set([...(existingRecognition?.recognizedAssetIds ?? []), ...incrementalAssets.map((asset) => asset.id)])
    );

    const normalizedRecognition: ProjectMaterialRecognition = {
      ...recognition,
      generatedAt: recognition.generatedAt || new Date().toISOString(),
      recognizedAssetIds: mergedRecognizedAssetIds,
      lastIncrementalDiff: recognition.lastIncrementalDiff
        ? {
            ...recognition.lastIncrementalDiff,
            generatedAt:
              recognition.lastIncrementalDiff.generatedAt || new Date().toISOString(),
            newAssetIds: incrementalAssets.map((asset) => asset.id),
          }
        : {
            generatedAt: new Date().toISOString(),
            newAssetIds: incrementalAssets.map((asset) => asset.id),
            summary: "新增素材已纳入识别。",
            changes: ["系统已更新主讲素材和缺失信息判断。"],
            shouldRefreshStructure: false,
          },
    };

    const nextLayout = mergeProjectLayoutDocument(project.layoutJson, {
      materialRecognition: normalizedRecognition,
    });

    await db.project.update({
      where: { id: projectId },
      data: {
        layoutJson: nextLayout as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ recognition: normalizedRecognition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "增量识别失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

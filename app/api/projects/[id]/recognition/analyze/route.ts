import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectActionSummary } from "@/lib/entitlement";
import { llmLite } from "@/lib/llm";
import {
  mergeProjectLayoutDocument,
  ProjectMaterialRecognitionSchema,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
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
        meta.note ? `备注：${meta.note}` : null,
        meta.roleTag ? `已有人为角色：${meta.roleTag}` : null,
      ]
        .filter(Boolean)
        .join("，");
    })
    .join("\n");
}

function buildPrompt(input: {
  projectName: string;
  factsText: string;
  assetText: string;
  sceneSummary: string;
}) {
  return `你是一位作品集编辑器里的项目识别助手。你的任务不是给最终结构，也不是给最终排版，而是在用户刚导入项目背景和设计图后，先返回一轮轻量识别结果。

## 目标
根据项目背景、素材和当前画板上下文，回答：
1. 这批输入主要是什么类型的项目与页面
2. 哪些素材更适合承担主讲位
3. 哪些素材更像补充、装饰或风险素材
4. 当前最明显缺少什么关键信息
5. 最合理的下一步是什么

## 重要约束
- 这是“轻识别”，不是完整诊断
- 不要输出最终结构树
- 不要输出 page plan
- 不要把结论写得像已经确定无疑，应保持保守、可修改
- 优先根据素材本身的可讲述价值判断，不要机械按封面或顺序猜测

## 项目信息
项目名称：${input.projectName}

## 项目背景
${input.factsText}

## 素材摘要
${input.assetText}

## 当前画板上下文
${input.sceneSummary}

## 输出 JSON
{
  "generatedAt": "<ISO 时间字符串>",
  "summary": "<一句话总结当前这批输入最像什么项目材料>",
  "recognizedTypes": ["<素材/页面类型 1>", "<素材/页面类型 2>"],
  "heroAssetIds": ["<最适合主讲的素材 id>"],
  "supportingAssetIds": ["<更适合作为补充的素材 id>"],
  "decorativeAssetIds": ["<更适合作为装饰或氛围素材的素材 id>"],
  "riskyAssetIds": ["<当前较难独立承担讲述、或存在误判风险的素材 id>"],
  "missingInfo": ["<当前最缺少的事实或证据 1>", "<当前最缺少的事实或证据 2>"],
  "suggestedNextStep": "<一句话说明此时更适合先做什么，例如：先确认结构草稿，再决定是否诊断>"
}

要求：
- heroAssetIds / supportingAssetIds / decorativeAssetIds / riskyAssetIds 中的 id 必须来自输入素材
- recognizedTypes 2 到 5 项
- missingInfo 0 到 4 项
- 只输出 JSON，不输出 markdown`;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { id: projectId } = await params;

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

  const hasFacts =
    Boolean(project.facts?.background?.trim()) ||
    Boolean(project.facts?.projectType?.trim()) ||
    Boolean(project.facts?.industry?.trim()) ||
    Boolean(project.facts?.roleTitle?.trim()) ||
    Boolean(project.facts?.resultSummary?.trim());

  if (!hasFacts && project.assets.length === 0) {
    return NextResponse.json(
      { error: "请先填写项目背景或上传设计图，再执行轻识别。" },
      { status: 400 }
    );
  }

  // 项目准备 · AI 项目理解 配额（参见 spec-system-v3/05 §6.1）
  const projectActionSummary = await getProjectActionSummary(userId, projectId);
  if (projectActionSummary.projectUnderstandings.remaining <= 0) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        quota: projectActionSummary.projectUnderstandings,
      },
      { status: 403 }
    );
  }

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });

  const prompt = buildPrompt({
    projectName: project.name,
    factsText: summarizeFacts(project.facts),
    assetText: summarizeAssets(project.assets),
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

    const normalizedRecognition: ProjectMaterialRecognition = {
      ...recognition,
      generatedAt: recognition.generatedAt || new Date().toISOString(),
      recognizedAssetIds: project.assets.map((asset) => asset.id),
      lastIncrementalDiff: null,
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

    // 计入 项目准备 · AI 项目理解 配额。
    await db.generationTask.create({
      data: {
        userId,
        objectType: "project",
        objectId: projectId,
        actionType: "project_material_recognition",
        usageClass: "low_cost",
        status: "done",
        wasSuccessful: true,
        countedToBudget: true,
        provider: "openai",
      },
    });

    return NextResponse.json({ recognition: normalizedRecognition });
  } catch (error) {
    const message = error instanceof Error ? error.message : "轻识别失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

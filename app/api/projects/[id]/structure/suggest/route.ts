import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llmLite } from "@/lib/llm";
import {
  mergeProjectLayoutDocument,
  summarizeMaterialRecognitionForAI,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  summarizeProjectSceneForAI,
  type ProjectStructureSuggestion,
  ProjectStructureSuggestionSchema,
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
        `名称：${asset.title ?? asset.id}`,
        meta.roleTag ? `角色：${meta.roleTag}` : null,
        meta.note ? `备注：${meta.note}` : null,
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
  recognitionSummary: string;
  boundarySummary: string;
  completenessSummary: string;
  packageSummary: string;
}) {
  return `你是一位资深作品集编辑器里的结构顾问，帮助设计师在整理单个项目时，先给出“项目结构分组建议”。

## 你的目标
根据项目背景、设计图素材、当前画板上下文和已有诊断结论，为这个项目生成一份“结构建议”。

这里的“结构建议”不是最终文案，也不是逐页精确排版，而是作品集里这个项目应该如何分组、每组要讲什么。

## 输出风格要求
1. 优先给出真正适合这个项目的结构，不要机械套模板。
2. 结构应该接近成熟 UI/UX 作品集的讲法，可以包含：
- 项目概览 / 封面
- 背景与问题
- 研究与洞察
- 设计策略
- 方案分组（按阶段、场景、流程或主题）
- 结果与复盘
3. 如果素材明显分成多个主题或流程阶段，要把“方案分组”按主题拆开，而不是全部塞进一个大组。
4. 如果研究证据或结果证据不足，可以保守建议，但要明确指出对应分组应该轻讲。
5. 语言简洁、专业、能直接给设计师拿来继续搭结构。

## 项目信息
项目名称：${input.projectName}

## 项目背景
${input.factsText}

## 设计图素材
${input.assetText}

## 当前编辑中的画板上下文
${input.sceneSummary}

## 已有轻识别结果
${input.recognitionSummary}

## 已有诊断结论
边界分析：${input.boundarySummary}
完整度判断：${input.completenessSummary}
包装模式建议：${input.packageSummary}

## 输出 JSON
{
  "generatedAt": "<ISO 时间字符串>",
  "summary": "<一句话总结这个项目最适合怎样组织结构>",
  "narrativeArc": "<一句话说明推荐的叙事弧线，例如：背景 -> 洞察 -> 设计策略 -> 方案分组 -> 结果复盘>",
  "groups": [
    {
      "id": "<短 id>",
      "label": "<结构组标题>",
      "rationale": "<为什么建议保留这一组>",
      "narrativeRole": "<这一组在整体叙事中的作用>",
      "sections": [
        {
          "id": "<短 id>",
          "title": "<小节标题>",
          "purpose": "<这一小节要讲清什么>",
          "recommendedContent": ["建议放的内容点 1", "建议放的内容点 2"],
          "suggestedAssets": ["建议使用的素材标题或素材类型"]
        }
      ]
    }
  ]
}

要求：
- groups 至少 4 组，至多 8 组
- 每组至少 1 个 section
- sections 的标题要能直接用于作品集结构搭建
- 不要输出 markdown，只输出 JSON`;
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
      boundaryJson: true,
      completenessJson: true,
      packageJson: true,
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
    Boolean(project.facts?.roleTitle?.trim());

  if (!hasFacts && project.assets.length === 0) {
    return NextResponse.json(
      { error: "请先填写项目背景或上传设计图，再生成结构建议。" },
      { status: 400 }
    );
  }

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);

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
    recognitionSummary: summarizeMaterialRecognitionForAI({
      recognition: layoutDocument.materialRecognition,
      assets: project.assets,
    }),
    boundarySummary:
      project.boundaryJson && typeof project.boundaryJson === "object"
        ? String((project.boundaryJson as { projectSummary?: string }).projectSummary ?? "暂无")
        : "暂无",
    completenessSummary:
      project.completenessJson && typeof project.completenessJson === "object"
        ? String((project.completenessJson as { overallComment?: string }).overallComment ?? "暂无")
        : "暂无",
    packageSummary:
      project.packageJson && typeof project.packageJson === "object"
        ? String((project.packageJson as { reasoning?: string }).reasoning ?? "暂无")
        : "暂无",
  });

  try {
    const suggestion = await llmLite.generateStructured(
      prompt,
      ProjectStructureSuggestionSchema,
      {
        task: "project_structure_suggestion",
        temperature: 0.3,
        track: { userId, projectId },
      }
    );

    const normalizedSuggestion: ProjectStructureSuggestion = {
      ...suggestion,
      generatedAt: suggestion.generatedAt || new Date().toISOString(),
      status: suggestion.status ?? "draft",
      confirmedAt: suggestion.confirmedAt ?? null,
    };
    const nextLayout = mergeProjectLayoutDocument(project.layoutJson, {
      structureSuggestion: normalizedSuggestion,
    });

    await db.project.update({
      where: { id: projectId },
      data: {
        layoutJson: nextLayout as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ suggestion: normalizedSuggestion });
  } catch (error) {
    const message = error instanceof Error ? error.message : "结构建议生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

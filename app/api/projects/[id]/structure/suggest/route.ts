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
import { formatNarrativeTemplateForPrompt } from "@/lib/narrative-templates";

const AUDIENCE_LABELS: Record<string, string> = {
  TO_C: "To C 大众消费者",
  TO_B: "To B 企业客户",
  TO_G: "To G 政务/公共事业",
  INTERNAL: "内部团队工具",
};
const PLATFORM_LABELS: Record<string, string> = {
  WEB: "Web 端",
  MOBILE: "移动端",
  DESKTOP: "桌面客户端",
  AUTOMOTIVE: "车载/智能座舱",
  LARGE_SCREEN: "大屏/IoT",
  CROSS_PLATFORM: "跨端/多端",
};
const NATURE_LABELS: Record<string, string> = {
  NEW_BUILD: "0→1 全新搭建",
  MAJOR_REDESIGN: "重大改版",
  ITERATION: "体验优化迭代",
  DESIGN_SYSTEM: "设计系统建设",
  CONCEPT: "概念探索/提案",
};
const INVOLVEMENT_LABELS: Record<string, string> = {
  LEAD: "主导设计",
  CORE: "核心参与",
  SUPPORT: "协作支持",
};

function summarizeFacts(
  facts: {
    audience?: string | null;
    platform?: string | null;
    projectNature?: string | null;
    involvementLevel?: string | null;
    industry?: string | null;
    roleTitle?: string | null;
    timeline?: string | null;
    background?: string | null;
    businessGoal?: string | null;
    biggestChallenge?: string | null;
    resultSummary?: string | null;
  } | null
) {
  if (!facts) return "（暂无项目背景资料）";

  return [
    facts.audience ? `受众：${AUDIENCE_LABELS[facts.audience] ?? facts.audience}` : null,
    facts.platform ? `平台：${PLATFORM_LABELS[facts.platform] ?? facts.platform}` : null,
    facts.projectNature ? `项目性质：${NATURE_LABELS[facts.projectNature] ?? facts.projectNature}` : null,
    facts.involvementLevel ? `我的职责：${INVOLVEMENT_LABELS[facts.involvementLevel] ?? facts.involvementLevel}` : null,
    facts.industry ? `所属行业：${facts.industry}` : null,
    facts.roleTitle ? `头衔：${facts.roleTitle}` : null,
    facts.timeline ? `项目周期：${facts.timeline}` : null,
    facts.background ? `项目背景：${facts.background}` : null,
    facts.businessGoal ? `业务目标：${facts.businessGoal}` : null,
    facts.biggestChallenge ? `最大挑战：${facts.biggestChallenge}` : null,
    facts.resultSummary ? `结果与成果：${facts.resultSummary}` : null,
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
  narrativeTemplate: string;
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
1. 结合下方“叙事模板”给出的推荐方向作为主要骨架，但不要机械照搬；如果素材或背景明显不适合，可以合理偏离，并在 rationale 里说明原因。
2. 结构应该接近成熟 UI/UX 作品集的讲法，参考叙事弧与推荐分组方向。
3. 如果素材明显分成多个主题或流程阶段，要把“方案分组”按主题拆开，而不是全部塞进一个大组。
4. 如果研究证据或结果证据不足，可以保守建议，但要明确指出对应分组应该轻讲。
5. 语言简洁、专业、能直接给设计师拿来继续搭结构。
6. 根据“我的职责”调整叙事口吻：LEAD 可强调个人决策，CORE 聚焦具体负责模块，SUPPORT 避免过度抢功。

## 项目信息
项目名称：${input.projectName}

## 项目背景
${input.factsText}

## 叙事模板（按项目类型匹配）
${input.narrativeTemplate}

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
          audience: true,
          platform: true,
          projectNature: true,
          involvementLevel: true,
          industry: true,
          roleTitle: true,
          timeline: true,
          background: true,
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
    Boolean(project.facts?.audience) ||
    Boolean(project.facts?.background?.trim()) ||
    Boolean(project.facts?.industry?.trim()) ||
    Boolean(project.facts?.businessGoal?.trim());

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
    narrativeTemplate: formatNarrativeTemplateForPrompt({
      audience: (project.facts?.audience ?? null) as Parameters<typeof formatNarrativeTemplateForPrompt>[0]["audience"],
      platform: (project.facts?.platform ?? null) as Parameters<typeof formatNarrativeTemplateForPrompt>[0]["platform"],
      projectNature: (project.facts?.projectNature ?? null) as Parameters<typeof formatNarrativeTemplateForPrompt>[0]["projectNature"],
      involvementLevel: (project.facts?.involvementLevel ?? null) as Parameters<typeof formatNarrativeTemplateForPrompt>[0]["involvementLevel"],
      industry: project.facts?.industry ?? null,
    }),
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

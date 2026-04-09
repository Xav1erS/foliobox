import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llmLite } from "@/lib/llm";
import {
  GenerationScopeSchema,
  resolveProjectEditorScene,
  summarizeProjectSceneForAI,
} from "@/lib/project-editor-scene";

const DimensionAssessmentSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["strong", "adequate", "weak", "missing"]),
  comment: z.string(),
});

const CompletenessAnalysisSchema = z.object({
  overallVerdict: z.enum(["ready", "almost_ready", "needs_work", "insufficient"]),
  overallComment: z.string(),
  dimensions: z.array(DimensionAssessmentSchema),
  prioritySuggestions: z.array(z.string()),
  canProceed: z.boolean(),
});

export type CompletenessAnalysis = z.infer<typeof CompletenessAnalysisSchema>;

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
    generationScope?: unknown;
  };
  const parsedScope = GenerationScopeSchema.safeParse(body.generationScope);

  const [project, facts] = await Promise.all([
    db.project.findFirst({
      where: { id: projectId, userId },
      select: {
        id: true,
        name: true,
        layoutJson: true,
        _count: { select: { assets: true } },
        assets: {
          where: { selected: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, title: true, imageUrl: true, selected: true, isCover: true, metaJson: true },
        },
      },
    }),
    db.projectFact.findUnique({ where: { projectId } }),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const factsText = facts
    ? Object.entries(facts)
        .filter(([k, v]) =>
          !["id", "projectId", "updatedAt"].includes(k) &&
          v !== null &&
          v !== undefined &&
          v !== "" &&
          !(Array.isArray(v) && v.length === 0)
        )
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("、") : String(v)}`)
        .join("\n")
    : "（暂无项目事实数据）";
  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const sceneSummary = summarizeProjectSceneForAI({
    scene,
    assets: project.assets,
    scope: parsedScope.success ? parsedScope.data : scene.generationScope,
  });

  const prompt = `你是一位作品集顾问，帮助设计师评估项目信息的完整度，判断是否足以支撑高质量的作品集表达。

## 项目信息
项目名称：${project.name}
素材数量：${project._count.assets} 张

## 已填写的项目事实
${factsText}

## 当前编辑中的画板上下文
${sceneSummary}

## 五个关键维度
1. 项目边界（projectType, industry, hasLaunched, timeline）
2. 问题链条（background, targetUsers, businessGoal）
3. 角色事实（roleTitle, involvementLevel, keyContribution）
4. 方案证据（biggestChallenge）
5. 结果证据（resultSummary, measurableImpact）

## 任务
对以上五个维度分别评估，并给出整体判断。

请输出 JSON：
{
  "overallVerdict": "ready/almost_ready/needs_work/insufficient",
  "overallComment": "<2–3句整体评价>",
  "dimensions": [
    {
      "key": "boundary",
      "label": "项目边界",
      "status": "strong/adequate/weak/missing",
      "comment": "<对这个维度的简短评价>"
    },
    { "key": "problem", "label": "问题链条", "status": "...", "comment": "..." },
    { "key": "role", "label": "角色事实", "status": "...", "comment": "..." },
    { "key": "evidence", "label": "方案证据", "status": "...", "comment": "..." },
    { "key": "result", "label": "结果证据", "status": "...", "comment": "..." }
  ],
  "prioritySuggestions": ["<最重要的1–3条补充建议>"],
  "canProceed": true/false
}`;

  try {
    const analysis = await llmLite.generateStructured(
      prompt,
      CompletenessAnalysisSchema,
      {
        task: "project_completeness_analysis",
        temperature: 0.2,
        track: { userId, projectId },
      }
    );

    await db.project.update({
      where: { id: projectId },
      data: { completenessJson: analysis as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

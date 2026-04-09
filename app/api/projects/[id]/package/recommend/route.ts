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

const PackageRecommendationSchema = z.object({
  recommendedMode: z.enum(["DEEP", "LIGHT", "SUPPORTIVE"]),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  alternativeMode: z.enum(["DEEP", "LIGHT", "SUPPORTIVE"]).nullable(),
  alternativeReason: z.string().nullable(),
});

export type PackageRecommendation = z.infer<typeof PackageRecommendationSchema>;

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
    db.projectFact.findUnique({
      where: { projectId },
      select: {
        projectType: true,
        involvementLevel: true,
        roleTitle: true,
        resultSummary: true,
        measurableImpact: true,
        background: true,
        biggestChallenge: true,
        businessGoal: true,
      },
    }),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const factsText = facts
    ? [
        facts.projectType && `项目类型：${facts.projectType}`,
        facts.involvementLevel &&
          `参与程度：${facts.involvementLevel === "LEAD" ? "主导" : facts.involvementLevel === "CORE" ? "核心成员" : "参与协作"}`,
        facts.roleTitle && `我的角色：${facts.roleTitle}`,
        facts.background && `项目背景：${facts.background}`,
        facts.businessGoal && `业务目标：${facts.businessGoal}`,
        facts.biggestChallenge && `最大挑战：${facts.biggestChallenge}`,
        facts.resultSummary && `结果摘要：${facts.resultSummary}`,
        facts.measurableImpact && `可量化影响：${facts.measurableImpact}`,
      ]
        .filter(Boolean)
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

  const prompt = `你是一位作品集顾问，帮助设计师选择最合适的项目讲法模式。

## 三种包装模式
- DEEP（深讲，8–10页）：完整呈现问题→方案→结果全链路，是作品集主项目的标准讲法
- LIGHT（浅讲，3–5页）：聚焦关键判断和核心成果，适合补充能力面
- SUPPORTIVE（补充展示，1–3页）：以视觉展示为主，起丰富度作用

## 项目信息
项目名称：${project.name}
素材数量：${project._count.assets} 张

## 项目事实
${factsText}

## 当前编辑中的画板上下文
${sceneSummary}

## 任务
基于以上信息，判断这个项目最适合哪种讲法模式。

判断依据：
- 角色主导程度（LEAD → 更适合深讲）
- 问题链完整度（有完整背景+目标+挑战 → 深讲）
- 结果证据强度（有量化数据 → 深讲更值）
- 参与度不足或信息残缺 → 浅讲
- 纯视觉或背景信息极少 → 补充展示

请输出 JSON：
{
  "recommendedMode": "DEEP/LIGHT/SUPPORTIVE",
  "confidence": "high/medium/low",
  "reasoning": "<2–3句理由，说明为什么推荐这个模式>",
  "alternativeMode": "DEEP/LIGHT/SUPPORTIVE 或 null",
  "alternativeReason": "<如果有备选，说明在什么情况下适合备选；否则为 null>"
}`;

  try {
    const recommendation = await llmLite.generateStructured(
      prompt,
      PackageRecommendationSchema,
      {
        task: "project_package_recommendation",
        temperature: 0.2,
        track: { userId, projectId },
      }
    );

    await db.project.update({
      where: { id: projectId },
      data: { packageJson: recommendation as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ recommendation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推荐失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

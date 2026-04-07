import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llmLite } from "@/lib/llm";

const BoundaryAnalysisSchema = z.object({
  isBoundaryClean: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  projectSummary: z.string(),
  risks: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type BoundaryAnalysis = z.infer<typeof BoundaryAnalysisSchema>;

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
      sourceType: true,
      assets: {
        select: { id: true, title: true, selected: true, isCover: true },
        orderBy: { sortOrder: "asc" },
      },
      facts: {
        select: { projectType: true, background: true, targetUsers: true, roleTitle: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.assets.length === 0) {
    return NextResponse.json({ error: "没有素材，无法分析边界" }, { status: 400 });
  }

  const assetSummary = project.assets
    .map((a, i) => `第${i + 1}张${a.title ? `（${a.title}）` : ""}${a.isCover ? "【封面】" : ""}`)
    .join("、");

  const factsText = project.facts
    ? [
        project.facts.projectType && `项目类型：${project.facts.projectType}`,
        project.facts.background && `背景：${project.facts.background}`,
        project.facts.targetUsers && `目标用户：${project.facts.targetUsers}`,
        project.facts.roleTitle && `角色：${project.facts.roleTitle}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "（暂无事实数据）";

  const prompt = `你是一位作品集顾问，帮助设计师判断单个项目的边界是否清晰。

## 项目信息
项目名称：${project.name}
导入方式：${project.sourceType === "FIGMA" ? "Figma链接" : project.sourceType === "IMAGES" ? "图片上传" : "手动创建"}
素材数量：${project.assets.length} 张（${project.assets.filter((a) => a.selected).length} 张已选）
素材列表：${assetSummary}

## 已知事实
${factsText}

## 任务
判断这些素材是否属于同一个项目，边界是否清晰。

请输出 JSON：
{
  "isBoundaryClean": true/false,
  "confidence": "high/medium/low",
  "projectSummary": "<一句话描述这个项目是什么>",
  "risks": ["<风险或疑点，最多3条>"],
  "suggestions": ["<建议，最多3条>"]
}

如果素材信息不足以判断，给出保守结论，confidence 设为 low。`;

  try {
    const analysis = await llmLite.generateStructured(prompt, BoundaryAnalysisSchema, {
      task: "project_boundary_analysis",
      temperature: 0.2,
      track: { userId, projectId },
    });

    await db.project.update({
      where: { id: projectId },
      data: { boundaryJson: analysis as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

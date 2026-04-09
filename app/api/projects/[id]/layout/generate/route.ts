import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm";
import { hasRemainingQuota } from "@/lib/entitlement";

// ─── Layout JSON schema ───────────────────────────────────────────────────────

const PAGE_TYPES = [
  "cover",
  "background",
  "problem",
  "process",
  "solution",
  "result",
  "reflection",
  "closing",
] as const;

const LayoutPageSchema = z.object({
  pageNumber: z.number(),
  type: z.enum(PAGE_TYPES),
  titleSuggestion: z.string(),
  contentGuidance: z.string(),
  keyPoints: z.array(z.string()),
  assetHint: z.string().optional(),
  wordCountGuideline: z.string().optional(),
});

const LayoutJsonSchema = z.object({
  packageMode: z.enum(["DEEP", "LIGHT", "SUPPORTIVE"]),
  totalPages: z.number(),
  narrativeSummary: z.string(),
  pages: z.array(LayoutPageSchema),
  qualityNotes: z.array(z.string()),
});

export type LayoutJson = z.infer<typeof LayoutJsonSchema>;
export type LayoutPage = z.infer<typeof LayoutPageSchema>;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(project: {
  name: string;
  packageMode: string;
  assetCount: number;
  facts: Record<string, unknown> | null;
}): string {
  const modeLabel =
    project.packageMode === "DEEP"
      ? "深讲（8–10页，完整呈现问题→方案→结果）"
      : project.packageMode === "LIGHT"
      ? "浅讲（3–5页，聚焦关键判断和核心成果）"
      : "补充展示（1–3页，以视觉展示为主）";

  const factsText = project.facts
    ? Object.entries(project.facts)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("、") : String(v)}`)
        .join("\n")
    : "（暂无项目事实数据）";

  return `你是一位资深作品集顾问，帮助设计师规划单个项目的展示结构。

## 任务
为以下项目生成一份排版页面计划（page plan），用于指导作品集中该项目的排版方向。

## 项目信息
项目名称：${project.name}
包装模式：${modeLabel}
已上传素材：${project.assetCount} 张

## 项目事实
${factsText}

## 要求
1. 严格按照包装模式的页数范围生成页面计划
2. 每页给出：页面类型（cover/background/problem/process/solution/result/reflection/closing）、标题建议、内容指导、3–5个关键要点
3. 给出一句话叙事摘要，说明这个项目的核心故事弧度
4. 给出2–4条质量提示，指出当前信息中可以加强的方向
5. 语言简洁专业，面向中国设计师

请输出 JSON，格式如下：
{
  "packageMode": "${project.packageMode}",
  "totalPages": <数字>,
  "narrativeSummary": "<一句话描述项目叙事弧度>",
  "pages": [
    {
      "pageNumber": 1,
      "type": "<cover|background|problem|process|solution|result|reflection|closing>",
      "titleSuggestion": "<页面标题建议>",
      "contentGuidance": "<这页应该呈现什么内容>",
      "keyPoints": ["要点1", "要点2", "要点3"],
      "assetHint": "<可选：建议用哪类素材>",
      "wordCountGuideline": "<可选：建议字数区间>"
    }
  ],
  "qualityNotes": ["提示1", "提示2"]
}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  const quotaResult = await hasRemainingQuota(userId, "projectLayouts");
  if (!quotaResult.allowed) {
    return NextResponse.json(
      { error: "quota_exceeded", summary: quotaResult.summary },
      { status: 403 }
    );
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: {
      id: true,
      name: true,
      stage: true,
      packageMode: true,
      facts: true,
      assets: {
        where: { selected: true },
        select: { id: true, title: true, isCover: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!project.packageMode) {
    return NextResponse.json(
      { error: "包装模式未确认，请先完成骨架定稿" },
      { status: 400 }
    );
  }
  if (!["LAYOUT", "READY"].includes(project.stage)) {
    return NextResponse.json(
      { error: "项目尚未进入排版验收阶段" },
      { status: 400 }
    );
  }

  // Create generation task
  const task = await db.generationTask.create({
    data: {
      userId,
      objectType: "project",
      objectId: projectId,
      actionType: "project_layout_generation",
      usageClass: "high_cost",
      status: "running",
      provider: "openai",
    },
  });

  try {
    const factsRecord = project.facts
      ? (project.facts as Record<string, unknown>)
      : null;

    const prompt = buildPrompt({
      name: project.name,
      packageMode: project.packageMode,
      assetCount: project.assets.length,
      facts: factsRecord,
    });

    const layoutJson = await llm.generateStructured(prompt, LayoutJsonSchema, {
      task: "project_layout_generation",
      temperature: 0.4,
      track: { userId, projectId },
    });

    // Persist layout JSON to project
    await db.project.update({
      where: { id: projectId },
      data: { layoutJson: layoutJson as unknown as Prisma.InputJsonValue },
    });

    // Save generated draft
    const draft = await db.generatedDraft.create({
      data: {
        userId,
        objectType: "project",
        objectId: projectId,
        sourceTaskId: task.id,
        draftType: "layout",
        versionNumber: 1,
        contentJson: layoutJson as unknown as Prisma.InputJsonValue,
        isReusable: true,
      },
    });

    // Mark task done
    await db.generationTask.update({
      where: { id: task.id },
      data: { status: "done", wasSuccessful: true, countedToBudget: true },
    });

    return NextResponse.json({ layoutJson, taskId: task.id, draftId: draft.id });
  } catch (error) {
    await db.generationTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        wasSuccessful: false,
        countedToBudget: false,
      },
    });
    const message =
      error instanceof Error ? error.message : "生成失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

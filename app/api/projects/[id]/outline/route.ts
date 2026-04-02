import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm/openai";
import { z } from "zod";

const SectionSchema = z.object({
  id: z.string(),
  type: z.enum(["cover", "profile", "toc", "project_case", "extras", "closing"]),
  title: z.string(),
  enabled: z.boolean(),
  estimatedPages: z.number(),
  focus: z.array(z.string()).optional(),
});

const OutlineSchema = z.object({
  projectDisplayName: z.string(),
  totalEstimatedPages: z.number(),
  sections: z.array(SectionSchema),
});

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [facts, assets] = await Promise.all([
    db.projectFact.findUnique({ where: { projectId: id } }),
    db.projectAsset.findMany({
      where: { projectId: id, selected: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const prompt = `你是一位资深 UX 作品集设计顾问，熟悉国内设计师求职场景。

请根据以下项目信息，为这位设计师的作品集生成一份合理的板块结构大纲。

## 项目信息

- 项目名称：${project.name}
- 项目类型：${facts?.projectType ?? "未填写"}
- 所属行业：${facts?.industry ?? "未填写"}
- 时间线：${facts?.timeline ?? "未填写"}
- 是否已上线：${facts?.hasLaunched === true ? "是" : facts?.hasLaunched === false ? "否" : "未知"}
- 职位头衔：${facts?.roleTitle ?? "未填写"}
- 参与深度：${facts?.involvementLevel ?? "未填写"}
- 项目背景：${facts?.background ?? "未填写"}
- 目标用户：${facts?.targetUsers ?? "未填写"}
- 业务目标：${facts?.businessGoal ?? "未填写"}
- 核心贡献：${facts?.keyContribution ?? "未填写"}
- 最大挑战：${facts?.biggestChallenge ?? "未填写"}
- 结果概述：${facts?.resultSummary ?? "未填写"}
- 量化影响：${facts?.measurableImpact ?? "未填写"}
- 目标岗位：${facts?.targetJob ?? "未填写"}
- 目标公司：${facts?.targetCompanyType ?? "未填写"}
- 已上传设计稿截图：${assets.length} 张

## 要求

生成一份包含 6–8 个板块的作品集大纲，必须包含：
- cover（封面，1–2页）
- profile（个人简介，1–2页）
- toc（目录，1页，可选）
- project_case（项目案例，8–12页，这是核心部分，包含背景、研究、设计过程、最终方案、结果等子板块）
- closing（结语/联系方式，1页）

可选：extras（附加说明、其他项目摘要等，1–2页）

每个板块用中文标题命名。projectDisplayName 用于作品集标题，要比项目名称更有视觉冲击力和表达力。

请以 JSON 格式返回，严格符合以下结构。`;

  try {
    const outlineData = await llm.generateStructured(prompt, OutlineSchema, {
      systemPrompt: "你是一位资深 UX 作品集设计顾问。始终以有效 JSON 格式返回结果，不要包含任何说明文字。",
      temperature: 0.4,
    });

    const outline = await db.portfolioOutline.create({
      data: {
        userId: session.user.id,
        sectionsJson: outlineData as unknown as Parameters<typeof db.portfolioOutline.create>[0]["data"]["sectionsJson"],
        overallTheme: "BALANCED",
        totalEstimatedPages: outlineData.totalEstimatedPages,
        projects: { connect: [{ id }] },
      },
    });

    return NextResponse.json({ outlineId: outline.id });
  } catch (err) {
    console.error("Outline generation error:", err);
    return NextResponse.json({ error: "大纲生成失败，请重试" }, { status: 500 });
  }
}

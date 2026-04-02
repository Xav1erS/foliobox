import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm/openai";
import { z } from "zod";
import { requirePlan } from "@/lib/entitlement";

const BlockSchema = z.object({
  id: z.string(),
  type: z.enum([
    "hero", "section_heading", "rich_text", "bullet_list", "stat_group",
    "image_single", "image_grid", "caption", "quote", "divider", "closing",
  ]),
  data: z.record(z.unknown()),
});

const PageSchema = z.object({
  id: z.string(),
  title: z.string(),
  blocks: z.array(BlockSchema),
});

const DraftSchema = z.object({
  pages: z.array(PageSchema),
});

const THEME_LABEL: Record<string, string> = {
  PROFESSIONAL: "专业克制版（排版简洁，信息密度高，适合大厂）",
  BALANCED: "通用平衡版（图文结合，叙述清晰，适用范围最广）",
  EXPRESSIVE: "视觉表达版（强视觉冲击，适合创意公司）",
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await requirePlan(session.user.id, "full_rewrite");
  if (!allowed) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const { id } = await params;

  const outline = await db.portfolioOutline.findUnique({
    where: { id, userId: session.user.id },
    include: { projects: { select: { id: true, name: true } } },
  });
  if (!outline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projectId = outline.projects[0]?.id;
  if (!projectId) return NextResponse.json({ error: "No project linked to outline" }, { status: 400 });

  const [facts, assets] = await Promise.all([
    db.projectFact.findUnique({ where: { projectId } }),
    db.projectAsset.findMany({
      where: { projectId, selected: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, imageUrl: true, title: true, isCover: true },
    }),
  ]);

  const sectionsJson = outline.sectionsJson as { sections?: Array<{ id: string; type: string; title: string; enabled: boolean; estimatedPages: number; focus?: string[] }> };
  const enabledSections = sectionsJson?.sections?.filter((s) => s.enabled) ?? [];
  const projectName = outline.projects[0]?.name ?? "项目";

  // Create draft record first (PENDING)
  const draft = await db.portfolioDraft.create({
    data: {
      userId: session.user.id,
      projectId,
      outlineId: id,
      variantType: outline.overallTheme,
      status: "PENDING",
      contentJson: {},
    },
  });

  const assetList = assets.map((a, i) => `  [图片${i + 1}] id="${a.id}" title="${a.title}" isCover=${a.isCover}`).join("\n");

  const prompt = `你是一位资深 UX 作品集撰稿专家，熟悉国内设计师求职场景。

请根据以下项目信息和大纲结构，生成一份完整的作品集内容初稿。

## 项目信息

- 项目名称：${projectName}
- 风格方向：${THEME_LABEL[outline.overallTheme] ?? outline.overallTheme}
- 职位头衔：${facts?.roleTitle ?? "设计师"}
- 项目类型：${facts?.projectType ?? "未知"}
- 所属行业：${facts?.industry ?? "未知"}
- 时间线：${facts?.timeline ?? "未知"}
- 项目背景：${facts?.background ?? "未填写"}
- 目标用户：${facts?.targetUsers ?? "未填写"}
- 业务目标：${facts?.businessGoal ?? "未填写"}
- 参与深度：${facts?.involvementLevel ?? "未知"}
- 核心贡献：${facts?.keyContribution ?? "未填写"}
- 最大挑战：${facts?.biggestChallenge ?? "未填写"}
- 结果概述：${facts?.resultSummary ?? "未填写"}
- 量化影响：${facts?.measurableImpact ?? "无"}
- 目标岗位：${facts?.targetJob ?? "未填写"}
- 目标公司类型：${facts?.targetCompanyType ?? "未填写"}

## 已上传设计稿截图

${assetList || "（暂无截图）"}

## 大纲板块（按顺序生成）

${enabledSections.map((s) => `- [${s.type}] ${s.title}（约 ${s.estimatedPages} 页，${s.focus?.join("、") ?? ""}）`).join("\n")}

## 生成要求

1. 每个板块生成为一个 page，page.id 格式为 "page_类型"（如 page_cover、page_profile、page_project_case 等）
2. 每个 page 包含若干 block，block 类型从以下选择：hero、section_heading、rich_text、bullet_list、stat_group、image_single、image_grid、caption、quote、divider、closing
3. 文字内容要真实、具体、有说服力，不要用占位符，直接根据项目信息撰写
4. 图片 block 的 data 中用 assetId 字段引用上面的截图 id（如 image_single: { assetId: "xxx", alt: "描述" }；image_grid: { assetIds: ["xxx","yyy"], layout: "2-col" }）
5. hero block data 格式：{ title: "标题", subtitle: "副标题" }
6. section_heading data：{ text: "标题文字" }
7. rich_text data：{ text: "正文内容" }
8. bullet_list data：{ items: ["条目1", "条目2"] }
9. stat_group data：{ stats: [{ value: "数字或文字", label: "标签" }] }
10. caption data：{ text: "图注文字" }
11. quote data：{ text: "引用文字", author: "来源（可选）" }
12. divider、closing data：{}
13. 风格要符合指定的风格方向，标题简洁有力，正文逻辑清晰

请以 JSON 格式返回，严格符合结构，不要包含任何说明文字。`;

  try {
    const contentData = await llm.generateStructured(prompt, DraftSchema, {
      task: "case_study_generation",
      systemPrompt: "你是一位资深 UX 作品集撰稿专家。始终以有效 JSON 格式返回结果。",
      temperature: 0.5,
      maxTokens: 4000,
    });

    await db.portfolioDraft.update({
      where: { id: draft.id },
      data: { status: "DONE", contentJson: contentData as unknown as Parameters<typeof db.portfolioDraft.update>[0]["data"]["contentJson"] },
    });

    await db.portfolioOutline.update({ where: { id }, data: { status: "DONE" } });

    return NextResponse.json({ draftId: draft.id });
  } catch (err) {
    console.error("Draft render error:", err);
    await Promise.all([
      db.portfolioDraft.update({ where: { id: draft.id }, data: { status: "FAILED" } }).catch(() => null),
      db.portfolioOutline.update({ where: { id }, data: { status: "FAILED" } }).catch(() => null),
    ]);
    return NextResponse.json({ error: "初稿生成失败，请重试" }, { status: 500 });
  }
}

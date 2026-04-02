import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlan } from "@/lib/entitlement";

type Block = {
  id: string;
  type: string;
  data: Record<string, unknown>;
};

type Page = {
  id: string;
  title: string;
  blocks: Block[];
};

function blockToHtml(block: Block): string {
  const { type, data } = block;
  switch (type) {
    case "hero":
      return `<div class="hero"><h1>${escHtml(String(data.title ?? ""))}</h1><p class="subtitle">${escHtml(String(data.subtitle ?? ""))}</p></div>`;
    case "section_heading":
      return `<h2 class="section-heading">${escHtml(String(data.text ?? ""))}</h2>`;
    case "rich_text":
      return `<p class="rich-text">${escHtml(String(data.text ?? "")).replace(/\n/g, "<br>")}</p>`;
    case "bullet_list": {
      const items = (data.items as string[]) ?? [];
      return `<ul class="bullet-list">${items.map((i) => `<li>${escHtml(i)}</li>`).join("")}</ul>`;
    }
    case "stat_group": {
      const stats = (data.stats as { value: string; label: string }[]) ?? [];
      return `<div class="stat-group">${stats.map((s) => `<div class="stat"><span class="stat-value">${escHtml(s.value)}</span><span class="stat-label">${escHtml(s.label)}</span></div>`).join("")}</div>`;
    }
    case "image_single":
      return `<div class="image-placeholder">[图片]</div>`;
    case "image_grid":
      return `<div class="image-placeholder">[图片组]</div>`;
    case "caption":
      return `<p class="caption">${escHtml(String(data.text ?? ""))}</p>`;
    case "quote":
      return `<blockquote class="quote"><p>${escHtml(String(data.text ?? ""))}</p>${data.author ? `<cite>${escHtml(String(data.author))}</cite>` : ""}</blockquote>`;
    case "divider":
      return `<hr class="divider">`;
    case "closing":
      return `<p class="closing">— 感谢阅读 —</p>`;
    default:
      return "";
  }
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await requirePlan(session.user.id, "publish_link");
  if (!allowed) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const { id } = await params;

  const draft = await db.portfolioDraft.findUnique({ where: { id, userId: session.user.id } });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = draft.contentJson as { pages?: Page[] };
  const pages = content?.pages ?? [];

  const pageHtml = pages
    .map(
      (page) => `
    <section class="page" id="${escHtml(page.id)}">
      <div class="page-title">${escHtml(page.title)}</div>
      ${page.blocks.map(blockToHtml).join("\n      ")}
    </section>`
    )
    .join("\n");

  const publishedHtml = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>作品集</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fafafa; color: #1a1a1a; line-height: 1.6; }
  .portfolio { max-width: 760px; margin: 0 auto; padding: 40px 24px 80px; }
  .page { margin-bottom: 64px; }
  .page-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #9ca3af; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
  .hero { background: #111827; color: white; border-radius: 16px; padding: 40px; margin-bottom: 16px; }
  .hero h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .hero .subtitle { color: rgba(255,255,255,0.6); font-size: 14px; }
  .section-heading { font-size: 18px; font-weight: 600; color: #111827; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
  .rich-text { font-size: 14px; color: #374151; line-height: 1.75; margin-bottom: 12px; }
  .bullet-list { padding-left: 20px; margin-bottom: 12px; }
  .bullet-list li { font-size: 14px; color: #374151; margin-bottom: 6px; }
  .stat-group { display: flex; flex-wrap: wrap; gap: 24px; margin: 16px 0; }
  .stat { text-align: center; }
  .stat-value { display: block; font-size: 28px; font-weight: 700; color: #111827; }
  .stat-label { display: block; font-size: 12px; color: #6b7280; margin-top: 4px; }
  .caption { font-size: 12px; color: #9ca3af; text-align: center; font-style: italic; margin: 8px 0; }
  .quote { border-left: 3px solid #e5e7eb; padding-left: 16px; margin: 16px 0; }
  .quote p { font-size: 14px; color: #4b5563; font-style: italic; }
  .quote cite { font-size: 12px; color: #9ca3af; display: block; margin-top: 6px; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .closing { text-align: center; font-size: 13px; color: #9ca3af; padding: 24px 0; }
  .image-placeholder { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 12px; height: 200px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 13px; margin: 12px 0; }
  @media print { body { background: white; } .portfolio { padding: 0; max-width: 100%; } .page { page-break-after: always; } }
</style>
</head>
<body>
<div class="portfolio">
${pageHtml}
</div>
</body>
</html>`;

  // Ensure unique slug
  let slug = generateSlug();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.publishedPortfolio.findUnique({ where: { slug } });
    if (!existing) break;
    slug = generateSlug();
    attempts++;
  }
  if (attempts >= 5) {
    return NextResponse.json({ error: "生成链接失败，请重试" }, { status: 500 });
  }

  const published = await db.publishedPortfolio.upsert({
    where: { draftId: id },
    update: { publishedHtml, slug, isPublished: true },
    create: {
      draftId: id,
      userId: session.user.id,
      slug,
      publishedHtml,
      isPublished: true,
    },
  });

  return NextResponse.json({ slug: published.slug });
}

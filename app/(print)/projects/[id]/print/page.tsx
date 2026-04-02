import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blockToHtml(block: Block, assetMap: Record<string, { imageUrl: string; title: string }>): string {
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
    case "image_single": {
      const asset = assetMap[String(data.assetId ?? "")];
      if (!asset) return `<div class="image-placeholder">[图片]</div>`;
      return `<div class="image-wrap"><img src="${escHtml(asset.imageUrl)}" alt="${escHtml(String(data.alt ?? asset.title))}" /></div>`;
    }
    case "image_grid": {
      const ids = (data.assetIds as string[]) ?? [];
      const cols = data.layout === "3-col" ? "grid-cols-3" : "grid-cols-2";
      return `<div class="image-grid ${cols}">${ids.map((assetId) => {
        const asset = assetMap[assetId];
        if (!asset) return `<div class="image-placeholder">[图片]</div>`;
        return `<div class="image-wrap"><img src="${escHtml(asset.imageUrl)}" alt="${escHtml(asset.title)}" /></div>`;
      }).join("")}</div>`;
    }
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

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ did?: string }>;
}) {
  const { id } = await params;
  const { did } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!did) notFound();

  const [draft, assets] = await Promise.all([
    db.portfolioDraft.findUnique({ where: { id: did, userId: session.user.id } }),
    db.projectAsset.findMany({
      where: { projectId: id, selected: true },
      select: { id: true, imageUrl: true, title: true },
    }),
  ]);

  if (!draft) notFound();

  const assetMap: Record<string, { imageUrl: string; title: string }> = {};
  for (const a of assets) assetMap[a.id] = { imageUrl: a.imageUrl, title: a.title ?? "" };

  const content = draft.contentJson as { pages?: Page[] };
  const pages = content?.pages ?? [];

  const pageHtml = pages
    .map(
      (page) => `
<section class="page">
  <div class="page-title">${escHtml(page.title)}</div>
  ${page.blocks.map((b) => blockToHtml(b, assetMap)).join("\n  ")}
</section>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>作品集打印</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: white; color: #1a1a1a; line-height: 1.6; }
  .portfolio { max-width: 800px; margin: 0 auto; padding: 40px 32px 80px; }
  .page { margin-bottom: 48px; padding-bottom: 48px; border-bottom: 1px solid #e5e7eb; }
  .page:last-child { border-bottom: none; }
  .page-title { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #9ca3af; margin-bottom: 16px; }
  .hero { background: #111827; color: white; border-radius: 12px; padding: 32px; margin-bottom: 16px; }
  .hero h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  .hero .subtitle { color: rgba(255,255,255,0.6); font-size: 13px; }
  .section-heading { font-size: 16px; font-weight: 600; color: #111827; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1.5px solid #e5e7eb; }
  .rich-text { font-size: 13px; color: #374151; line-height: 1.8; margin-bottom: 10px; }
  .bullet-list { padding-left: 18px; margin-bottom: 10px; }
  .bullet-list li { font-size: 13px; color: #374151; margin-bottom: 5px; }
  .stat-group { display: flex; flex-wrap: wrap; gap: 20px; margin: 12px 0; }
  .stat { text-align: center; }
  .stat-value { display: block; font-size: 24px; font-weight: 700; color: #111827; }
  .stat-label { display: block; font-size: 11px; color: #6b7280; margin-top: 3px; }
  .caption { font-size: 11px; color: #9ca3af; text-align: center; font-style: italic; margin: 6px 0; }
  .quote { border-left: 3px solid #e5e7eb; padding-left: 14px; margin: 14px 0; }
  .quote p { font-size: 13px; color: #4b5563; font-style: italic; }
  .quote cite { font-size: 11px; color: #9ca3af; display: block; margin-top: 4px; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  .closing { text-align: center; font-size: 12px; color: #9ca3af; padding: 20px 0; }
  .image-wrap { margin: 10px 0; border-radius: 10px; overflow: hidden; }
  .image-wrap img { width: 100%; height: auto; display: block; }
  .image-placeholder { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 10px; height: 160px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 12px; margin: 10px 0; }
  .image-grid { display: grid; gap: 8px; margin: 10px 0; }
  .grid-cols-2 { grid-template-columns: 1fr 1fr; }
  .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .portfolio { padding: 0; max-width: 100%; }
    .page { page-break-after: always; border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .page:last-child { page-break-after: avoid; }
  }
</style>
<script>
  window.addEventListener("load", function() { window.print(); });
</script>
</head>
<body>
<div class="portfolio">
${pageHtml}
</div>
</body>
</html>`;

  return (
    <div dangerouslySetInnerHTML={{ __html: html }} />
  );
}

import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPageCard(
  page: PortfolioPackagingContent["pages"][number],
  index: number
): string {
  return `
    <section class="page" id="${escHtml(page.id)}">
      <div class="page-index">Page ${index + 1}</div>
      <div class="page-role">${escHtml(page.type === "fixed" ? "固定页" : "项目页")}</div>
      <h2 class="page-title">${escHtml(page.title)}</h2>
      <p class="page-summary">${escHtml(page.summary)}</p>
      <div class="page-meta">${escHtml(page.pageCountSuggestion)}</div>
    </section>
  `;
}

export function renderPortfolioPublishedHtml(params: {
  portfolioName: string;
  content: PortfolioPackagingContent;
}) {
  const { portfolioName, content } = params;
  const pageHtml = content.pages.map((page, index) => renderPageCard(page, index)).join("\n");
  const notesHtml = content.qualityNotes
    .map((note) => `<li>${escHtml(note)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(portfolioName)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f5f4; color: #171717; }
  .portfolio { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; }
  .hero { border: 1px solid #d4d4d4; background: linear-gradient(135deg, #111827 0%, #27272a 100%); color: white; padding: 40px; }
  .hero h1 { font-size: 32px; line-height: 1.1; }
  .hero p { margin-top: 12px; max-width: 760px; color: rgba(255,255,255,0.72); font-size: 15px; line-height: 1.8; }
  .layout { margin-top: 24px; display: grid; gap: 24px; grid-template-columns: minmax(0, 1.45fr) minmax(280px, 1fr); }
  .pages { display: grid; gap: 16px; }
  .page { border: 1px solid #d4d4d4; background: white; padding: 24px; }
  .page-index, .page-role { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #737373; }
  .page-role { margin-top: 6px; }
  .page-title { margin-top: 16px; font-size: 22px; line-height: 1.2; color: #111827; }
  .page-summary { margin-top: 12px; font-size: 14px; line-height: 1.8; color: #404040; }
  .page-meta { margin-top: 16px; font-size: 12px; color: #737373; }
  .sidebar { border: 1px solid #d4d4d4; background: white; padding: 24px; align-self: start; }
  .sidebar h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: #737373; }
  .sidebar p { margin-top: 12px; font-size: 14px; line-height: 1.8; color: #404040; }
  .sidebar ul { margin-top: 16px; padding-left: 18px; }
  .sidebar li { color: #525252; font-size: 14px; line-height: 1.8; }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
  @media print {
    body { background: white; }
    .portfolio { padding: 0; max-width: 100%; }
    .hero, .page, .sidebar { break-inside: avoid; }
  }
</style>
</head>
<body>
  <main class="portfolio">
    <section class="hero">
      <div>Portfolio</div>
      <h1>${escHtml(portfolioName)}</h1>
      <p>${escHtml(content.narrativeSummary)}</p>
    </section>
    <section class="layout">
      <div class="pages">
        ${pageHtml}
      </div>
      <aside class="sidebar">
        <h3>Packaging Notes</h3>
        <p>${escHtml(content.narrativeSummary)}</p>
        <ul>${notesHtml}</ul>
      </aside>
    </section>
  </main>
</body>
</html>`;
}


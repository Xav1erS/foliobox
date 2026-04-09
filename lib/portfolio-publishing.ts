import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
import {
  resolveStyleProfile,
  type StyleProfile,
} from "@/lib/style-reference-presets";

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getPortfolioStyleProfile(content: PortfolioPackagingContent): StyleProfile {
  return resolveStyleProfile(content.styleProfile);
}

export function getPortfolioStyleCssVariables(content: PortfolioPackagingContent) {
  const profile = getPortfolioStyleProfile(content);
  return {
    "--folio-accent": profile.accentColor,
    "--folio-bg": profile.background,
    "--folio-surface": profile.surface,
    "--folio-border": profile.border,
    "--folio-title": profile.titleTone,
    "--folio-body": profile.bodyTone,
  } as Record<string, string>;
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
  const styleProfile = getPortfolioStyleProfile(content);

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(portfolioName)}</title>
<style>
  :root {
    --folio-accent: ${styleProfile.accentColor};
    --folio-bg: ${styleProfile.background};
    --folio-surface: ${styleProfile.surface};
    --folio-border: ${styleProfile.border};
    --folio-title: ${styleProfile.titleTone};
    --folio-body: ${styleProfile.bodyTone};
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--folio-bg); color: var(--folio-title); }
  .portfolio { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; }
  .hero { border: 1px solid var(--folio-border); background: linear-gradient(135deg, var(--folio-title) 0%, var(--folio-accent) 100%); color: white; padding: 40px; }
  .hero h1 { font-size: 32px; line-height: 1.1; }
  .hero p { margin-top: 12px; max-width: 760px; color: rgba(255,255,255,0.78); font-size: 15px; line-height: 1.8; }
  .hero .style-tag { margin-top: 16px; display: inline-flex; border: 1px solid rgba(255,255,255,0.22); padding: 6px 10px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
  .layout { margin-top: 24px; display: grid; gap: 24px; grid-template-columns: minmax(0, 1.45fr) minmax(280px, 1fr); }
  .pages { display: grid; gap: 16px; }
  .page { border: 1px solid var(--folio-border); background: var(--folio-surface); padding: 24px; }
  .page-index, .page-role { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--folio-body) 75%, white 25%); }
  .page-role { margin-top: 6px; }
  .page-title { margin-top: 16px; font-size: 22px; line-height: 1.2; color: var(--folio-title); }
  .page-summary { margin-top: 12px; font-size: 14px; line-height: 1.8; color: var(--folio-body); }
  .page-meta { margin-top: 16px; font-size: 12px; color: color-mix(in srgb, var(--folio-body) 82%, white 18%); }
  .sidebar { border: 1px solid var(--folio-border); background: var(--folio-surface); padding: 24px; align-self: start; }
  .sidebar h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.12em; color: color-mix(in srgb, var(--folio-body) 82%, white 18%); }
  .sidebar p { margin-top: 12px; font-size: 14px; line-height: 1.8; color: var(--folio-body); }
  .sidebar ul { margin-top: 16px; padding-left: 18px; }
  .sidebar li { color: var(--folio-body); font-size: 14px; line-height: 1.8; }
  @media (max-width: 900px) {
    .portfolio { padding: 32px 16px 64px; }
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
      <div class="style-tag">${escHtml(styleProfile.label)}</div>
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

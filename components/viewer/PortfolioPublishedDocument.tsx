import type { CSSProperties } from "react";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
import {
  getPortfolioStyleCssVariables,
  getPortfolioStyleProfile,
} from "@/lib/portfolio-publishing";

export function PortfolioPublishedDocument({
  portfolioName,
  content,
  printMode = false,
}: {
  portfolioName: string;
  content: PortfolioPackagingContent;
  printMode?: boolean;
}) {
  const styleProfile = getPortfolioStyleProfile(content);
  const cssVariables = getPortfolioStyleCssVariables(content) as CSSProperties;

  return (
    <main
      className={`mx-auto max-w-6xl px-4 py-10 sm:px-6 ${
        printMode ? "bg-white" : "bg-[var(--folio-bg)]"
      }`}
      style={cssVariables}
    >
      <section
        className="border px-6 py-8 text-white sm:px-10"
        style={{
          borderColor: "var(--folio-border)",
          background: `linear-gradient(135deg, ${styleProfile.titleTone} 0%, ${styleProfile.accentColor} 100%)`,
        }}
      >
        <p className="text-xs uppercase tracking-[0.22em] text-white/65">Portfolio</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {portfolioName}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-[15px]">
          {content.narrativeSummary}
        </p>
        <div className="mt-5 inline-flex border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
          {styleProfile.label}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
        <div className="grid gap-4">
          {content.pages.map((page, index) => (
            <article
              key={page.id}
              className="border bg-[var(--folio-surface)] px-5 py-5 sm:px-6"
              style={{ borderColor: "var(--folio-border)" }}
            >
              <p
                className="text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--folio-body)" }}
              >
                Page {index + 1}
              </p>
              <p
                className="mt-2 text-[11px] uppercase tracking-[0.18em]"
                style={{ color: "var(--folio-body)" }}
              >
                {page.type === "fixed" ? "固定页" : "项目页"}
              </p>
              <h2
                className="mt-4 text-2xl font-semibold tracking-tight"
                style={{ color: "var(--folio-title)" }}
              >
                {page.title}
              </h2>
              <p className="mt-3 text-sm leading-7" style={{ color: "var(--folio-body)" }}>
                {page.summary}
              </p>
              <p className="mt-4 text-xs" style={{ color: "var(--folio-body)" }}>
                建议页数：{page.pageCountSuggestion}
              </p>
            </article>
          ))}
        </div>

        <aside
          className="self-start border bg-[var(--folio-surface)] px-5 py-5 sm:px-6"
          style={{ borderColor: "var(--folio-border)" }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.18em]"
            style={{ color: "var(--folio-body)" }}
          >
            Packaging Notes
          </p>
          <p className="mt-4 text-sm leading-7" style={{ color: "var(--folio-body)" }}>
            {styleProfile.summary}
          </p>
          <ul className="mt-5 space-y-3">
            {content.qualityNotes.map((note) => (
              <li
                key={note}
                className="border-l-2 pl-3 text-sm leading-7"
                style={{
                  borderColor: "var(--folio-accent)",
                  color: "var(--folio-body)",
                }}
              >
                {note}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

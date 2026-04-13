import type { EditorialQuote, EditorialSection } from "@/content/editorial/types";
import { EditorialQuoteCard } from "./EditorialQuoteCard";

export function EditorialArticle({
  sections,
  quotes,
}: {
  sections: EditorialSection[];
  quotes: EditorialQuote[];
}) {
  return (
    <div className="space-y-14">
      {sections.map((section, index) => {
        const sectionQuotes = quotes.filter((quote) => quote.insertAfterSection === index);

        return (
          <section key={section.heading} className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/25">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-[34px]">
                {section.heading}
              </h2>
            </div>

            <div className="space-y-5">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-white/68 sm:text-lg sm:leading-9">
                  {paragraph}
                </p>
              ))}
            </div>

            {section.bullets?.length ? (
              <ul className="space-y-3 border border-white/8 bg-white/2 px-6 py-6">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3 text-base leading-7 text-white/68">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 bg-emerald-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {sectionQuotes.map((quote) => (
              <EditorialQuoteCard key={quote.quote} quote={quote.quote} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

import type { LegalDocumentContent } from "@/content/legal/types";

export function LegalDocument({
  content,
}: {
  content: LegalDocumentContent;
}) {
  return (
    <>
      <header className="border-b border-white/8 px-6 pb-16 pt-28 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/35">
            {content.eyebrow}
          </p>
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-3xl text-xl leading-9 text-white/72">
            {content.subtitle}
          </p>

          <div className="mt-8 max-w-3xl space-y-4">
            {content.introParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-white/60 sm:text-lg sm:leading-9">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </header>

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-14">
          {content.sections.map((section, index) => (
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
                <ul className="space-y-3 border border-white/8 bg-white/[0.02] px-6 py-6">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-base leading-7 text-white/68">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 bg-emerald-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </section>
    </>
  );
}

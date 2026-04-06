import type { EditorialContent } from "@/private-docs/llm-measurements/content/editorial/types";

export function EditorialPageHeader({
  eyebrow,
  title,
  subtitle,
  introParagraphs,
}: Pick<EditorialContent, "eyebrow" | "title" | "subtitle" | "introParagraphs">) {
  return (
    <header className="px-6 pb-8 pt-28 sm:pb-10">
      <div className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/35">
          {eyebrow}
        </p>
        <h1 className="max-w-4xl font-bold leading-[1.08] tracking-tight text-white">
          <span className="block text-[2.8rem] leading-[0.98] tracking-[-0.05em] sm:hidden">
            <span className="block">我为什么觉得，</span>
            <span className="block">作品集只是入口，</span>
            <span className="block">不是问题的全部</span>
          </span>
          <span className="hidden text-4xl md:text-6xl sm:block">
            我为什么觉得，作品集只是入口，
            <br />
            不是问题的全部
          </span>
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-9 text-white/72">
          {subtitle}
        </p>

        <div className="mt-10 max-w-3xl border border-white/8 bg-white/[0.03] px-6 py-6 sm:px-7">
          <div className="space-y-4">
            {introParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8 text-white/60 sm:text-lg sm:leading-9">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

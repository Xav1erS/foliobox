import type { EditorialContent } from "@/content/editorial/types";

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
        <h1 className="max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-xl leading-9 text-white/72">
          {subtitle}
        </p>

        <div className="mt-10 max-w-3xl rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-6 sm:px-7">
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

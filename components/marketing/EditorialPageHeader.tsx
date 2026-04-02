import type { EditorialContent } from "@/content/editorial/types";

export function EditorialPageHeader({
  eyebrow,
  title,
  subtitle,
  introParagraphs,
}: Pick<EditorialContent, "eyebrow" | "title" | "subtitle" | "introParagraphs">) {
  return (
    <header className="border-b border-white/8 px-6 pb-16 pt-28 sm:pb-20">
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

        <div className="mt-8 max-w-3xl space-y-4">
          {introParagraphs.map((paragraph) => (
            <p key={paragraph} className="text-base leading-8 text-white/60 sm:text-lg sm:leading-9">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </header>
  );
}

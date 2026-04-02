import Link from "next/link";
import type { EditorialContent } from "@/content/editorial/types";

export function DevelopersNotePreview({
  content,
}: {
  content: Pick<EditorialContent, "previewTitle" | "previewParagraphs" | "slug">;
}) {
  return (
    <section id="developers-note-preview" className="px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-14">
            <div className="flex flex-col justify-between">
              <div>
                <p className="mb-4 text-xs uppercase tracking-[0.26em] text-white/35">
                  开发者说
                </p>
                <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {content.previewTitle}
                </h2>
              </div>

              <div className="mt-8 rounded-[28px] border border-white/10 bg-black/30 px-5 py-5">
                <p className="text-sm leading-7 text-white/58">
                  我们不想用一个更花哨的模板替你遮住内容问题，而是想帮你把真正值得看的东西整理出来。
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {content.previewParagraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8 text-white/62 sm:text-lg sm:leading-9">
                  {paragraph}
                </p>
              ))}

              <div className="pt-3">
                <Link
                  href={`/editorial/${content.slug}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/14 px-5 text-sm font-medium text-white transition-colors hover:border-white/28 hover:bg-white/[0.05]"
                >
                  阅读完整观点
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

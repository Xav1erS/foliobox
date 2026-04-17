import Link from "next/link";
import { RectActionLink } from "@/components/marketing/RectActionLink";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import type { EditorialContent } from "@/content/editorial/types";

export function DevelopersNotePreview({
  content,
}: {
  content: Pick<EditorialContent, "previewTitle" | "previewParagraphs" | "slug">;
}) {
  return (
    <section id="developers-note-preview" className="px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="marketing-panel overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-14">
            <div className="flex flex-col justify-between">
              <div>
                <SectionEyebrow label="开发者说" className="mb-4" />
                <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  <span className="block sm:hidden">我为什么觉得，</span>
                  <span className="block sm:hidden">作品集只是入口，</span>
                  <span className="block sm:hidden">不是问题的全部</span>
                  <span className="hidden sm:block lg:hidden">我为什么觉得，作品集只是入口，</span>
                  <span className="hidden sm:block lg:hidden">不是问题的全部</span>
                  <span className="hidden lg:block">我为什么觉得，作品集只是入口，不是问题的全部</span>
                </h2>
              </div>

              <div className="marketing-panel mt-8 border border-white/10 bg-black/30 px-5 py-5">
                <p className="text-sm leading-7 text-white/58">
                  我不想只做一个更花哨的模板工具，而是想继续往前走，帮你把作品集、简历和求职表达慢慢整理到同一条主线里。
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
                <RectActionLink href={`/editorial/${content.slug}`}>
                  阅读完整观点
                </RectActionLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

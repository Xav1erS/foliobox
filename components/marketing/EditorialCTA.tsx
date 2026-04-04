import { RectActionLink } from "@/components/marketing/RectActionLink";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import type { EditorialCTA as EditorialCTAModel } from "@/content/editorial/types";

export function EditorialCTA({ cta }: { cta: EditorialCTAModel }) {
  return (
    <section className="px-6 pb-24 pt-6">
      <div className="mx-auto max-w-4xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center sm:px-10">
        <SectionEyebrow label="继续下一步" className="justify-center" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          先体验当前版本，再决定要不要继续往前走
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/58">
          如果你也在整理作品集，不一定要先从排版开始。先做一次评分，看看问题到底出在哪，再决定要不要继续整理、继续修改，或者看看集盒FolioBox 以后会长成什么样。
        </p>
        <div className="mt-8">
          <RectActionLink href={cta.href} variant="solid" size="lg">
            {cta.label}
          </RectActionLink>
        </div>
      </div>
    </section>
  );
}

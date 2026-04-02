import Link from "next/link";
import type { EditorialCTA as EditorialCTAModel } from "@/content/editorial/types";

export function EditorialCTA({ cta }: { cta: EditorialCTAModel }) {
  return (
    <section className="px-6 pb-24 pt-6">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-10 text-center sm:px-10">
        <p className="text-xs uppercase tracking-[0.24em] text-white/30">继续下一步</p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          先看清问题，再决定怎么改
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/58">
          如果你也在整理作品集，不一定要先从排版开始。先做一次评分，看看问题到底出在哪，再决定要不要继续重做。
        </p>
        <div className="mt-8">
          <Link
            href={cta.href}
            className="inline-flex h-12 min-w-[220px] items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

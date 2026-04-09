import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCaseStudy } from "@/content/case-studies";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) notFound();

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/#cases"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          回到案例列表
        </Link>

        <section className="mt-8 border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-wrap items-center gap-2">
            {study.tags.map((tag) => (
              <span key={tag} className="border border-white/10 px-2.5 py-1 text-xs text-white/45">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">{study.title}</h1>
          <p className="mt-3 text-sm text-white/45">{study.role}</p>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/72">{study.description}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="bg-white/5 px-3 py-1 text-sm tabular-nums text-white/35 line-through">
              {study.scoreBefore}
            </span>
            <ArrowRight className="h-4 w-4 text-white/20" />
            <span className="bg-emerald-500/12 px-3 py-1 text-sm font-semibold tabular-nums text-emerald-400">
              {study.scoreAfter} 分
            </span>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-white/25">项目背景</p>
            <p className="mt-4 text-sm leading-8 text-white/68">{study.context}</p>

            <p className="mt-8 text-xs uppercase tracking-[0.22em] text-white/25">最难讲清楚的点</p>
            <p className="mt-4 text-sm leading-8 text-white/68">{study.challenge}</p>

            <p className="mt-8 text-xs uppercase tracking-[0.22em] text-white/25">整理方式</p>
            <ul className="mt-4 space-y-3 text-sm leading-8 text-white/68">
              {study.approach.map((item) => (
                <li key={item} className="border-l border-white/15 pl-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/25">整理前</p>
                <ul className="mt-4 space-y-3 text-sm leading-8 text-white/62">
                  {study.before.map((item) => (
                    <li key={item} className="border-l border-red-400/30 pl-4">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/25">整理后</p>
                <ul className="mt-4 space-y-3 text-sm leading-8 text-white/78">
                  {study.after.map((item) => (
                    <li key={item} className="border-l border-emerald-400/40 pl-4">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-8 text-xs uppercase tracking-[0.22em] text-white/25">输出亮点</p>
            <div className="mt-4 grid gap-3">
              {study.outputHighlights.map((item) => (
                <div key={item} className="border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/70">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

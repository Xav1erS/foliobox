import Link from "next/link";

export function VisionPreview() {
  return (
    <section id="vision-preview" className="px-6 py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03]">
          <div className="grid gap-10 px-6 py-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-14">
            <div>
              <p className="mb-4 text-xs uppercase tracking-[0.26em] text-white/35">
                长期方向
              </p>
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                集盒FolioBox
                <br />
                不只想做一个作品集工具
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/62 sm:text-lg sm:leading-9">
                我现在先从作品集整理开始做，是因为它最具体，也最容易立刻帮上忙。
                但我真正想继续往前走的，是设计师求职表达这整条路。
              </p>
            </div>

            <div className="flex flex-col justify-between gap-6">
              <div className="rounded-[28px] border border-white/10 bg-black/30 px-5 py-5">
                <p className="text-sm leading-7 text-white/58">
                  作品集只是入口。后面我还想慢慢补上简历一致性、岗位匹配、面试讲述这些更难也更真实的部分。
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/vision"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
                >
                  看看我想把它做成什么
                </Link>
                <Link
                  href="/editorial/developers-note"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/14 px-5 text-sm font-medium text-white transition-colors hover:border-white/28 hover:bg-white/[0.05]"
                >
                  先读开发者说
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

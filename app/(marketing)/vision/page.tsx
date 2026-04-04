import Link from "next/link";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/marketing/Footer";
import { IsometricWireframe } from "@/components/marketing/IsometricWireframe";
import { Navbar } from "@/components/marketing/Navbar";
import { SectionFrame } from "@/components/marketing/SectionFrame";
import {
  getNavbarPrimaryAction,
  getNavbarSecondaryAction,
} from "@/lib/marketing-cta";

const futureDirections = [
  {
    title: "简历和作品集，先说同一件事",
    description:
      "把简历、作品集和面试里的核心信息先对齐。很多人不是没有内容，而是三套说法各讲各的。",
    status: "未来方向 / 尚未上线",
  },
  {
    title: "针对目标岗位，知道该强调什么",
    description:
      "同一个项目，面对不同岗位，重点并不一样。以后它不只告诉你哪里不够好，也会告诉你该把什么讲得更清楚。",
    status: "未来方向 / 尚未上线",
  },
  {
    title: "把项目讲成一段真的讲得出口的话",
    description:
      "作品集整理完了，面试时还是可能卡住。未来它应该继续往前一步，帮你把讲述也整理出来。",
    status: "未来方向 / 尚未上线",
  },
  {
    title: "把求职表达放回同一个工作台里",
    description:
      "作品集、简历、岗位理解、面试讲述，本来就不是四件分开的事。长期来看，我希望它们都回到同一条主线里。",
    status: "长期方向",
  },
];

const coreProblems = [
  "不知道该从哪个项目开始整理",
  "不知道自己的角色和判断该怎么讲",
  "不知道作品集、简历和面试里的说法怎么对齐",
  "不知道面对目标岗位时，到底该强调什么",
];

const includedPromiseItems = [
  "作品集整理主线的持续升级",
  "求职表达一致性相关能力",
  "岗位定向优化相关能力",
  "面试讲述辅助",
];

const excludedPromiseItems = [
  "高人力成本的一对一服务",
  "企业版 / 团队版能力",
  "独立的新产品线",
];

const promiseNotes = [
  "这不是“以后所有东西都永久免费”。",
  "但只要它仍然属于这条主线，我希望首批用户能一直在里面。",
];

const heroHighlights = [
  {
    label: "现在能做",
    value: "评分、整理项目、补齐关键信息，先把第一版做出来。",
  },
  {
    label: "以后想补",
    value: "一致性检查、岗位映射、面试讲述，不只是更多模板。",
  },
  {
    label: "给早期用户",
    value: "围绕求职表达主线持续上线的重要能力，会默认免费开放。",
  },
];

export default async function VisionPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const primaryCta = getNavbarPrimaryAction(isLoggedIn);
  const secondaryCta = getNavbarSecondaryAction(isLoggedIn);

  return (
    <main className="bg-black text-white">
      <Navbar isLoggedIn={isLoggedIn} currentPage="vision" />

      <section className="relative overflow-hidden border-b border-white/8 pt-20 sm:pt-28">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-[17rem] h-px bg-white/6" />
        <div className="pointer-events-none absolute left-0 top-32 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />

        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 pb-14 sm:gap-12 sm:px-6 sm:pb-20">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_22rem] lg:items-start lg:gap-8">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2.5 sm:mb-5 sm:gap-3">
                <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/35">
                  长期方向 / 集盒FolioBox
                </p>
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/45">
                  公开愿景页
                </span>
              </div>
              <h1 className="max-w-[12ch] text-[2.45rem] font-semibold leading-[0.96] tracking-[-0.045em] text-white sm:max-w-[10ch] sm:text-6xl md:max-w-[11ch] md:text-[4.6rem]">
                <span className="block whitespace-nowrap">集盒FolioBox</span>
                <span className="mt-1 block whitespace-nowrap sm:mt-2">
                  现在从作品集整理开始。
                </span>
              </h1>
              <div className="mt-6 max-w-2xl space-y-3.5 text-[1.02rem] leading-8 text-white/72 sm:mt-7 sm:space-y-4 sm:text-lg">
                <p>
                  我知道整理作品集很难开始。很多时候不是你不会做，而是这件事本身就很耗人。
                </p>
                <p>
                  所以我先把集盒FolioBox做成了现在这个样子：帮你评分、整理项目、补齐关键信息，先把第一版做出来。
                </p>
                <p className="text-white">但我想做的，不只是一个作品集工具。</p>
              </div>
              <div className="mt-8 flex w-full flex-col items-start gap-3 sm:mt-10 sm:flex-row">
                <Link
                  href={primaryCta.href}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90 sm:w-auto"
                >
                  {primaryCta.label}
                </Link>
                <Link
                  href="/editorial/developers-note"
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/14 px-6 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white sm:w-auto"
                >
                  先读开发者说
                </Link>
              </div>
            </div>

            <aside className="grid gap-3.5 pt-1 sm:gap-4 lg:pt-10">
              <SectionFrame className="rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] sm:rounded-[28px]">
                <div className="p-5 sm:p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/32">
                    不是众筹 / 也不是路线图
                  </p>
                  <p className="mt-3 text-[1.02rem] leading-8 text-white sm:mt-4 sm:text-lg">
                    这页更像一封公开说明：现在先做什么，以后为什么还想继续往前走。
                  </p>
                  <div className="mt-5 rounded-[22px] border border-white/8 bg-black/25 p-3">
                    <IsometricWireframe className="mx-auto max-w-[210px]" />
                  </div>
                </div>
              </SectionFrame>

              {heroHighlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[22px] border border-white/10 bg-black/35 p-4.5 sm:rounded-[24px] sm:p-5"
                >
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/32">
                    {item.label}
                  </p>
                  <p className="mt-2.5 text-sm leading-7 text-white/74 sm:mt-3">
                    {item.value}
                  </p>
                </div>
              ))}
            </aside>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <SectionFrame className="rounded-[26px] border border-white/10 bg-white/[0.03] sm:rounded-[28px]">
              <div className="p-5 sm:p-8">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">为什么不只做工具</p>
                <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-white sm:text-3xl">
                  作品集从来不是问题的全部。
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  很多设计师卡住，不是因为不会排版，也不是因为没有项目。真正难的，往往是求职表达本身。
                </p>
                <ul className="mt-5 grid gap-3 text-sm leading-7 text-white/76 sm:mt-6 sm:grid-cols-2 sm:text-base">
                  {coreProblems.map((problem, index) => (
                    <li
                      key={problem}
                      className="rounded-2xl border border-white/8 bg-black/30 px-4 py-4"
                    >
                      <span className="mb-3 block text-[11px] uppercase tracking-[0.2em] text-white/28">
                        0{index + 1}
                      </span>
                      {problem}
                    </li>
                  ))}
                </ul>
              </div>
            </SectionFrame>

            <SectionFrame className="rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] sm:rounded-[28px]">
              <div className="p-5 sm:p-8">
                <p className="text-xs uppercase tracking-[0.24em] text-white/30">起点</p>
                <div className="mt-4 space-y-4 text-sm leading-7 text-white/70 sm:text-base">
                  <p>
                    现在，集盒FolioBox先解决一件更现实的事：帮你把零散项目整理成一版能继续修改的作品集。
                  </p>
                  <p>
                    以后，如果这条路值得继续走下去，我希望它能帮更多设计师把作品集、简历、岗位理解和面试讲述，重新放回同一条主线里。
                  </p>
                </div>
                <div className="mt-7 rounded-2xl border border-white/10 bg-black/35 p-5 sm:mt-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/30">主叙事句</p>
                  <p className="mt-3 text-lg leading-8 text-white">
                    我知道这件事很难，我想先陪你把第一版做出来。
                  </p>
                </div>
              </div>
            </SectionFrame>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-white/30">长期方向</p>
              <h2 className="mt-4 max-w-[14ch] text-[2rem] font-semibold tracking-tight text-white sm:max-w-none sm:text-4xl">
                如果它继续往前走，
                <span className="whitespace-nowrap">我最想补上的不是更多模板。</span>
              </h2>
            </div>

            <SectionFrame className="rounded-[26px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] sm:rounded-[28px]">
              <div className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-white/30">同一条主线</p>
                <p className="mt-3 text-[1.02rem] leading-8 text-white sm:mt-4 sm:text-xl">
                  不是让页面更多，而是让作品集、简历、岗位理解和面试讲述，开始说同一种语言。
                </p>
              </div>
            </SectionFrame>
          </div>

          <div className="mt-5 max-w-3xl sm:mt-6">
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              我更想补的是这些能力。它们现在还没上线，但都属于同一条主线：帮设计师把自己的能力讲得更清楚、更可信，也更接近招聘方真正会看的东西。
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 sm:mt-10">
            {futureDirections.map((item, index) => (
              <article
                key={item.title}
                className={`rounded-[28px] border border-white/10 p-6 transition-colors hover:border-white/18 sm:p-7 ${
                  index === 0
                    ? "bg-gradient-to-br from-white/[0.08] to-white/[0.03] md:col-span-2"
                    : "bg-white/[0.03] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex rounded-full border border-white/12 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/42">
                    {item.status}
                  </span>
                  <span className="text-xs uppercase tracking-[0.28em] text-white/22">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[0.02] px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">为什么会有它</p>
            <h2 className="mt-4 max-w-[12ch] text-[2rem] font-semibold tracking-tight text-white sm:max-w-none sm:text-4xl">
              这个项目不是因为我想做一个工具，
              <span className="whitespace-nowrap">而是因为我也经历过那段时间。</span>
            </h2>
            <SectionFrame className="max-w-sm rounded-[26px] border border-white/10 bg-black/35 sm:rounded-[28px]">
              <div className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-white/30">不是不会做</p>
                <p className="mt-3 text-[1.02rem] leading-8 text-white sm:mt-4 sm:text-lg">
                  很多时候，卡住并不是因为你不够努力，而是这件事本来就很耗人。
                </p>
              </div>
            </SectionFrame>
          </div>

          <div className="space-y-5 text-sm leading-8 text-white/68 sm:text-base">
            <p>
              我知道整理作品集为什么会拖很久。很多时候不是你不会做，而是这件事真的太耗人了。
            </p>
            <p>
              你会反复想，这个项目到底值不值得放，这段经历应该怎么讲，这份作品集看起来到底像不像自己，现在这样拿出去投，会不会还是不够好。
            </p>
            <p>
              我不想再做一个只给你模板的工具。我更想做一个能陪你先把第一版搭起来，再慢慢把它讲清楚的东西。
            </p>
            <p className="border-l border-white/14 pl-5 text-white">
              如果集盒FolioBox能帮你少熬两个月，它就已经有价值。
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionFrame className="rounded-[26px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] sm:rounded-[28px]">
            <div className="p-5 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-white/30">首批用户</p>
              <h2 className="mt-4 text-[2rem] font-semibold tracking-tight text-white sm:text-4xl">
                给首批用户的一个承诺
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/68 sm:text-base">
                <p>
                  如果你是在 MVP 阶段就开始使用集盒FolioBox的用户，未来围绕“设计师求职表达”这条主线持续上线的重要能力，我会默认免费开放给你。
                </p>
                <p>
                  这不等于以后所有东西都永久免费。但只要它仍然属于这条主线，我希望首批用户能一直在里面。
                </p>
              </div>
              <div className="mt-7 rounded-[24px] border border-white/10 bg-black/35 p-5 sm:mt-8">
                <p className="text-xs uppercase tracking-[0.2em] text-white/30">我更在意的不是一次成交</p>
                <p className="mt-3 text-lg leading-8 text-white">
                  而是如果你在最早期愿意相信这条路，后面主线能力长出来时，你不需要被挡在外面。
                </p>
              </div>
            </div>
          </SectionFrame>

          <div className="grid gap-4">
            <div className="rounded-[26px] border border-white/10 bg-black/40 p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30">默认包含</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {includedPromiseItems.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/78"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-black/25 p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30">不默认包含</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {excludedPromiseItems.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-white/60"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5 sm:rounded-[28px] sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/30">这条承诺真正想表达什么</p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/68">
                {promiseNotes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-18 pt-1 sm:px-6 sm:pb-24 sm:pt-2">
        <SectionFrame className="mx-auto max-w-5xl rounded-[30px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] text-center sm:rounded-[32px]">
          <div className="px-5 py-9 sm:px-10 sm:py-14">
            <p className="text-xs uppercase tracking-[0.24em] text-white/30">接下来</p>
            <h2 className="mx-auto mt-4 max-w-[13ch] text-[2rem] font-semibold tracking-tight text-white sm:max-w-none sm:text-4xl">
              集盒FolioBox 现在还很早。
              <span className="whitespace-nowrap">但我希望它以后能变成一个更完整的东西。</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
              现在，它先从作品集整理开始。以后，如果这条路值得继续走下去，我希望它能帮更多设计师把求职表达这件事也一起整理清楚。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primaryCta.href}
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                {primaryCta.label}
              </Link>
              <Link
                href="/editorial/developers-note"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/14 px-6 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
              >
                读一页开发者说
              </Link>
            </div>
          </div>
        </SectionFrame>
      </section>

      <Footer />
    </main>
  );
}

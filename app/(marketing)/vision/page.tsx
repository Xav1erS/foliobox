import Link from "next/link";
import { auth } from "@/lib/auth";
import { Footer } from "@/components/marketing/Footer";
import { IsometricWireframe } from "@/components/marketing/IsometricWireframe";
import { Navbar } from "@/components/marketing/Navbar";
import { SectionFrame } from "@/components/marketing/SectionFrame";
import { getNavbarPrimaryAction } from "@/lib/marketing-cta";

const futureDirections = [
  {
    id: "01",
    title: "简历和作品集，先说同一件事",
    description:
      "把简历、作品集和面试里的核心信息先对齐。很多人不是没有内容，而是三套说法各讲各的。",
    status: "未来方向",
  },
  {
    id: "02",
    title: "针对目标岗位，知道该强调什么",
    description:
      "同一个项目，面对不同岗位，重点并不一样。以后它不只告诉你哪里不够好，也会告诉你该把什么讲得更清楚。",
    status: "未来方向",
  },
  {
    id: "03",
    title: "把项目讲成一段真的讲得出口的话",
    description:
      "作品集整理完了，面试时还是可能卡住。未来它应该继续往前一步，帮你把讲述也整理出来。",
    status: "未来方向",
  },
  {
    id: "04",
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

const devNarratives = [
  "我知道整理作品集为什么会拖很久。很多时候不是你不会做，而是这件事真的太耗人了。",
  "你会反复想，这个项目到底值不值得放，这段经历应该怎么讲，这份作品集看起来到底像不像自己，现在这样拿出去投，会不会还是不够好。",
  "我不想再做一个只给你模板的工具。我更想做一个能陪你先把第一版搭起来，再慢慢把它讲清楚的东西。",
];

export default async function VisionPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const primaryCta = getNavbarPrimaryAction(isLoggedIn);

  return (
    <main className="bg-black text-white">
      <Navbar isLoggedIn={isLoggedIn} currentPage="vision" />

      {/* ─────────────────────────────────────────
          Section 1: 首屏 Hero
      ───────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 sm:pt-28">
        {/* Subtle grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
          {/* Section label */}
          <div className="mb-8 flex items-center gap-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
              公开愿景
            </p>
            <span className="h-px w-8 bg-white/15" />
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/20">
              集盒FolioBox
            </p>
          </div>

          {/* Title */}
          <h1 className="text-[2.8rem] font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-[4.5rem]">
            <span className="block">集盒FolioBox</span>
            <span className="block">现在从作品集</span>
            <span className="block">整理开始。</span>
          </h1>

          {/* Subtitle */}
          <div className="mt-8 max-w-xl space-y-4 text-sm leading-[1.9] text-white/60 sm:text-base">
            <p>
              我知道整理作品集很难开始。很多时候不是你不会做，而是这件事本身就很耗人。
            </p>
            <p>
              所以我先把集盒FolioBox做成了现在这个样子：帮你评分、整理项目、补齐关键信息，先把第一版做出来。
            </p>
            <p className="text-white/90">但我想做的，不只是一个作品集工具。</p>
          </div>

          {/* Highlight strip */}
          <div className="mt-10 border border-white/10 sm:flex">
            {[
              { label: "现在能做", value: "评分、整理项目、补齐关键信息，先把第一版做出来" },
              { label: "以后想补", value: "一致性检查、岗位映射、面试讲述，不只是更多模板" },
              { label: "给早期用户", value: "围绕求职表达主线持续上线的重要能力，会默认免费开放" },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`px-5 py-4 sm:flex-1 ${
                  i !== 0 ? "border-t border-white/[0.07] sm:border-l sm:border-t-0" : ""
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
                  {item.label}
                </p>
                <p className="mt-2.5 text-sm leading-[1.75] text-white/65">{item.value}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryCta.href}
              className="inline-flex h-12 items-center justify-center border border-white bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              {primaryCta.label}
            </Link>
            <Link
              href="/editorial/developers-note"
              className="inline-flex h-12 items-center justify-center border border-white/15 px-6 text-sm text-white/65 transition-colors hover:border-white/30 hover:text-white"
            >
              先读开发者说
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          Section 2: 问题定义
      ───────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">

            {/* Left */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
                为什么不只做工具
              </p>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.8rem]">
                作品集从来不是<br />
                问题的全部。
              </h2>
              <p className="mt-5 text-sm leading-[1.9] text-white/62 sm:text-base">
                很多设计师卡住，不是因为不会排版，也不是因为没有项目。真正难的，往往是求职表达本身。
              </p>
              {/* Pull quote */}
              <div className="mt-8 border-l-2 border-white/20 pl-5">
                <p className="text-base leading-[1.85] text-white/80 sm:text-lg">
                  我知道这件事很难，我想先陪你把第一版做出来。
                </p>
              </div>
            </div>

            {/* Right: 4 problems as row list */}
            <div className="border-t border-white/10 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              {coreProblems.map((problem, i) => (
                <div
                  key={problem}
                  className={`flex gap-5 py-5 ${
                    i < coreProblems.length - 1 ? "border-b border-white/[0.07]" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0 font-mono text-[11px] tracking-[0.2em] text-white/25">
                    0{i + 1}
                  </span>
                  <p className="text-sm leading-[1.85] text-white/70 sm:text-base">{problem}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          Section 3: 长期方向
      ───────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <div className="mb-10 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
                长期方向
              </p>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.8rem]">
                如果它继续往前走，<br />
                我最想补的不是更多模板。
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-[1.9] text-white/40 sm:text-right">
              这些能力现在还没上线，<br className="hidden sm:block" />
              但都属于同一条主线。
            </p>
          </div>

          {/* 4-item grid */}
          <div className="grid border border-white/10 sm:grid-cols-2">
            {futureDirections.map((item, i) => (
              <article
                key={item.title}
                className={`px-5 py-6 sm:px-6 sm:py-7 ${
                  i >= 2 ? "border-t border-white/[0.07]" : ""
                } ${i % 2 === 1 ? "sm:border-l sm:border-white/[0.07]" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
                    {item.status}
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.25em] text-white/20">
                    {item.id}
                  </span>
                </div>
                <h3 className="mt-4 text-[1.05rem] font-semibold leading-[1.35] tracking-[-0.02em] text-white sm:text-xl">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-[1.85] text-white/60 sm:text-base">
                  {item.description}
                </p>
              </article>
            ))}
          </div>

          {/* Vision diagram */}
          <div className="mt-8 border border-white/10 p-5 sm:p-7">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.3em] text-white/25">
              系统结构图
            </p>
            <IsometricWireframe className="mx-auto max-w-2xl opacity-75" />
            <p className="mt-5 border-t border-white/[0.07] pt-4 text-[11px] leading-[1.7] text-white/30">
              四个模块，最终回到同一个工作台。现在只有第一个在线上。
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          Section 4: 开发者动机
      ───────────────────────────────────────── */}
      <section className="border-t border-white/10 bg-white/[0.015] px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">

            {/* Left */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
                为什么会有它
              </p>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.8rem]">
                不是因为我想做<br />
                一个工具，而是因为<br />
                我也经历过那段时间。
              </h2>
              {/* Callout */}
              <SectionFrame
                className="mt-8 border border-white/10 bg-black/25"
                noGrid
              >
                <div className="px-5 py-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/25">
                    不是不会做
                  </p>
                  <p className="mt-3 text-base leading-[1.85] text-white/80 sm:text-lg">
                    很多时候，卡住并不是因为你不够努力，而是这件事本来就很耗人。
                  </p>
                </div>
              </SectionFrame>
            </div>

            {/* Right: narrative paragraphs */}
            <div className="border-t border-white/10 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              {devNarratives.map((para, i) => (
                <p
                  key={i}
                  className={`py-5 text-sm leading-[1.9] text-white/65 sm:text-base ${
                    i < devNarratives.length - 1 ? "border-b border-white/[0.07]" : ""
                  }`}
                >
                  {para}
                </p>
              ))}
              <p className="border-t border-white/10 py-5 text-sm leading-[1.9] text-white/88 sm:text-base">
                如果集盒FolioBox能帮你少熬两个月，它就已经有价值。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          Section 5: 首批用户承诺
      ───────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">

            {/* Left */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
                首批用户
              </p>
              <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.6rem]">
                给首批用户的<br />
                一个承诺
              </h2>
              <div className="mt-6 space-y-4 text-sm leading-[1.9] text-white/62 sm:text-base">
                <p>
                  如果你是在 MVP 阶段就开始使用集盒FolioBox的用户，未来围绕"设计师求职表达"这条主线持续上线的重要能力，我会默认免费开放给你。
                </p>
                <p>
                  这不等于以后所有东西都永久免费。但只要它仍然属于这条主线，我希望首批用户能一直在里面。
                </p>
              </div>
              {/* Key sentiment */}
              <div className="mt-7 border-l-2 border-white/20 pl-5">
                <p className="text-base leading-[1.85] text-white/78 sm:text-lg">
                  我更在意的不是一次成交，而是如果你在最早期愿意相信这条路，后面主线能力长出来时，你不需要被挡在外面。
                </p>
              </div>
            </div>

            {/* Right: included / excluded lists */}
            <div className="space-y-5">
              <div className="border border-white/10">
                <div className="border-b border-white/[0.07] px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
                    默认包含
                  </p>
                </div>
                {includedPromiseItems.map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-4 px-5 py-3.5 ${
                      i < includedPromiseItems.length - 1 ? "border-b border-white/[0.07]" : ""
                    }`}
                  >
                    <span className="h-1 w-1 shrink-0 bg-white/40" />
                    <span className="text-sm text-white/72">{item}</span>
                  </div>
                ))}
              </div>

              <div className="border border-white/10">
                <div className="border-b border-white/[0.07] px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
                    不默认包含
                  </p>
                </div>
                {excludedPromiseItems.map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-4 px-5 py-3.5 ${
                      i < excludedPromiseItems.length - 1 ? "border-b border-white/[0.07]" : ""
                    }`}
                  >
                    <span className="h-1 w-1 shrink-0 bg-white/20" />
                    <span className="text-sm text-white/45">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          Section 6: 收尾
      ───────────────────────────────────────── */}
      <section className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
            接下来
          </p>
          <h2 className="mt-6 text-[1.9rem] font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-[2.8rem]">
            集盒FolioBox 现在还很早。<br />
            但我希望它以后能变成<br />
            一个更完整的东西。
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-[1.9] text-white/60 sm:text-base">
            现在，它先从作品集整理开始。以后，如果这条路值得继续走下去，我希望它能帮更多设计师把求职表达这件事也一起整理清楚。
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={primaryCta.href}
              className="inline-flex h-12 items-center justify-center border border-white bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              {primaryCta.label}
            </Link>
            <Link
              href="/editorial/developers-note"
              className="inline-flex h-12 items-center justify-center border border-white/15 px-7 text-sm text-white/65 transition-colors hover:border-white/30 hover:text-white"
            >
              读一页开发者说
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

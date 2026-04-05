import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

function UploadMock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col items-center gap-1">
          <div className="h-3 w-px bg-white/30" />
          <div className="h-px w-3 bg-white/30" />
        </div>
      </div>
      <div className="h-2 w-20 bg-white/[0.08]" />
      <div className="h-1.5 w-14 bg-white/[0.06]" />
      <div className="mt-1 flex gap-1.5">
        <div className="h-5 w-14 border border-white/[0.06] bg-white/[0.08]" />
        <div className="h-5 w-12 border border-white/10 bg-white/10" />
      </div>
    </div>
  );
}

function FormMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 p-4">
      {[
        { label: 28, value: 60 },
        { label: 24, value: 80 },
        { label: 28, value: 50 },
        { label: 24, value: 70 },
      ].map((f, i) => (
        <div key={i}>
          <div className="mb-1 h-1.5 bg-white/[0.06]" style={{ width: f.label }} />
          <div className="flex h-6 w-full items-center border border-white/[0.08] bg-white/[0.03] px-2">
            <div className="h-1.5 bg-white/[0.08]" style={{ width: `${f.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OutlineMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4">
      <div className="mb-1 h-2 w-20 bg-white/10" />
      {[
        { indent: 0, w: "85%", accent: true },
        { indent: 12, w: "70%" },
        { indent: 12, w: "65%" },
        { indent: 0, w: "80%", accent: true },
        { indent: 12, w: "60%" },
        { indent: 12, w: "72%" },
        { indent: 0, w: "75%", accent: true },
      ].map((row, i) => (
        <div key={i} className="flex items-center gap-1.5" style={{ paddingLeft: row.indent }}>
          <div className={`h-1.5 w-1.5 shrink-0 ${row.accent ? "bg-white/30" : "bg-white/10"}`} />
          <div className={`h-1.5 ${row.accent ? "bg-white/15" : "bg-white/[0.07]"}`} style={{ width: row.w }} />
        </div>
      ))}
    </div>
  );
}

function GenerateMock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="relative flex h-14 w-14 items-center justify-center border border-white/10 bg-white/[0.04]">
        <div className="h-3 w-3 bg-white/30" />
        <div className="absolute inset-0 border border-white/[0.06]" style={{ transform: "scale(1.3)" }} />
        <div className="absolute inset-0 border border-white/[0.04]" style={{ transform: "scale(1.6)" }} />
      </div>
      <div className="w-full space-y-2">
        <div className="h-2 w-full overflow-hidden bg-white/[0.06]">
          <div className="h-full w-3/4 bg-emerald-500/40" />
        </div>
        <div className="flex justify-between">
          <div className="h-1.5 w-12 bg-white/[0.06]" />
          <div className="h-1.5 w-8 bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function ExportMock() {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex-1 border border-white/[0.08] bg-white/[0.02] p-2">
        <div className="mb-1.5 h-2 w-2/3 bg-white/10" />
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-white/[0.07]" />
          <div className="h-1.5 w-4/5 bg-white/[0.07]" />
          <div className="h-1.5 w-full bg-white/[0.07]" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-1 items-center justify-center gap-1 border border-white/10 bg-white/[0.04] py-2">
          <div className="h-1.5 w-8 bg-white/15" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 border border-white/[0.06] bg-white/[0.02] py-2">
          <div className="h-1.5 w-8 bg-white/[0.08]" />
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    step: "01",
    title: "导入设计稿和简历",
    body: "粘贴 Figma 链接或上传图片，也可以把简历一起放进来。我先从你已经有的素材开始整理。",
    tag: "免费",
    Mock: UploadMock,
  },
  {
    step: "02",
    title: "补充项目关键信息",
    body: "补上项目背景、个人角色、核心挑战和设计结果。不是让你从零重写，而是先把最关键的事实补齐。",
    tag: "分步引导",
    Mock: FormMock,
  },
  {
    step: "03",
    title: "AI 生成结构和第一版初稿",
    body: "AI 会根据你的真实信息先搭出作品集大纲和第一版初稿。不是模板拼接，而是先帮你把项目讲明白。",
    tag: "AI 生成",
    Mock: GenerateMock,
  },
  {
    step: "04",
    title: "手动调整内容和顺序",
    body: "第一版出来以后，你可以继续编辑文案、调整板块顺序、补充图片。它不是终稿，只是一个终于可以往前推的起点。",
    tag: "可编辑",
    Mock: OutlineMock,
  },
  {
    step: "05",
    title: "再修改，再导出",
    body: "你可以继续改，再导出链接或 PDF 去投递和分享。重点不是一步到位，而是先从空白状态走出来。",
    tag: "链接 / PDF",
    Mock: ExportMock,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-28">
      <div className="mx-auto" style={{ maxWidth: 1200 }}>
        <div className="grid gap-16 items-start lg:grid-cols-[320px_1fr] lg:gap-24">
          {/* Left: sticky heading */}
          <div className="lg:sticky lg:top-24">
            <SectionEyebrow label="使用流程" className="mb-3" />
            <h2 className="font-bold tracking-tight text-white">
              <span className="block text-[2.6rem] leading-[0.96] tracking-[-0.05em] sm:hidden">
                <span className="block whitespace-nowrap">先把最难开始的</span>
                <span className="mt-2 block whitespace-nowrap">那一段做掉</span>
              </span>
              <span className="hidden text-4xl md:text-5xl sm:block">
                先把最难开始的
                <br />
                那一段做掉
              </span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              不需要从零开始排版，也不用一上来就把每句话都想清楚。
              先按步骤把真实信息补齐，再慢慢把第一版拉起来。
            </p>
          </div>

          {/* Right: steps */}
          <div className="flex flex-col">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="grid grid-cols-1 gap-4 border-t border-white/6 py-8 last:border-b last:border-white/6 sm:grid-cols-[1fr_180px] sm:gap-8"
              >
                {/* Content */}
                <div className="flex gap-6">
                  <span className="mt-0.5 shrink-0 font-mono text-sm text-white/40">
                    {item.step}
                  </span>
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-[15px] font-semibold text-white">{item.title}</h3>
                      <span className="border border-white/10 px-2 py-0.5 text-xs text-white/40">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/50">{item.body}</p>
                  </div>
                </div>

                {/* Thumbnail mock */}
                <div className="overflow-hidden border border-white/[0.07] bg-white/[0.02]" style={{ height: 120 }}>
                  <item.Mock />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

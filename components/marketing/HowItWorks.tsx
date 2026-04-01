function UploadMock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col items-center gap-1">
          <div className="h-3 w-px bg-white/30" />
          <div className="h-px w-3 bg-white/30" />
        </div>
      </div>
      <div className="h-2 w-20 rounded-full bg-white/[0.08]" />
      <div className="h-1.5 w-14 rounded-full bg-white/[0.06]" />
      <div className="mt-1 flex gap-1.5">
        <div className="h-5 w-14 rounded bg-white/[0.08] border border-white/[0.06]" />
        <div className="h-5 w-12 rounded bg-white/10 border border-white/10" />
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
          <div className="mb-1 h-1.5 rounded-full bg-white/[0.06]" style={{ width: f.label }} />
          <div className="h-6 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 flex items-center">
            <div className="h-1.5 rounded-full bg-white/[0.08]" style={{ width: `${f.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OutlineMock() {
  return (
    <div className="flex h-full flex-col justify-center gap-2 p-4">
      <div className="mb-1 h-2 w-20 rounded bg-white/10" />
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
          <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${row.accent ? "bg-white/30" : "bg-white/10"}`} />
          <div className={`h-1.5 rounded-full ${row.accent ? "bg-white/15" : "bg-white/[0.07]"}`} style={{ width: row.w }} />
        </div>
      ))}
    </div>
  );
}

function GenerateMock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <div className="h-3 w-3 rounded-full bg-white/30" />
        <div className="absolute inset-0 rounded-full border border-white/[0.06]" style={{ transform: "scale(1.3)" }} />
        <div className="absolute inset-0 rounded-full border border-white/[0.04]" style={{ transform: "scale(1.6)" }} />
      </div>
      <div className="w-full space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-3/4 rounded-full bg-emerald-500/40" />
        </div>
        <div className="flex justify-between">
          <div className="h-1.5 w-12 rounded-full bg-white/[0.06]" />
          <div className="h-1.5 w-8 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function ExportMock() {
  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
        <div className="mb-1.5 h-2 w-2/3 rounded bg-white/10" />
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-white/[0.07]" />
          <div className="h-1.5 w-4/5 rounded-full bg-white/[0.07]" />
          <div className="h-1.5 w-full rounded-full bg-white/[0.07]" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] py-2">
          <div className="h-1.5 w-8 rounded bg-white/15" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] py-2">
          <div className="h-1.5 w-8 rounded bg-white/[0.08]" />
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    step: "01",
    title: "导入设计稿和简历",
    body: "粘贴 Figma 链接或上传图片，同时上传个人简历。系统自动解析可用素材。",
    tag: "免费",
    Mock: UploadMock,
  },
  {
    step: "02",
    title: "补充项目关键信息",
    body: "填写项目背景、个人角色、核心挑战与设计结果。系统会提示缺失项，不需要从头写。",
    tag: "分步引导",
    Mock: FormMock,
  },
  {
    step: "03",
    title: "AI 生成结构和第一版初稿",
    body: "由 AI 根据你的真实信息生成作品集大纲与初稿，不是模板拼接，是按你的项目重新叙述。生成前可预览结构，确认再继续。",
    tag: "AI 生成",
    Mock: GenerateMock,
  },
  {
    step: "04",
    title: "手动调整内容和顺序",
    body: "AI 生成第一版后，你可以继续编辑文案、调整板块顺序、补充图片，完全可控。",
    tag: "可编辑",
    Mock: OutlineMock,
  },
  {
    step: "05",
    title: "再修改，再导出",
    body: "在线编辑文案和图片顺序，导出专属链接或 PDF，直接用于投递和分享。",
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
            <p className="mb-3 text-xs uppercase tracking-widest text-white/35">
              使用流程
            </p>
            <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
              10–20 分钟，
              <br />
              从项目素材到
              <br />
              作品集初稿
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              不需要从零开始排版，不需要自己写文案。
              按步骤补充真实信息，AI 帮你整理成型。
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
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/40">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/50">{item.body}</p>
                  </div>
                </div>

                {/* Thumbnail mock */}
                <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]" style={{ height: 120 }}>
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

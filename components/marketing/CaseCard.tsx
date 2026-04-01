import { ArrowRight } from "lucide-react";

interface CaseCardProps {
  title: string;
  role: string;
  tags: string[];
  scoreBefore: number;
  scoreAfter: number;
  description: string;
  index?: number;
}

function DashboardMock() {
  return (
    <div className="flex h-full flex-col">
      {/* Top stripe */}
      <div className="flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
        <span className="text-[10px] font-medium text-emerald-400/70">B 端 · 中后台系统</span>
      </div>
      <div className="flex flex-1">
        <div className="h-full w-9 shrink-0 border-r border-white/[0.06] bg-white/[0.02] p-2">
          <div className="mb-3 h-3 w-3 rounded bg-white/15" />
          <div className="space-y-2">
            {[70, 90, 60, 80, 55].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-white/[0.08]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="flex-1 p-3">
          <div className="mb-3 h-2 w-1/2 rounded bg-white/10" />
          <div className="mb-2.5 grid grid-cols-3 gap-1.5">
            {[
              { h: "bg-emerald-500/30" },
              { h: "bg-white/10" },
              { h: "bg-amber-500/25" },
            ].map((c, i) => (
              <div key={i} className="rounded bg-white/[0.04] p-2 border border-white/[0.06]">
                <div className={`mb-1 h-3 w-5 rounded ${c.h}`} />
                <div className="h-1.5 w-full rounded bg-white/[0.07]" />
              </div>
            ))}
          </div>
          <div className="h-10 rounded bg-white/[0.03] border border-white/[0.06] p-2">
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-white/[0.07]" />
              <div className="h-1.5 w-4/5 rounded-full bg-white/[0.07]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileMock() {
  return (
    <div className="flex h-full flex-col">
      {/* Top stripe */}
      <div className="flex items-center gap-2 border-b border-blue-500/20 bg-blue-500/[0.07] px-3 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60" />
        <span className="text-[10px] font-medium text-blue-400/70">C 端 · App 产品</span>
      </div>
      <div className="flex flex-1 items-center justify-center gap-3 px-4">
        {[
          { accent: "bg-blue-500/30" },
          { accent: "bg-blue-400/20" },
        ].map((s, i) => (
          <div key={i} className="h-[104px] w-[60px] rounded-xl border border-white/10 bg-white/[0.04] p-2" style={{ transform: i === 1 ? "translateY(8px)" : undefined }}>
            <div className="mb-1.5 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <div className="h-1.5 w-8 rounded bg-white/10" />
            </div>
            <div className={`mb-1.5 h-7 w-full rounded ${s.accent}`} />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-white/[0.08]" />
              <div className="h-1.5 w-3/4 rounded-full bg-white/[0.08]" />
            </div>
            <div className="mt-1.5 h-4 w-full rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentMock() {
  return (
    <div className="flex h-full flex-col">
      {/* Top stripe */}
      <div className="flex items-center gap-2 border-b border-violet-500/20 bg-violet-500/[0.07] px-3 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-violet-400/60" />
        <span className="text-[10px] font-medium text-violet-400/70">G 端 · 流程与系统</span>
      </div>
      <div className="flex flex-1 flex-col gap-0 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-2.5 w-1/3 rounded bg-white/15" />
          <div className="h-5 w-12 rounded bg-white/[0.06] border border-white/[0.08]" />
        </div>
        <div className="flex-1 space-y-1.5">
          {[
            { w: "100%", indent: 0 },
            { w: "85%", indent: 12 },
            { w: "70%", indent: 12 },
            { w: "90%", indent: 0 },
            { w: "75%", indent: 12 },
            { w: "60%", indent: 12 },
            { w: "95%", indent: 0 },
          ].map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              style={{ paddingLeft: row.indent }}
            >
              {row.indent > 0 && <div className="h-1 w-1 shrink-0 rounded-full bg-white/15" />}
              <div className="h-1.5 rounded-full bg-white/[0.08]" style={{ width: row.w }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MOCK_COMPONENTS = [DashboardMock, MobileMock, DocumentMock];

export function CaseCard({
  title,
  role,
  tags,
  scoreBefore,
  scoreAfter,
  description,
  index = 0,
}: CaseCardProps) {
  const MockComponent = MOCK_COMPONENTS[index % 3];

  return (
    <div className="group flex flex-col rounded-2xl bg-white/[0.02] transition-all duration-300 hover:bg-white/[0.05] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Mock preview image */}
      <div className="relative overflow-hidden rounded-t-2xl border-b border-white/[0.06] bg-white/[0.02]" style={{ height: 148 }}>
        <MockComponent />
      </div>

      {/* Card content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Score pill + demo badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-white/35">
            演示案例
          </span>
          <span className="h-3 w-px bg-white/[0.08]" />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-md bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/40 line-through">
            {scoreBefore}
          </span>
          <ArrowRight className="h-3 w-3 text-white/20" />
          <span className="rounded-md bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-400">
            {scoreAfter} 分
          </span>
        </div>

        {/* Title block */}
        <h3 className="text-[15px] font-semibold leading-snug text-white">{title}</h3>
        <p className="mt-1 text-xs text-white/45">{role}</p>

        {/* Description */}
        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/55">{description}</p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/8 px-2.5 py-0.5 text-xs text-white/45"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export const EXAMPLE_CASES = [
  {
    title: "企业数据中台改版",
    role: "UX 设计师 · B 端 / 企业系统",
    tags: ["B 端", "数据可视化", "信息架构"],
    scoreBefore: 51,
    scoreAfter: 84,
    description:
      "原始作品集只有截图，缺少背景与决策说明。重制后清晰展现了信息架构重组思路与数据看板的复杂度价值。",
  },
  {
    title: "消费金融 App 账单体验优化",
    role: "产品设计师 · C 端 / 金融",
    tags: ["C 端", "用户体验", "增长设计"],
    scoreBefore: 58,
    scoreAfter: 89,
    description:
      "有完整设计稿但角色表达模糊。补充项目事实后，生成版本突出了个人在用户路径重构中的核心判断。",
  },
  {
    title: "政务服务平台无障碍升级",
    role: "高级 UI 设计师 · G 端 / 无障碍",
    tags: ["G 端", "无障碍", "系统设计"],
    scoreBefore: 44,
    scoreAfter: 81,
    description:
      "G 端项目很难展示视觉亮点，重制版本用结构化叙事代替截图堆砌，清楚说明了合规背景与设计价值。",
  },
];

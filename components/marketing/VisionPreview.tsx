import Link from "next/link";
import { IsometricWireframe } from "@/components/marketing/IsometricWireframe";

const futureItems = [
  { id: "01", label: "简历对齐", status: "未来方向" },
  { id: "02", label: "岗位定向", status: "未来方向" },
  { id: "03", label: "面试讲述", status: "未来方向" },
  { id: "04", label: "同一工作台", status: "长期方向" },
];

export function VisionPreview() {
  return (
    <section id="vision-preview" className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">

          {/* Left: text + future items + CTA */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/30">
              长期方向
            </p>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[2.6rem]">
              不只想做一个<br />
              作品集工具
            </h2>
            <p className="mt-5 text-sm leading-[1.9] text-white/62 sm:text-base">
              我现在先从作品集整理开始做，是因为它最具体，也最容易立刻帮上忙。
              但我真正想继续往前走的，是设计师求职表达这整条路。
            </p>
            <p className="mt-3 text-sm leading-[1.9] text-white/62 sm:text-base">
              作品集只是入口。后面我还想慢慢补上简历一致性、岗位匹配和面试讲述。
            </p>

            {/* Future items row list */}
            <div className="mt-8 border-t border-white/10">
              {futureItems.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between py-3 ${
                    i < futureItems.length - 1 ? "border-b border-white/[0.07]" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px] tracking-[0.2em] text-white/25">
                      {item.id}
                    </span>
                    <span className="text-sm text-white/65">{item.label}</span>
                  </div>
                  <span className="border border-white/10 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.15em] text-white/30">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/vision"
                className="inline-flex h-11 items-center justify-center border border-white bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                看看我想把它做成什么
              </Link>
              <Link
                href="/editorial/developers-note"
                className="inline-flex h-11 items-center justify-center border border-white/15 px-5 text-sm text-white/65 transition-colors hover:border-white/28 hover:text-white"
              >
                先读开发者说
              </Link>
            </div>
          </div>

          {/* Right: vision diagram in a structural frame */}
          <div className="border border-white/10 p-5 sm:p-7">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.3em] text-white/25">
              系统结构 / 规划方向
            </p>
            <IsometricWireframe className="mx-auto max-w-full opacity-80" />
            <p className="mt-5 border-t border-white/[0.07] pt-4 text-[11px] leading-[1.8] text-white/30">
              四个模块，最终回到同一个工作台。现在只有第一个。
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

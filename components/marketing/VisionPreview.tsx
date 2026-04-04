import { IndexedRowList } from "@/components/marketing/IndexedRowList";
import { IsometricWireframe } from "@/components/marketing/IsometricWireframe";
import { RectActionLink } from "@/components/marketing/RectActionLink";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

const futureItems = [
  { id: "01", title: "简历对齐", rightLabel: "未来方向" },
  { id: "02", title: "岗位定向", rightLabel: "未来方向" },
  { id: "03", title: "面试讲述", rightLabel: "未来方向" },
  { id: "04", title: "同一工作台", rightLabel: "长期方向" },
];

export function VisionPreview() {
  return (
    <section id="vision-preview" className="border-t border-white/10 px-5 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">

          {/* Left: text + future items + CTA */}
          <div>
            <SectionEyebrow label="长期方向" />
            <h2 className="mt-5 font-semibold leading-[1.05] tracking-[-0.04em] text-white">
              <span className="block text-[2.4rem] leading-[0.98] sm:hidden">
                <span className="block">不只想做一个</span>
                <span className="mt-2 block">作品集工具</span>
              </span>
              <span className="hidden text-[2rem] sm:text-[2.6rem] sm:block">
                不只想做一个
                <br />
                作品集工具
              </span>
            </h2>
            <p className="mt-5 text-sm leading-[1.9] text-white/62 sm:text-base">
              我现在先从作品集整理开始做，是因为它最具体，也最容易立刻帮上忙。
              但我真正想继续往前走的，是设计师求职表达这整条路。
            </p>
            <p className="mt-3 text-sm leading-[1.9] text-white/62 sm:text-base">
              作品集只是入口。后面我还想慢慢补上简历一致性、岗位匹配和面试讲述。
            </p>

            <IndexedRowList items={futureItems} className="mt-8" itemClassName="py-3" />

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <RectActionLink href="/vision" variant="solid">
                看看我想把它做成什么
              </RectActionLink>
              <RectActionLink href="/editorial/developers-note">
                先读开发者说
              </RectActionLink>
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

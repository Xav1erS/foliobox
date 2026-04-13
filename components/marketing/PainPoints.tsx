const CORE_PAIN_POINTS = [
  {
    num: "01",
    title: "有项目，但不会整理成作品集",
    body: "页面多、稿子乱，不知道该选哪几张展示。素材整理、排版、写说明一套下来，很容易把人直接拖住。",
  },
  {
    num: "02",
    title: "不知道该选哪些内容展示",
    body: "做了很多，但不确定哪个项目值得放、每个项目该展示哪几页、篇幅该怎么分配。",
  },
  {
    num: "03",
    title: "会做设计，但讲不清自己的角色和价值",
    body: "只会放截图，不知道怎么写背景、设计判断和个人贡献。看的人最后也很难知道你到底解决了什么问题。",
  },
];

const SECONDARY_PAIN_POINTS = [
  {
    title: "临近投递才开始整理",
    body: "越临近越焦虑，越焦虑越拖，最后仓促交出一份自己都不满意的作品集。",
  },
  {
    title: "B 端 / G 端项目不知道怎么包装",
    body: "企业系统、政务平台视觉克制，裸放截图没说服力，但真实价值往往更高。",
  },
  {
    title: "简历和作品集说的不是同一件事",
    body: "两份材料侧重点不一致，会直接影响招聘方对你的判断和信任度。",
  },
];

export function PainPoints() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto" style={{ maxWidth: 1280 }}>
        <div className="grid gap-16 lg:grid-cols-[380px_1fr] lg:gap-24">
          {/* Left: heading */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionEyebrow label="设计师真实痛点" className="mb-3" />
            <h2 className="font-bold tracking-tight text-white">
              <span className="block text-[2.8rem] leading-[0.98] tracking-[-0.05em] sm:hidden">
                <span className="block">不是没有项目，</span>
                <span className="mt-2 block">是不会整理</span>
              </span>
              <span className="hidden text-4xl md:text-5xl sm:block">
                不是没有项目，
                <br />
                是不会整理
              </span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/50">
              大多数设计师卡在这里，不是不会做设计，而是没人帮你把表达这件事先理顺。
            </p>
          </div>

          {/* Right: pain points */}
          <div>
            {/* Core 3 — prominent */}
            <div className="flex flex-col">
              {CORE_PAIN_POINTS.map((item) => (
                <div
                  key={item.num}
                  className="flex gap-6 border-t border-white/8 py-7 last:border-b last:border-white/8"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-sm text-white/20">{item.num}</span>
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-white">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-white/55">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Secondary 3 — smaller, grid */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {SECONDARY_PAIN_POINTS.map((item) => (
                <div
                  key={item.title}
                  className="border border-white/6 bg-white/2 p-5"
                >
                  <h4 className="mb-2 text-sm font-medium text-white/60">{item.title}</h4>
                  <p className="text-xs leading-relaxed text-white/45">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";

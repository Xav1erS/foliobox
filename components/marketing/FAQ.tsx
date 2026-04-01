const FAQS = [
  {
    q: "没有完整作品集也能用吗？",
    a: "可以。只要有设计稿截图或 Figma 文件，补充项目关键信息后即可生成初稿。产品专门针对「有素材但还没整理」的状态设计。",
  },
  {
    q: "支持哪些输入方式？",
    a: "MVP 阶段主要支持 Figma 链接导入、图片上传和个人简历上传。即时设计、Pixso 等国内平台的深度接入在后续版本中逐步支持。",
  },
  {
    q: "生成后还能继续编辑吗？",
    a: "可以。所有文案和图片顺序都可以在线修改。AI 生成的是可编辑初稿，不是不可修改的成品。",
  },
  {
    q: "项目内容会不会泄露？",
    a: "上传的图片和项目信息仅用于当次生成，不会被用于模型训练，也不会展示给其他用户。敏感页面可在展示确认步骤中手动排除。",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-6 py-28">
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        <div className="mb-12">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/35">
            常见问题
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-white">FAQ</h2>
        </div>

        <div className="flex flex-col">
          {FAQS.map((item, i) => (
            <div
              key={item.q}
              className="grid grid-cols-[auto_1fr] gap-6 border-t border-white/8 py-7 last:border-b last:border-white/8"
            >
              <span className="mt-0.5 font-mono text-sm text-white/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="mb-2 text-[15px] font-semibold text-white">{item.q}</h3>
                <p className="text-sm leading-relaxed text-white/55">{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

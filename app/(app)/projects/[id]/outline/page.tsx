// 大纲确认页 — 待实现
// 参考 Spec 5.1 § 11）大纲确认页：板块结构 / 风格选择 / 缩略图确认
export default async function OutlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-bold">确认作品集大纲</h1>
      <p className="mt-2 text-neutral-500">
        项目 {id}：确认板块结构、风格与封面图，再开始渲染。
      </p>
    </div>
  );
}

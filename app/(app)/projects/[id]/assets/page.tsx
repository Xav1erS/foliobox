// 展示页确认页 — 待实现
// 参考 Spec 5.1 § 9）展示页确认页：缩略图列表 / 勾选 / 拖拽排序
export default async function AssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold">选择展示页</h1>
      <p className="mt-2 text-neutral-500">项目 {id}：勾选要展示的页面，拖拽排序。</p>
    </div>
  );
}

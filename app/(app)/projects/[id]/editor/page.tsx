// 生成结果页 / 编辑页 — 待实现
// 参考 Spec 5.1 § 12）生成结果页/编辑页：版本切换 / 文案编辑 / 图片替换 / 导出
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex h-screen">
      {/* 编辑侧栏 */}
      <aside className="w-72 border-r bg-white p-4">
        <p className="text-sm font-semibold">编辑面板</p>
        <p className="mt-1 text-xs text-neutral-500">项目 {id}</p>
      </aside>
      {/* 预览画布 */}
      <main className="flex-1 overflow-auto bg-neutral-100 p-8">
        <p className="text-neutral-400">作品集预览区（待实现）</p>
      </main>
    </div>
  );
}

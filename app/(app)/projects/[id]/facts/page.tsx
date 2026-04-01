// 项目事实表单页 — 待实现
// 参考 Spec 5.1 § 10）项目事实表单页 + 5.6 字段设计
export default async function FactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold">项目事实</h1>
      <p className="mt-2 text-neutral-500">
        项目 {id}：填写项目背景、角色、挑战与结果。
      </p>
    </div>
  );
}

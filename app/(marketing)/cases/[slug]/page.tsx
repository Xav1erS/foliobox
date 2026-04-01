// 案例详情页（公开示例）— 待实现
// 参考 Spec 5.1 § 14）案例详情页
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-neutral-400">案例详情页 — {slug}（待实现）</p>
    </main>
  );
}

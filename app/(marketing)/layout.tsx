// 外部品牌壳层 — 深色背景、强设计感，参考 UXfolio 风格
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-black text-white antialiased">{children}</div>;
}

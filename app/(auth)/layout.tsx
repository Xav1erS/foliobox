// Auth 页面延续外部品牌壳层视觉气质
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
      {children}
    </div>
  );
}

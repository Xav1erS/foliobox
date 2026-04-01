import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden border-y border-white/8 px-6 py-20">
      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto flex flex-col items-center text-center" style={{ maxWidth: 1200 }}>
        <p className="mb-3 text-xs uppercase tracking-widest text-white/35">
          开始使用
        </p>
        <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          你的作品集，
            <br />
            现在拿得出手了吗？
        </h2>
        <p className="mt-4 text-base text-white/55" style={{ maxWidth: 480 }}>
          先免费打分看看差距，再决定是否重制。不注册也能用。
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login?next=/score"
            className="flex h-12 min-w-[200px] items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            先给我的作品集打分
          </Link>
          <Link
            href="/login"
            className="flex h-12 min-w-[180px] items-center justify-center rounded-xl border border-white/15 px-8 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
          >
            直接开始整理作品集
          </Link>
        </div>
      </div>
    </section>
  );
}

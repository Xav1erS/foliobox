import Link from "next/link";
import { getHeroPrimaryAction } from "@/lib/marketing-cta";

export function CtaBanner({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const primaryAction = getHeroPrimaryAction(isLoggedIn);

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
          如果你愿意，
          <br />
          我想先陪你把第一版做出来
        </h2>
        <p className="mt-4 text-base text-white/55" style={{ maxWidth: 480 }}>
          先用评分看清问题，再决定下一步怎么整理。
          现在不用一上来就做到完美，先从能继续修改的第一版开始。
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href={primaryAction.href}
            className="flex h-12 min-w-[200px] items-center justify-center rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            {primaryAction.label}
          </Link>
          <Link
            href="/vision"
            className="text-sm text-white/55 transition-colors hover:text-white"
          >
            也可以先看看我想把它做成什么
          </Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { getHeroPrimaryAction, getHeroSecondaryAction } from "@/lib/marketing-cta";

export function CtaBanner({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const primaryAction = isLoggedIn
    ? getHeroPrimaryAction(isLoggedIn)
    : { href: "/score", label: "先看看现在能不能投" };
  const secondaryAction = isLoggedIn
    ? getHeroSecondaryAction(isLoggedIn)
    : { href: "/login?next=/projects?create=1", label: "开始整理第一版" };

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
        <h2 className="font-bold tracking-tight text-white">
          <span className="block text-[2.8rem] leading-[0.98] tracking-[-0.05em] sm:hidden">
            <span className="block">先判断现在</span>
            <span className="mt-2 block">该从哪一步开始</span>
          </span>
          <span className="hidden text-4xl md:text-5xl sm:block">
            先判断现在
            <br />
            该从哪一步开始
          </span>
        </h2>
        <p className="mt-4 text-base text-white/55" style={{ maxWidth: 480 }}>
          可以先评分，也可以直接开始整理。重点不是一上来就做到完美，而是先从最适合你的那一步开始。
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={primaryAction.href}
            className="marketing-control flex h-12 min-w-[200px] items-center justify-center bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            {primaryAction.label}
          </Link>
          <Link
            href={secondaryAction.href}
            className="marketing-control flex h-12 min-w-[200px] items-center justify-center border border-white/15 px-8 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            {secondaryAction.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

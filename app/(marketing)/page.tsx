import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { CaseCard, EXAMPLE_CASES } from "@/components/marketing/CaseCard";
import { PainPoints } from "@/components/marketing/PainPoints";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ScoreFeature } from "@/components/marketing/ScoreFeature";
import { FAQ } from "@/components/marketing/FAQ";
import { CtaBanner } from "@/components/marketing/CtaBanner";
import { Footer } from "@/components/marketing/Footer";
import { auth } from "@/lib/auth";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <main className="bg-black text-white">
      <Navbar isLoggedIn={isLoggedIn} />

      <Hero isLoggedIn={isLoggedIn} />

      {/* Case examples — 1280px */}
      <section id="cases" className="px-6 py-28">
        <div className="mx-auto" style={{ maxWidth: 1280 }}>
          <div className="mb-14">
            <p className="mb-3 text-xs uppercase tracking-widest text-white/25">
              案例展示
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                几种常见项目，整理成
                <br />
                作品集之后会是什么样
              </h2>
              <div className="max-w-xs sm:text-right">
                <p className="text-sm text-white/40">
                  B 端、G 端、C 端都做过。
                  <br />
                  不只是"好看项目"才能生成。
                </p>
                <p className="mt-1.5 text-xs text-white/20">基于真实求职场景构建的演示案例</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLE_CASES.map((c, i) => (
              <CaseCard key={c.title} {...c} index={i} />
            ))}
          </div>
        </div>
      </section>

      <PainPoints />

      <HowItWorks />

      <ScoreFeature />

      <FAQ />

      <CtaBanner isLoggedIn={isLoggedIn} />

      <Footer />
    </main>
  );
}

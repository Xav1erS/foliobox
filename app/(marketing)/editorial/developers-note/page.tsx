import { auth } from "@/lib/auth";
import { developersNoteContent } from "@/private-docs/llm-measurements/content/editorial/developers-note";
import { EditorialArticle } from "@/components/marketing/EditorialArticle";
import { EditorialCTA } from "@/components/marketing/EditorialCTA";
import { EditorialPageHeader } from "@/components/marketing/EditorialPageHeader";
import { Footer } from "@/components/marketing/Footer";
import { Navbar } from "@/components/marketing/Navbar";

export default async function DevelopersNotePage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <main className="bg-black text-white">
      <Navbar isLoggedIn={isLoggedIn} currentPage="editorial" />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/6" />

        <EditorialPageHeader
          eyebrow={developersNoteContent.eyebrow}
          title={developersNoteContent.title}
          subtitle={developersNoteContent.subtitle}
          introParagraphs={developersNoteContent.introParagraphs}
        />

        <section className="px-6 pb-20 pt-8 sm:pb-24 sm:pt-10">
          <div className="mx-auto max-w-4xl border-t border-white/8 pt-12">
            <EditorialArticle
              sections={developersNoteContent.sections}
              quotes={developersNoteContent.quotes}
            />
          </div>
        </section>
      </section>

      <EditorialCTA cta={developersNoteContent.cta} />

      <Footer />
    </main>
  );
}

import { auth } from "@/lib/auth";
import { developersNoteContent } from "@/content/editorial/developers-note";
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

      <EditorialPageHeader
        eyebrow={developersNoteContent.eyebrow}
        title={developersNoteContent.title}
        subtitle={developersNoteContent.subtitle}
        introParagraphs={developersNoteContent.introParagraphs}
      />

      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <EditorialArticle
            sections={developersNoteContent.sections}
            quotes={developersNoteContent.quotes}
          />
        </div>
      </section>

      <EditorialCTA cta={developersNoteContent.cta} />

      <Footer />
    </main>
  );
}

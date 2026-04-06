import { auth } from "@/lib/auth";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { LegalDocument } from "@/components/marketing/LegalDocument";
import { termsContent } from "@/private-docs/llm-measurements/content/legal/terms";

export default async function TermsPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <main className="bg-black text-white">
      <Navbar isLoggedIn={isLoggedIn} currentPage="legal" />
      <LegalDocument content={termsContent} />
      <Footer />
    </main>
  );
}

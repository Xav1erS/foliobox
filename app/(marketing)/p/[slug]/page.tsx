import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const portfolio = await db.publishedPortfolio.findUnique({
    where: { slug, isPublished: true },
  });

  if (!portfolio) notFound();

  // Render the stored HTML directly — it is sanitized on creation (escHtml)
  return (
    <div
      dangerouslySetInnerHTML={{ __html: portfolio.publishedHtml }}
    />
  );
}

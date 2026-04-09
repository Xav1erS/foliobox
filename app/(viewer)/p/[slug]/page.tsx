import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
import { PortfolioPublishedDocument } from "@/components/viewer/PortfolioPublishedDocument";

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const portfolio = await db.publishedPortfolio.findUnique({
    where: { slug, isPublished: true },
    include: {
      portfolio: {
        select: {
          name: true,
          contentJson: true,
        },
      },
    },
  });

  if (!portfolio) notFound();

  const content = portfolio.portfolio?.contentJson as PortfolioPackagingContent | null;
  if (portfolio.portfolio && content?.pages?.length) {
    return (
      <PortfolioPublishedDocument
        portfolioName={portfolio.portfolio.name}
        content={content}
      />
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: portfolio.publishedHtml }} />;
}

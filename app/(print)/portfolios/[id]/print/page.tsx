import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
import { PortfolioPublishedDocument } from "@/components/viewer/PortfolioPublishedDocument";

export default async function PortfolioPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      contentJson: true,
    },
  });

  if (!portfolio) notFound();

  const content = portfolio.contentJson as PortfolioPackagingContent | null;
  if (!content?.pages?.length) notFound();

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.addEventListener("load", function () { window.print(); });`,
        }}
      />
      <PortfolioPublishedDocument
        portfolioName={portfolio.name}
        content={content}
        printMode
      />
    </>
  );
}

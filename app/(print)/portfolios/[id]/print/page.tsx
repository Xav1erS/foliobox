import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
import { renderPortfolioPublishedHtml } from "@/lib/portfolio-publishing";

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

  const html = renderPortfolioPublishedHtml({
    portfolioName: portfolio.name,
    content,
  }).replace(
    "</head>",
    `<script>window.addEventListener("load", function () { window.print(); });</script></head>`
  );

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}


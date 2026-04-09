import { redirect } from "next/navigation";

export default async function PortfolioOutlineCompatibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/portfolios/${id}/editor`);
}

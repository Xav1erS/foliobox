import { redirect } from "next/navigation";

export default async function ProjectPackageCompatibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/editor`);
}

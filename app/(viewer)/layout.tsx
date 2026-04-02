import { PublicViewerShell } from "@/components/shells/PublicViewerShell";

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicViewerShell>{children}</PublicViewerShell>;
}

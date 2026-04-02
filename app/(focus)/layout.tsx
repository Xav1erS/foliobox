import { FocusShell } from "@/components/shells/FocusShell";

export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FocusShell>{children}</FocusShell>;
}

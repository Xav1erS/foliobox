export function ResumeContextBanner({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-sm leading-6 text-neutral-600">{children}</p>
    </div>
  );
}

export function ResumeContextBanner({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border border-neutral-300 bg-white/82 px-4 py-3 backdrop-blur-sm">
      <p className="text-sm leading-6 text-neutral-600">{children}</p>
    </div>
  );
}

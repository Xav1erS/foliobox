export function ResumeContextBanner({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-inline-tip px-4 py-3">
      <p className="app-text-secondary text-sm leading-6">{children}</p>
    </div>
  );
}

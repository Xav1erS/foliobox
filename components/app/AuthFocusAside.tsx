export function AuthFocusAside({
  eyebrow = "继续完成",
  title,
  points,
  footnote,
}: {
  eyebrow?: string;
  title: string;
  points: string[];
  footnote: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/2 p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-white/35">{eyebrow}</p>
      <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-white/55">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-white/45">
        {footnote}
      </div>
    </div>
  );
}

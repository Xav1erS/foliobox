export function EditorialQuoteCard({ quote }: { quote: string }) {
  return (
    <blockquote className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-6 sm:px-8">
      <p className="text-xl font-medium leading-9 tracking-tight text-white sm:text-2xl">
        “{quote}”
      </p>
    </blockquote>
  );
}

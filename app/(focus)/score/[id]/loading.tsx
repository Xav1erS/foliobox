function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-white/[0.06] ${className}`} />;
}

export default function ScoreResultLoading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="space-y-4">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-12 w-56" />
        <SkeletonBlock className="h-4 w-full max-w-2xl" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="border border-white/10 bg-white/[0.03] p-8">
          <SkeletonBlock className="h-4 w-20" />
          <div className="mt-5 flex items-end gap-3">
            <SkeletonBlock className="h-20 w-32" />
            <SkeletonBlock className="mb-2 h-8 w-20" />
          </div>
          <SkeletonBlock className="mt-5 h-8 w-36" />
          <SkeletonBlock className="mt-4 h-4 w-full max-w-lg" />

          <div className="mt-8 border border-white/10 bg-white/[0.04] p-5">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="mt-4 h-8 w-72" />
            <SkeletonBlock className="mt-3 h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-10/12" />
          </div>

          <div className="mt-8 border border-white/10 bg-black/20 p-5">
            <SkeletonBlock className="h-5 w-24" />
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-11/12" />
              <SkeletonBlock className="h-4 w-10/12" />
              <SkeletonBlock className="h-4 w-9/12" />
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <SkeletonBlock className="h-12 flex-1" />
            <SkeletonBlock className="h-12 flex-1" />
          </div>
        </section>

        <section className="space-y-6">
          <div className="border border-white/10 bg-white/[0.03] p-8">
            <SkeletonBlock className="h-6 w-36" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <SkeletonBlock className="h-8 w-24" />
              <SkeletonBlock className="h-8 w-24" />
              <SkeletonBlock className="h-8 w-24" />
            </div>
            <div className="mt-5 space-y-3">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-11/12" />
              <SkeletonBlock className="h-4 w-9/12" />
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-8">
            <SkeletonBlock className="h-6 w-24" />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <SkeletonBlock className="h-32 w-full" />
              <SkeletonBlock className="h-32 w-full" />
              <SkeletonBlock className="h-32 w-full" />
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-8">
            <SkeletonBlock className="h-6 w-24" />
            <div className="mt-6 space-y-4">
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

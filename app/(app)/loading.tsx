import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-6 w-[440px] max-w-full rounded-xl" />
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-11 w-40 rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <Skeleton className="h-5 w-32" />
          <div className="mt-5 space-y-4">
            <Skeleton className="h-16 w-24 rounded-xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-11 w-36 rounded-xl" />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 xl:col-span-2">
          <Skeleton className="h-5 w-40" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

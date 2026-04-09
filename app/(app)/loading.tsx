import { Skeleton } from "@/components/ui/skeleton";

function Skel({ className }: { className: string }) {
  return <Skeleton className={`rounded-xl ${className}`} />;
}

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="space-y-3">
        <Skel className="h-3 w-20" />
        <Skel className="h-9 w-44" />
        <Skel className="h-4 w-[400px] max-w-full" />
      </div>

      <div className="mt-8 space-y-4">
        {/* 继续上一次整理 */}
        <div className="border border-neutral-300 bg-white">
          <div className="border-b border-neutral-300 px-6 py-5">
            <Skel className="h-4 w-28" />
            <Skel className="mt-1.5 h-3 w-64" />
          </div>
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div>
                <Skel className="h-5 w-40" />
                <Skel className="mt-1.5 h-3 w-28" />
              </div>
              <Skel className="h-14 w-52" />
            </div>
            <Skel className="h-12 w-36" />
          </div>
        </div>

        {/* 三列辅助卡 */}
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-6 py-5">
              <Skel className="h-4 w-24" />
              <Skel className="mt-1.5 h-3 w-48" />
            </div>
            <div className="p-6 space-y-4">
              <Skel className="h-16 w-28" />
              <Skel className="h-14 w-full" />
              <Skel className="h-11 w-32" />
            </div>
          </div>

          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-6 py-5">
              <Skel className="h-4 w-24" />
              <Skel className="mt-1.5 h-3 w-48" />
            </div>
            <div className="p-6 space-y-4">
              <Skel className="h-14 w-full" />
              <Skel className="h-11 w-32" />
            </div>
          </div>

          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-6 py-5">
              <Skel className="h-4 w-20" />
              <Skel className="mt-1.5 h-3 w-40" />
            </div>
            <div className="p-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Skel className="h-20 w-full" />
              <Skel className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

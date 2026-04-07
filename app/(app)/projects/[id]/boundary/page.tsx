import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { PageHeader } from "@/components/app/PageHeader";
import { BoundaryClient } from "./BoundaryClient";
import type { BoundaryAnalysis } from "@/app/api/projects/[id]/boundary/analyze/route";

export default async function BoundaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/boundary`);

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      sourceType: true,
      sourceUrl: true,
      boundaryJson: true,
      assets: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true, title: true, selected: true, isCover: true },
      },
    },
  });

  if (!project) notFound();

  const selectedAssets = project.assets.filter((a) => a.selected);
  const displayAssets = selectedAssets.length > 0 ? selectedAssets : project.assets;
  const hasAssets = project.assets.length > 0;
  const boundaryAnalysis = project.boundaryJson as BoundaryAnalysis | null;

  return (
    <div className="px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 1/4`}
        title="边界确认"
        description="确认这些素材属于同一个项目，判断项目的主要方向是否清晰。这是进入整理流程的起点。"
      />

      {/* 2px structural divider */}
      <div className="-mx-6 mt-6 border-t-2 border-black" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div className="space-y-0">
          {/* 素材展示 */}
          <div className="mt-6 border border-neutral-300 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-300 px-6 py-4">
              <h2 className="text-[15px] font-semibold text-neutral-900">项目素材</h2>
              <span className="text-xs font-mono text-neutral-400">
                {project.assets.length} 张 · 已选 {selectedAssets.length}
              </span>
            </div>
            <div className="p-6">
              {!hasAssets ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-neutral-500">还没有上传素材</p>
                  <p className="mt-2 text-xs text-neutral-400">
                    请先通过「新建项目」重新导入，或联系支持。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {displayAssets.slice(0, 9).map((asset) => (
                    <div key={asset.id} className="relative aspect-[4/3] border border-neutral-200 bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                        alt={asset.title ?? "素材"}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {asset.isCover && (
                        <span className="absolute left-2 top-2 bg-neutral-900 px-1.5 py-0.5 text-[10px] font-mono text-white">
                          封面
                        </span>
                      )}
                    </div>
                  ))}
                  {displayAssets.length > 9 && (
                    <div className="flex aspect-[4/3] items-center justify-center border border-neutral-200 bg-neutral-100">
                      <span className="text-sm font-mono text-neutral-400">+{displayAssets.length - 9}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 项目信息 */}
          <div className="mt-6 border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-6 py-4">
              <h2 className="text-[15px] font-semibold text-neutral-900">项目信息</h2>
            </div>
            <div className="divide-y divide-neutral-100 px-6">
              <div className="flex items-start gap-8 py-3">
                <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">项目名称</span>
                <span className="text-sm text-neutral-900">{project.name}</span>
              </div>
              {project.sourceUrl && (
                <div className="flex items-start gap-8 py-3">
                  <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">来源链接</span>
                  <a
                    href={project.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-neutral-900 underline-offset-2 hover:underline"
                  >
                    {project.sourceUrl}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-8 py-3">
                <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">导入方式</span>
                <span className="text-sm text-neutral-900">
                  {project.sourceType === "FIGMA"
                    ? "Figma 链接"
                    : project.sourceType === "IMAGES"
                    ? "图片上传"
                    : "手动创建"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          {/* 确认要点 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">边界确认要点</p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {[
                "这些素材是否属于同一个项目？",
                "这个项目的主要方向是否可以用一句话概括？",
                "是否有明显与项目无关的素材混入？",
              ].map((q, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 shrink-0 text-xs font-mono text-neutral-400">{i + 1}</span>
                  <span className="text-sm leading-6 text-neutral-600">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 当前状态 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">当前状态</p>
            </div>
            <div className="divide-y divide-neutral-100 px-5">
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">素材总数</span>
                <span className="text-sm font-semibold text-neutral-900">{project.assets.length}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">已选展示</span>
                <span className="text-sm font-semibold text-neutral-900">{selectedAssets.length}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">当前环节</span>
                <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-mono text-neutral-600">
                  边界确认
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BoundaryClient projectId={id} hasAssets={hasAssets} initialAnalysis={boundaryAnalysis} />
    </div>
  );
}

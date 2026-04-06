import { notFound } from "next/navigation";
import Image from "next/image";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { InlineTip } from "@/components/app/InlineTip";
import { BoundaryClient } from "./BoundaryClient";

export default async function BoundaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/boundary`);

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      assets: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, imageUrl: true, title: true, selected: true, isCover: true },
      },
    },
  });

  if (!project) notFound();

  const selectedAssets = project.assets.filter((a) => a.selected);
  const displayAssets = selectedAssets.length > 0 ? selectedAssets : project.assets;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 1/4`}
        title="边界确认"
        description="确认这些素材属于同一个项目，判断项目的主要方向是否清晰。这是进入整理流程的起点。"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div className="space-y-6">
          <InlineTip>
            边界 AI 分析正在建设中。目前请先确认以下素材是否属于同一个项目、主要方向是否清晰，点击「确认边界」继续。
          </InlineTip>

          <SectionCard title="项目素材" description={`共 ${project.assets.length} 张素材，已选 ${selectedAssets.length} 张`}>
            {displayAssets.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-neutral-500">还没有上传素材</p>
                <a
                  href={`/projects/${id}/assets`}
                  className="mt-3 inline-block text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  先去上传素材
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {displayAssets.slice(0, 9).map((asset) => (
                  <div key={asset.id} className="relative aspect-[4/3] border border-neutral-200 bg-neutral-100">
                    <Image
                      src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                      alt={asset.title ?? "素材"}
                      fill
                      className="object-cover"
                    />
                    {asset.isCover && (
                      <span className="absolute left-2 top-2 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">
                        封面
                      </span>
                    )}
                  </div>
                ))}
                {displayAssets.length > 9 && (
                  <div className="flex aspect-[4/3] items-center justify-center border border-neutral-200 bg-neutral-100">
                    <span className="text-sm text-neutral-400">+{displayAssets.length - 9} 张</span>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="项目信息">
            <div className="space-y-3">
              <div className="flex items-start gap-4 border-b border-neutral-100 pb-3">
                <span className="w-20 shrink-0 text-xs text-neutral-400">项目名称</span>
                <span className="text-sm text-neutral-900">{project.name}</span>
              </div>
              {project.sourceUrl && (
                <div className="flex items-start gap-4 border-b border-neutral-100 pb-3">
                  <span className="w-20 shrink-0 text-xs text-neutral-400">来源链接</span>
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
              <div className="flex items-start gap-4">
                <span className="w-20 shrink-0 text-xs text-neutral-400">导入方式</span>
                <span className="text-sm text-neutral-900">
                  {project.sourceType === "FIGMA" ? "Figma 链接" : project.sourceType === "IMAGES" ? "图片上传" : "手动创建"}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          <SectionCard title="边界确认要点">
            <ul className="space-y-3 text-sm text-neutral-600">
              {[
                "这些素材是否属于同一个项目？",
                "这个项目的主要方向是否可以用一句话概括？",
                "是否有明显与项目无关的素材混入？",
              ].map((q, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-[11px] text-neutral-400">{i + 1}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="当前状态">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">素材总数</span>
                <span className="font-medium text-neutral-900">{project.assets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">已选展示</span>
                <span className="font-medium text-neutral-900">{selectedAssets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">当前阶段</span>
                <span className="font-medium text-neutral-900">边界确认</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <BoundaryClient projectId={id} hasAssets={project.assets.length > 0} />
    </div>
  );
}

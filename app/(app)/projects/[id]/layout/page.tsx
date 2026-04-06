import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { InlineTip } from "@/components/app/InlineTip";
import { LayoutClient } from "./LayoutClient";

const PACKAGE_MODE_LABEL: Record<string, { label: string; pageRange: string }> = {
  DEEP: { label: "深讲", pageRange: "8–10 页" },
  LIGHT: { label: "浅讲", pageRange: "3–5 页" },
  SUPPORTIVE: { label: "补充展示", pageRange: "1–3 页" },
};

export default async function LayoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/layout`);

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      stage: true,
      packageMode: true,
      layoutJson: true,
      _count: { select: { assets: true } },
      facts: {
        select: {
          projectType: true,
          roleTitle: true,
          resultSummary: true,
        },
      },
    },
  });

  if (!project) notFound();

  const modeInfo = project.packageMode ? PACKAGE_MODE_LABEL[project.packageMode] : null;
  const hasLayout = !!project.layoutJson;
  const isReady = project.stage === "READY";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 4/4`}
        title="排版与验收"
        description="根据定稿的包装模式生成项目内部排版，完成叙事整理，通过验证后即可加入作品集。"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div className="space-y-6">
          {!project.packageMode && (
            <SectionCard>
              <div className="py-4 text-center">
                <p className="text-sm text-neutral-500">还没有确认包装模式</p>
                <Link
                  href={`/projects/${id}/package`}
                  className="mt-2 inline-block text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  返回骨架定稿
                </Link>
              </div>
            </SectionCard>
          )}

          {project.packageMode && (
            <>
              <InlineTip>
                项目排版生成（AI 排版/包装层）正在建设中。确认包装模式后即可触发生成，生成结果将在此展示。
              </InlineTip>

              <SectionCard title="排版配置">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <span className="text-neutral-500">包装模式</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-neutral-900">{modeInfo?.label}</span>
                      <span className="text-xs text-neutral-400">{modeInfo?.pageRange}</span>
                      <Link
                        href={`/projects/${id}/package`}
                        className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
                      >
                        修改
                      </Link>
                    </div>
                  </div>
                  {project.facts?.projectType && (
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <span className="text-neutral-500">项目类型</span>
                      <span className="font-medium text-neutral-900">{project.facts.projectType}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">素材数量</span>
                    <span className="font-medium text-neutral-900">{project._count.assets} 张</span>
                  </div>
                </div>
              </SectionCard>

              {hasLayout ? (
                <SectionCard title="排版结果">
                  <div className="py-6 text-center text-sm text-neutral-400">
                    排版结果展示区（生成内容将在此呈现）
                  </div>
                </SectionCard>
              ) : (
                <SectionCard title="排版结果">
                  <div className="flex flex-col items-center gap-4 py-10 text-center">
                    <div className="h-px w-16 bg-neutral-200" />
                    <p className="text-sm text-neutral-500">
                      点击「生成项目排版」开始生成。生成是高成本动作，完成后将在此展示结果。
                    </p>
                  </div>
                </SectionCard>
              )}
            </>
          )}

          {isReady && (
            <SectionCard title="验证结论">
              <div className="flex items-center gap-3 py-2">
                <span className="flex h-5 w-5 items-center justify-center bg-emerald-500 text-[11px] text-white">✓</span>
                <p className="text-sm text-neutral-900">项目已通过验证，可以加入作品集。</p>
              </div>
            </SectionCard>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          <SectionCard title="处理预算">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">预算状态</span>
                <span className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                  充足
                </span>
              </div>
              <p className="text-xs leading-5 text-neutral-400">
                按当前项目规模，通常仍可继续完成一次项目级排版。
              </p>
              <Link
                href="/profile"
                className="block text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
              >
                查看完整权益 →
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="验证说明">
            <ul className="space-y-2 text-xs leading-5 text-neutral-500">
              <li>排版生成完成后，可手动触发「验证当前项目」</li>
              <li>验证通过后，项目进入 READY 状态，可加入作品集</li>
              <li>如果验证不通过，系统会给出具体缺失项说明</li>
            </ul>
          </SectionCard>

          <SectionCard title="当前阶段">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">阶段</span>
                <span className="font-medium text-neutral-900">排版验收</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">状态</span>
                <span className="font-medium text-neutral-900">
                  {isReady ? "已就绪" : hasLayout ? "待验证" : "待生成"}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <LayoutClient
        projectId={id}
        hasPackageMode={!!project.packageMode}
        hasLayout={hasLayout}
        isReady={isReady}
      />
    </div>
  );
}

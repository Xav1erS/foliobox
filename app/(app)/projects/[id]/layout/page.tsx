import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { WorkflowProgressBar } from "@/components/app/WorkflowProgressBar";
import { LayoutClient } from "./LayoutClient";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";

const PACKAGE_MODE_LABEL: Record<string, { label: string; pageRange: string }> = {
  DEEP: { label: "深讲", pageRange: "8–10 页" },
  LIGHT: { label: "浅讲", pageRange: "3–5 页" },
  SUPPORTIVE: { label: "补充展示", pageRange: "1–3 页" },
};

const PAGE_TYPE_STYLE: Record<string, { label: string; className: string }> = {
  cover:      { label: "封面",    className: "border-neutral-900 bg-neutral-900 text-white" },
  background: { label: "项目背景", className: "border-sky-200 bg-sky-50 text-sky-700" },
  problem:    { label: "问题定义", className: "border-orange-200 bg-orange-50 text-orange-700" },
  process:    { label: "设计过程", className: "border-violet-200 bg-violet-50 text-violet-700" },
  solution:   { label: "解决方案", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  result:     { label: "结果呈现", className: "border-teal-200 bg-teal-50 text-teal-700" },
  reflection: { label: "反思复盘", className: "border-amber-200 bg-amber-50 text-amber-700" },
  closing:    { label: "结尾",    className: "border-neutral-200 bg-neutral-50 text-neutral-500" },
};

export default async function LayoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/layout`);

  const [project, facts] = await Promise.all([
    db.project.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        stage: true,
        packageMode: true,
        layoutJson: true,
        _count: { select: { assets: true } },
      },
    }),
    db.projectFact.findUnique({
      where: { projectId: id },
      select: { projectType: true, roleTitle: true, resultSummary: true },
    }),
  ]);

  if (!project) notFound();

  const modeInfo = project.packageMode ? PACKAGE_MODE_LABEL[project.packageMode] : null;
  const hasLayout = !!project.layoutJson;
  const isReady = project.stage === "READY";
  const layoutJson = project.layoutJson as LayoutJson | null;

  return (
    <div className="px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 4/4`}
        title="排版与验收"
        description="根据定稿的包装模式生成项目内部排版，完成叙事整理，通过验证后即可加入作品集。"
      />

      {/* 2px structural divider */}
      <div className="-mx-6 mt-6 border-t-2 border-black" />

      <WorkflowProgressBar currentStep={4} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div>
          {/* 未选包装模式时的引导 */}
          {!project.packageMode && (
            <div className="border border-neutral-300 bg-white px-6 py-10 text-center">
              <p className="text-sm text-neutral-500">还没有确认包装模式</p>
              <Link
                href={`/projects/${id}/package`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
              >
                返回骨架定稿确认
              </Link>
            </div>
          )}

          {project.packageMode && (
            <>
              {/* 排版配置 */}
              <div className="border border-neutral-300 bg-white">
                <div className="border-b border-neutral-300 px-6 py-4">
                  <h2 className="text-[15px] font-semibold text-neutral-900">排版配置</h2>
                </div>
                <div className="divide-y divide-neutral-100 px-6">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-xs font-mono text-neutral-400">包装模式</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-neutral-900">{modeInfo?.label}</span>
                      <span className="text-xs font-mono text-neutral-400">{modeInfo?.pageRange}</span>
                      <Link
                        href={`/projects/${id}/package`}
                        className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
                      >
                        修改
                      </Link>
                    </div>
                  </div>
                  {facts?.projectType && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-xs font-mono text-neutral-400">项目类型</span>
                      <span className="text-sm font-semibold text-neutral-900">{facts.projectType}</span>
                    </div>
                  )}
                  {facts?.roleTitle && (
                    <div className="flex items-center justify-between py-3">
                      <span className="text-xs font-mono text-neutral-400">我的角色</span>
                      <span className="text-sm font-semibold text-neutral-900">{facts.roleTitle}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-xs font-mono text-neutral-400">素材数量</span>
                    <span className="text-sm font-semibold text-neutral-900">{project._count.assets} 张</span>
                  </div>
                </div>
              </div>

              {/* 排版结果区 */}
              <div className="mt-4 border border-neutral-300 bg-white">
                <div className="border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-[15px] font-semibold text-neutral-900">排版结果</h2>
                  {hasLayout && layoutJson && (
                    <span className="text-xs font-mono text-neutral-400">
                      共 {layoutJson.totalPages} 页 · {modeInfo?.label}
                    </span>
                  )}
                </div>

                {hasLayout && layoutJson ? (
                  <div className="divide-y divide-neutral-100">
                    {/* 叙事摘要 */}
                    <div className="bg-neutral-50 px-6 py-5">
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">叙事弧度</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-800">{layoutJson.narrativeSummary}</p>
                    </div>

                    {/* 页面计划 */}
                    <div className="px-6 py-4">
                      <p className="mb-4 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                        页面计划 · {layoutJson.totalPages} 页
                      </p>
                      <div className="space-y-2">
                        {layoutJson.pages.map((page) => {
                          const typeStyle = PAGE_TYPE_STYLE[page.type] ?? {
                            label: page.type,
                            className: "border-neutral-200 bg-neutral-50 text-neutral-500",
                          };
                          return (
                            <div
                              key={page.pageNumber}
                              className="border border-neutral-200 bg-white"
                            >
                              <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5">
                                <span className="shrink-0 text-[11px] font-mono font-bold text-neutral-300">
                                  {String(page.pageNumber).padStart(2, "0")}
                                </span>
                                <span
                                  className={`border px-1.5 py-0.5 text-[10px] font-mono ${typeStyle.className}`}
                                >
                                  {typeStyle.label}
                                </span>
                                <span className="text-sm font-medium text-neutral-900">
                                  {page.titleSuggestion}
                                </span>
                                {page.wordCountGuideline && (
                                  <span className="ml-auto shrink-0 text-[10px] font-mono text-neutral-400">
                                    {page.wordCountGuideline}
                                  </span>
                                )}
                              </div>
                              <div className="px-4 py-3">
                                <p className="text-xs leading-5 text-neutral-500">{page.contentGuidance}</p>
                                {page.keyPoints.length > 0 && (
                                  <ul className="mt-2 space-y-1">
                                    {page.keyPoints.map((point, i) => (
                                      <li key={i} className="flex items-start gap-2 text-xs text-neutral-400">
                                        <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-200" />
                                        {point}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {page.assetHint && (
                                  <p className="mt-2.5 border-t border-neutral-100 pt-2 text-[10px] font-mono text-neutral-400">
                                    素材建议 · {page.assetHint}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 质量提示 */}
                    {layoutJson.qualityNotes.length > 0 && (
                      <div className="bg-amber-50 px-6 py-4">
                        <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.2em] text-amber-600">
                          质量提示
                        </p>
                        <ul className="space-y-2">
                          {layoutJson.qualityNotes.map((note, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-amber-800">
                              <span className="mt-1.5 h-1 w-1 shrink-0 bg-amber-400" />
                              {note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-300">
                      待生成
                    </p>
                    <p className="mt-3 text-sm text-neutral-500">
                      点击底部「生成项目排版」，AI 将根据包装模式规划逐页叙事结构。
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      生成完成后此处会展示完整页面计划，包含叙事弧度和每页内容指导。
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 验证通过结论 */}
          {isReady && (
            <div className="mt-4 border border-emerald-200 bg-emerald-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-emerald-500 text-xs text-white">
                  ✓
                </span>
                <p className="text-sm font-medium text-emerald-800">项目已通过验证，可以加入作品集。</p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          {/* 处理预算 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">处理预算</p>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-neutral-500">预算状态充足</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-neutral-400">
                按当前项目规模，通常仍可继续完成一次项目级排版。
              </p>
              <Link
                href="/profile"
                className="mt-3 block text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
              >
                查看完整权益 →
              </Link>
            </div>
          </div>

          {/* 验证说明 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">验证说明</p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {[
                "先生成排版，查看页面计划是否符合预期",
                "确认叙事弧度和页数范围合理后，触发「验证当前项目」",
                "验证通过后项目进入 READY 状态，可加入作品集",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-300" />
                  <span className="text-xs leading-5 text-neutral-500">{item}</span>
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
                <span className="text-xs text-neutral-500">当前环节</span>
                <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-mono text-neutral-600">
                  排版验收
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">排版状态</span>
                <span className={`text-xs font-mono font-semibold ${isReady ? "text-emerald-600" : hasLayout ? "text-neutral-700" : "text-neutral-400"}`}>
                  {isReady ? "已就绪" : hasLayout ? "已生成" : "待生成"}
                </span>
              </div>
              {hasLayout && layoutJson && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-xs text-neutral-500">页面数</span>
                  <span className="text-xs font-semibold text-neutral-900">{layoutJson.totalPages} 页</span>
                </div>
              )}
            </div>
          </div>
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

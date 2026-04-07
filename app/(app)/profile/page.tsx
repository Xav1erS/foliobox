import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/app/ProfileForm";
import { PageHeader } from "@/components/app/PageHeader";
import { ResumeContextBanner } from "@/components/app/ResumeContextBanner";
import { getRequiredSession } from "@/lib/required-session";
import { formatProjectDate } from "@/lib/project-workflow";

const PLAN_COPY: Record<string, {
  title: string;
  stage: string;
  description: string;
  abilities: string[];
  completionLine: string;
}> = {
  FREE: {
    title: "免费体验",
    stage: "基础体验阶段",
    description: "可继续整理项目、生成草稿。完整排版、发布与 PDF 导出需解锁后可用。",
    abilities: ["免费评分入口", "基础整理流程体验", "简版评分结果"],
    completionLine: "适合先体验产品、了解当前作品集问题的阶段。",
  },
  PRO: {
    title: "起稿陪跑",
    stage: "第一版起稿阶段",
    description: "已解锁完整生成流程、PDF 导出和在线链接发布。",
    abilities: [
      "完整整理与生成流程",
      "项目级排版生成",
      "Portfolio 初稿生成",
      "PDF 导出",
      "在线链接发布",
    ],
    completionLine: "适合从素材整理到完成第一版可编辑作品集初稿。",
  },
  SPRINT: {
    title: "细化陪跑",
    stage: "深度优化阶段",
    description: "已解锁更高配额与更强生成能力，适合求职冲刺期。",
    abilities: [
      "起稿陪跑全部能力",
      "更多轮局部 AI 改写",
      "更多次重新验证与对比",
      "更充足的整份包装调整空间",
    ],
    completionLine: "适合从已有初稿进行高密度修改、验证和优化。",
  },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession("/profile");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromScore = resolvedSearchParams?.from === "score";

  const [profile, userPlan] = await Promise.all([
    db.designerProfile.findUnique({
      where: { userId: session.user.id },
    }),
    db.userPlan.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { planType: true, expiresAt: true },
    }),
  ]);

  const currentPlan = userPlan?.planType ?? "FREE";
  const planCopy = PLAN_COPY[currentPlan] ?? PLAN_COPY.FREE;

  return (
    <div className="px-6 py-10">
      <PageHeader
        eyebrow="PROFILE"
        title="设计师档案"
        description="这些信息会作为 AI 输入，影响作品集中的自我定位、强调重点和整体叙述语气。"
      />

      {/* 2px structural divider */}
      <div className="mt-6 -mx-6 border-t-2 border-black" />

      {/* From-score banner */}
      {fromScore && (
        <div className="border-b border-neutral-200 py-5">
          <ResumeContextBanner>
            你是从评分结果回到这里的。先补充当前职位、经验年限、擅长方向与目标岗位，再去整理项目，会让后续生成结果更贴近你的求职方向。
          </ResumeContextBanner>
        </div>
      )}

      {/* 01 基础资料 & 02 求职方向 — editable form */}
      <div className="pt-6">
        <ProfileForm initialData={profile} />
      </div>

      {/* 2px divider before billing sections */}
      <div className="-mx-6 border-t-2 border-black" />

      {/* 03 当前方案与权益 */}
      <div className="py-6">
        <p className="mb-5 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
          当前方案与权益
        </p>

        <div className="border border-neutral-300 bg-white/88 backdrop-blur-sm">
          {/* Plan header */}
          <div className="border-b border-neutral-300 px-6 py-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xl font-bold tracking-tight text-neutral-900">
                  {planCopy.title}
                </p>
                <p className="mt-1 text-xs font-mono uppercase tracking-[0.12em] text-neutral-400">
                  {planCopy.stage}
                </p>
                <p className="mt-2 text-sm leading-5 text-neutral-500">
                  {planCopy.description}
                </p>
                {userPlan?.expiresAt && (
                  <p className="mt-2 text-xs font-mono text-neutral-400">
                    有效期至 {formatProjectDate(userPlan.expiresAt)}
                  </p>
                )}
              </div>
              {currentPlan === "FREE" && (
                <Link
                  href="/pricing"
                  className="group shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  查看升级方案
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Abilities */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
              已解锁能力
            </p>
            <ul className="space-y-2">
              {planCopy.abilities.map((ability) => (
                <li
                  key={ability}
                  className="flex items-center gap-2.5 text-sm text-neutral-700"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                  {ability}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-neutral-400">
              {planCopy.completionLine}
            </p>
          </div>
        </div>
      </div>

      {/* 1px divider */}
      <div className="-mx-6 border-t border-neutral-300" />

      {/* 04 处理预算 */}
      <div className="py-6">
        <p className="mb-5 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
          处理预算
        </p>

        <div className="border border-neutral-300 bg-white/88 backdrop-blur-sm">
          {/* Budget status */}
          <div className="border-b border-neutral-300 px-6 py-5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-neutral-900">预算充足</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-neutral-500">
              按当前套餐，仍可继续整理项目与生成作品集初稿。
            </p>
          </div>

          {/* Recent records */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
              最近处理记录
            </p>
            <p className="text-sm leading-6 text-neutral-400">
              处理记录功能即将上线，届时可在此查看所有高成本动作的使用明细。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/app/ProfileForm";
import { PageHeader } from "@/components/app/PageHeader";
import { ResumeContextBanner } from "@/components/app/ResumeContextBanner";
import {
  getEntitlementSummary,
  getQuotaStatus,
  PLAN_DEFINITIONS,
  QUOTA_DISPLAY_ORDER,
  formatQuotaUsageValue,
} from "@/lib/entitlement";
import { getRequiredSession } from "@/lib/required-session";
import { formatProjectDate } from "@/lib/project-workflow";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession("/profile");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromScore = resolvedSearchParams?.from === "score";

  const [profile, userPlan, entitlementSummary] = await Promise.all([
    db.designerProfile.findUnique({
      where: { userId: session.user.id },
    }),
    db.userPlan.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { planType: true, expiresAt: true },
    }),
    getEntitlementSummary(session.user.id),
  ]);

  const currentPlan = userPlan?.planType ?? "FREE";
  const planDefinition =
    PLAN_DEFINITIONS.find((plan) => plan.planType === currentPlan.toLowerCase()) ??
    PLAN_DEFINITIONS[0];
  const quotaStatus = getQuotaStatus(entitlementSummary);
  const quotaStatusClass =
    quotaStatus.tone === "emerald" ? "bg-emerald-400" : "bg-amber-400";
  const profileReadiness = [
    profile?.currentTitle,
    profile?.yearsOfExperience,
    profile?.industry,
    profile?.targetRole,
    profile?.tonePreference,
    ...(profile?.specialties ?? []),
    ...(profile?.strengths ?? []),
  ].filter(Boolean).length;

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

      <div className="grid gap-3 pt-6 md:grid-cols-3">
        <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Profile Readiness
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {profileReadiness}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            当前已写入的定位、方向和表达偏好数量。
          </p>
        </div>
        <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Plan
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {planDefinition.displayName}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            当前套餐会直接影响高成本动作的剩余额度。
          </p>
        </div>
        <div className="border border-neutral-300 bg-neutral-950 px-4 py-4 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.65)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">
            Why It Matters
          </p>
          <p className="mt-2 text-base font-medium leading-7">
            档案越清楚，后续项目和作品集生成就越贴近你真实的投递方向。
          </p>
        </div>
      </div>

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
                  {entitlementSummary.title}
                </p>
                <p className="mt-1 text-xs font-mono uppercase tracking-[0.12em] text-neutral-400">
                  {planDefinition.displayName}
                </p>
                <p className="mt-2 text-sm leading-5 text-neutral-500">
                  {entitlementSummary.description}
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
              {planDefinition.featureList.map((ability) => (
                <li
                  key={ability}
                  className="flex items-center gap-2.5 text-sm text-neutral-700"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
                  {ability}
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-neutral-200 pt-5">
              <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                当前额度
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {QUOTA_DISPLAY_ORDER.map((key) => {
                  const quota = entitlementSummary.quotas[key];
                  return (
                    <div key={key} className="border border-neutral-200 bg-neutral-50 px-3 py-3">
                      <p className="text-xs font-mono uppercase tracking-[0.12em] text-neutral-400">
                        {quota.label}
                      </p>
                      <p className="mt-2 text-sm font-medium text-neutral-900">
                        {formatQuotaUsageValue(key, quota)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        已用 {quota.used} · 剩余 {quota.remaining}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
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
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${quotaStatusClass}`} />
              <span className="text-sm font-medium text-neutral-900">{quotaStatus.label}</span>
            </div>
            <p className="mt-2 text-sm leading-5 text-neutral-500">
              {quotaStatus.description}
            </p>
          </div>

          {/* Recent records */}
          <div className="px-6 py-5">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
              当前使用情况
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUOTA_DISPLAY_ORDER.map((key) => {
                const quota = entitlementSummary.quotas[key];
                return (
                  <div key={key} className="border border-neutral-200 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{quota.label}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          总额度 {quota.limit} · 已用 {quota.used}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-neutral-900">
                        剩余 {quota.remaining}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-neutral-400">
              更细的动作明细和账期记录还没接入；当前这里展示的是基于对象与任务记录实时推导的剩余额度。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

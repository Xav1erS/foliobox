import Link from "next/link";
import { ArrowRight, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/app/ProfileForm";
import { PageHeader } from "@/components/app/PageHeader";
import { ResumeContextBanner } from "@/components/app/ResumeContextBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-10">
      <PageHeader
        eyebrow="PROFILE"
        title="设计师档案"
        description="这些信息会作为 AI 输入，影响作品集中的自我定位、强调重点和整体叙述语气。"
      />

      <Separator className="-mx-6 w-auto" />

      {fromScore && (
        <Card className="app-panel">
          <CardContent className="p-5">
          <ResumeContextBanner>
            你是从评分结果回到这里的。先补充当前职位、经验年限、擅长方向与目标岗位，再去整理项目，会让后续生成结果更贴近你的求职方向。
          </ResumeContextBanner>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-panel">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Profile Readiness
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {profileReadiness}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前已写入的定位、方向和表达偏好数量。
          </p>
          </CardContent>
        </Card>
        <Card className="app-panel">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Plan
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {planDefinition.displayName}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前套餐会直接影响高成本动作的剩余额度。
          </p>
          </CardContent>
        </Card>
        <Card className="app-panel-highlight text-white shadow-xs">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-white/42">
            Why It Matters
          </p>
          <p className="mt-2 text-base font-medium leading-7 text-white">
            档案越清楚，后续项目和作品集生成就越贴近你真实的投递方向。
          </p>
          </CardContent>
        </Card>
      </div>

      <ProfileForm initialData={profile} />

      <Separator className="-mx-6 w-auto" />

      <Card className="app-panel">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="px-2 py-0.5 font-mono text-xs">
                当前方案与权益
              </Badge>
            </div>
            <CardTitle className="text-xl">{entitlementSummary.title}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {entitlementSummary.description}
            </CardDescription>
            {userPlan?.expiresAt ? (
              <p className="text-xs font-mono text-muted-foreground">
                有效期至 {formatProjectDate(userPlan.expiresAt)}
              </p>
            ) : null}
          </div>
          {currentPlan === "FREE" ? (
            <Button asChild variant="outline" className="h-10 px-4">
              <Link href="/pricing">
                <CreditCard className="mr-2 h-4 w-4" />
                查看升级方案
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              已解锁能力
            </p>
            <ul className="space-y-2">
              {planDefinition.featureList.map((ability) => (
                <li
                  key={ability}
                  className="flex items-center gap-2.5 text-sm text-white/84"
                >
                   <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                  {ability}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              当前额度
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUOTA_DISPLAY_ORDER.map((key) => {
                const quota = entitlementSummary.quotas[key];
                return (
                   <div key={key} className="rounded-xl border border-border bg-secondary px-4 py-3">
                     <p className="text-xs font-mono uppercase tracking-[0.12em] text-white/34">
                      {quota.label}
                    </p>
                     <p className="mt-2 text-sm font-medium text-white/88">
                      {formatQuotaUsageValue(key, quota)}
                    </p>
                     <p className="mt-1 text-xs text-white/42">
                      已用 {quota.used} · 剩余 {quota.remaining}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="app-panel">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${quotaStatusClass}`} />
            <Badge variant="secondary" className="px-2 py-0.5 font-mono text-xs">
              处理预算
            </Badge>
          </div>
          <CardTitle className="text-xl">{quotaStatus.label}</CardTitle>
          <CardDescription className="text-sm leading-6">
            {quotaStatus.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
              当前使用情况
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {QUOTA_DISPLAY_ORDER.map((key) => {
                const quota = entitlementSummary.quotas[key];
                return (
                   <div key={key} className="rounded-xl border border-border bg-secondary px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                         <p className="text-sm font-medium text-white/88">{quota.label}</p>
                         <p className="mt-1 text-xs text-white/42">
                          总额度 {quota.limit} · 已用 {quota.used}
                        </p>
                      </div>
                       <p className="text-sm font-semibold text-white/92">
                        剩余 {quota.remaining}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              更细的动作明细和账期记录还没接入；当前这里展示的是基于对象与任务记录实时推导的剩余额度。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

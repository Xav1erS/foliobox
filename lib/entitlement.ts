import { db } from "@/lib/db";

export type PlanType = "FREE" | "PRO" | "SPRINT";
export type PlanSummaryMetric = {
  label: string;
  value: string;
};
export type PlanSummaryCopy = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  metrics?: PlanSummaryMetric[];
};
export type EntitlementQuotaKey =
  | "activeProjects"
  | "projectLayouts"
  | "portfolioPackagings"
  | "publishLinks";
export type EntitlementQuotaUsage = {
  label: string;
  used: number;
  limit: number;
  remaining: number;
};
export type EntitlementSummary = {
  planType: PlanType;
  title: string;
  description: string;
  expiresAt: Date | null;
  ctaHref: string;
  ctaLabel: string;
  quotas: Record<EntitlementQuotaKey, EntitlementQuotaUsage>;
};

export type EntitlementAction =
  | "full_score"
  | "full_rewrite"
  | "multi_variant"
  | "pdf_export"
  | "publish_link";

export const PLAN_AMOUNTS: Record<string, number> = {
  PRO: 7900,    // 79 元（分）
  SPRINT: 29900, // 299 元（分）
};

export const PLAN_DEFINITIONS = [
  {
    planType: "free" as const,
    displayName: "免费版",
    price: 0,
    priceUnit: "one_time" as const,
    description: "适合先体验产品能力，了解当前作品集还有哪些问题。",
    highlightTag: null,
    featureList: ["免费评分入口", "简版评分结果", "基础体验能力"],
    targetUserText: "适合第一次试用的用户",
    unlockScenarioText: "适合先体验评分或先了解产品能力",
    isRecommended: false,
    isActive: true,
    sortOrder: 0,
  },
  {
    planType: "pro" as const,
    displayName: "Pro 版",
    price: 79,
    priceUnit: "month" as const,
    description: "适合想自己完成整理、修改和导出的用户。",
    highlightTag: "最适合多数用户",
    featureList: [
      "完整评分结果",
      "完整整理流程",
      "多版本生成",
      "PDF 导出",
      "在线链接发布",
      "更完整的编辑能力",
    ],
    targetUserText: "适合希望完整整理和导出作品集的用户",
    unlockScenarioText: "适合准备继续生成、编辑、导出时解锁",
    isRecommended: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    planType: "sprint" as const,
    displayName: "求职冲刺版",
    price: 299,
    priceUnit: "one_time" as const,
    description: "适合正在密集投递、希望在短时间内集中优化作品集的用户。",
    highlightTag: "适合投递前冲刺",
    featureList: [
      "更高生成配额",
      "更强优化能力",
      "岗位定向优化",
      "限时强化服务",
    ],
    targetUserText: "适合正处于求职窗口期的用户",
    unlockScenarioText: "适合投递前集中优化时解锁",
    isRecommended: false,
    isActive: true,
    sortOrder: 2,
  },
];

export const PLAN_SUMMARY_COPY: Record<PlanType, PlanSummaryCopy> = {
  FREE: {
    title: "免费体验",
    description: "当前可继续整理项目；完整生成、发布与导出需解锁后可用。",
    href: "/pricing",
    ctaLabel: "查看完整权益",
  },
  PRO: {
    title: "起稿陪跑",
    description: "已解锁完整生成流程、PDF 导出和在线链接发布。",
    href: "/profile",
    ctaLabel: "查看完整权益",
  },
  SPRINT: {
    title: "细化陪跑",
    description: "已解锁更高配额与更强生成能力，适合求职冲刺期。",
    href: "/profile",
    ctaLabel: "查看完整权益",
  },
};

export type PlanQuotaDefinition = {
  label: string;
  limit: number;
};

export const QUOTA_DISPLAY_ORDER: EntitlementQuotaKey[] = [
  "activeProjects",
  "projectLayouts",
  "portfolioPackagings",
  "publishLinks",
];

export const PLAN_QUOTAS: Record<
  PlanType,
  Record<EntitlementQuotaKey, PlanQuotaDefinition>
> = {
  FREE: {
    activeProjects: { label: "可激活项目", limit: 3 },
    projectLayouts: { label: "项目排版", limit: 0 },
    portfolioPackagings: { label: "作品集包装", limit: 0 },
    publishLinks: { label: "发布链接", limit: 0 },
  },
  PRO: {
    activeProjects: { label: "可激活项目", limit: 12 },
    projectLayouts: { label: "项目排版", limit: 24 },
    portfolioPackagings: { label: "作品集包装", limit: 8 },
    publishLinks: { label: "发布链接", limit: 8 },
  },
  SPRINT: {
    activeProjects: { label: "可激活项目", limit: 30 },
    projectLayouts: { label: "项目排版", limit: 80 },
    portfolioPackagings: { label: "作品集包装", limit: 20 },
    publishLinks: { label: "发布链接", limit: 20 },
  },
};

export function formatQuotaLimitLabel(
  key: EntitlementQuotaKey,
  limit: number
): string {
  if (limit <= 0) return "未解锁";
  if (key === "activeProjects") return `${limit} 个`;
  return `${limit} 次`;
}

export function formatQuotaUsageValue(
  key: EntitlementQuotaKey,
  quota: EntitlementQuotaUsage
): string {
  if (quota.limit <= 0) return "未解锁";
  if (key === "activeProjects") return `${quota.used}/${quota.limit}`;
  return `${quota.remaining}/${quota.limit}`;
}

export function getQuotaStatus(summary: EntitlementSummary): {
  label: string;
  description: string;
  tone: "emerald" | "amber";
} {
  if (summary.planType === "FREE") {
    return {
      label: "当前为体验模式",
      description:
        "你仍可继续整理项目；项目排版、作品集包装、发布链接与 PDF 导出需要升级后使用。",
      tone: "amber",
    };
  }

  const remainingHighCostActions =
    summary.quotas.projectLayouts.remaining +
    summary.quotas.portfolioPackagings.remaining +
    summary.quotas.publishLinks.remaining;

  if (remainingHighCostActions <= 6) {
    return {
      label: "剩余额度偏少",
      description:
        "高成本动作还可继续使用，但已经接近当前套餐上限，建议在生成前先确认本轮目标。",
      tone: "amber",
    };
  }

  return {
    label: "剩余额度充足",
    description: "当前套餐仍可继续进行项目排版、作品集包装与公开发布。",
    tone: "emerald",
  };
}

export function getPlanSummaryCopy(plan: PlanType): PlanSummaryCopy {
  return PLAN_SUMMARY_COPY[plan];
}

function buildQuotaUsage(
  planType: PlanType,
  key: EntitlementQuotaKey,
  used: number
): EntitlementQuotaUsage {
  const definition = PLAN_QUOTAS[planType][key];
  return {
    label: definition.label,
    used,
    limit: definition.limit,
    remaining: Math.max(definition.limit - used, 0),
  };
}

export function getPlanSummaryFromEntitlement(summary: EntitlementSummary): PlanSummaryCopy {
  return {
    title: summary.title,
    description: summary.description,
    href: summary.ctaHref,
    ctaLabel: summary.ctaLabel,
    metrics: [
      {
        label: summary.quotas.activeProjects.label,
        value: `${summary.quotas.activeProjects.used}/${summary.quotas.activeProjects.limit}`,
      },
      {
        label: summary.quotas.projectLayouts.label,
        value: `${summary.quotas.projectLayouts.remaining} 次剩余`,
      },
      {
        label: summary.quotas.portfolioPackagings.label,
        value: `${summary.quotas.portfolioPackagings.remaining} 次剩余`,
      },
      {
        label: summary.quotas.publishLinks.label,
        value: `${summary.quotas.publishLinks.remaining} 次剩余`,
      },
    ],
  };
}

export async function getUserPlan(userId: string): Promise<PlanType> {
  const plan = await db.userPlan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return "FREE";
  return plan.planType as PlanType;
}

export async function getEntitlementSummary(userId: string): Promise<EntitlementSummary> {
  const [plan, activeProjectsUsed, projectLayoutsUsed, portfolioPackagingsUsed, publishLinksUsed] =
    await Promise.all([
      db.userPlan.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { planType: true, expiresAt: true },
      }),
      db.project.count({ where: { userId } }),
      db.generationTask.count({
        where: {
          userId,
          objectType: "project",
          actionType: "project_layout_generation",
          countedToBudget: true,
        },
      }),
      db.generationTask.count({
        where: {
          userId,
          objectType: "portfolio",
          actionType: "portfolio_packaging_generation",
          countedToBudget: true,
        },
      }),
      db.publishedPortfolio.count({ where: { userId, isPublished: true } }),
    ]);

  const planType = (plan?.planType as PlanType | undefined) ?? "FREE";
  const summaryCopy = PLAN_SUMMARY_COPY[planType];

  return {
    planType,
    title: summaryCopy.title,
    description: summaryCopy.description,
    expiresAt: plan?.expiresAt ?? null,
    ctaHref: summaryCopy.href,
    ctaLabel: summaryCopy.ctaLabel,
    quotas: {
      activeProjects: buildQuotaUsage(planType, "activeProjects", activeProjectsUsed),
      projectLayouts: buildQuotaUsage(planType, "projectLayouts", projectLayoutsUsed),
      portfolioPackagings: buildQuotaUsage(
        planType,
        "portfolioPackagings",
        portfolioPackagingsUsed
      ),
      publishLinks: buildQuotaUsage(planType, "publishLinks", publishLinksUsed),
    },
  };
}

export async function hasRemainingQuota(
  userId: string,
  key: EntitlementQuotaKey
): Promise<{ allowed: boolean; summary: EntitlementSummary }> {
  const summary = await getEntitlementSummary(userId);
  return {
    allowed: summary.quotas[key].remaining > 0,
    summary,
  };
}

export function canDo(plan: PlanType, action: EntitlementAction): boolean {
  if (plan === "PRO" || plan === "SPRINT") return true;
  // FREE: no paid actions
  return false;
}

export async function requirePlan(
  userId: string,
  action: EntitlementAction
): Promise<{ allowed: boolean; plan: PlanType }> {
  const plan = await getUserPlan(userId);
  return { allowed: canDo(plan, action), plan };
}

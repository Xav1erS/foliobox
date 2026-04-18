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
export type ObjectActionQuota = {
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
    displayName: "标准版",
    price: 79,
    priceUnit: "month" as const,
    description: "适合已经决定认真整理作品集，并希望完成第一版正式初稿的用户。",
    highlightTag: "最适合多数用户",
    featureList: [
      "完整评分结果",
      "10 个可激活项目",
      "每个项目 1 次诊断 + 1 次生成排版",
      "2 次作品集诊断 + 1 次作品集包装",
      "PDF 导出",
      "在线链接发布",
    ],
    targetUserText: "适合希望完整整理和导出作品集的用户",
    unlockScenarioText: "适合准备继续生成、编辑、导出时解锁",
    isRecommended: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    planType: "sprint" as const,
    displayName: "进阶版",
    price: 299,
    priceUnit: "one_time" as const,
    description: "适合有更多项目、需要更多重生成与更高频局部修改的用户。",
    highlightTag: "更高次数与更高频打磨",
    featureList: [
      "30 个可激活项目",
      "每个项目 3 次诊断 + 3 次生成排版",
      "6 次作品集诊断 + 3 次作品集包装",
      "更高频局部修改与验证",
      "PDF 导出",
      "在线链接发布",
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
    title: "标准版",
    description: "已解锁正式整理闭环，可完成第一版作品集初稿。",
    href: "/profile",
    ctaLabel: "查看完整权益",
  },
  SPRINT: {
    title: "进阶版",
    description: "已解锁更多项目和更高频高成本动作，适合持续打磨与多轮重生成。",
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
    activeProjects: { label: "可激活项目", limit: 0 },
    projectLayouts: { label: "项目排版", limit: 0 },
    portfolioPackagings: { label: "作品集包装", limit: 0 },
    publishLinks: { label: "发布链接", limit: 0 },
  },
  PRO: {
    activeProjects: { label: "可激活项目", limit: 10 },
    projectLayouts: { label: "项目排版", limit: 10 },
    portfolioPackagings: { label: "作品集包装", limit: 1 },
    publishLinks: { label: "发布链接", limit: 1 },
  },
  SPRINT: {
    activeProjects: { label: "可激活项目", limit: 30 },
    projectLayouts: { label: "项目排版", limit: 30 },
    portfolioPackagings: { label: "作品集包装", limit: 3 },
    publishLinks: { label: "发布链接", limit: 1 },
  },
};

const PROJECT_ACTION_LIMITS: Record<
  PlanType,
  {
    layoutGenerations: number;
    layoutRegenerations: number;
    // 项目准备 · AI 项目理解（参见 spec-system-v3/05 §6.1）
    projectUnderstandings: number;
    // 项目准备 · 生成章节结构（参见 spec-system-v3/05 §6.1）
    structureSuggestions: number;
  }
> = {
  FREE: {
    layoutGenerations: 0,
    layoutRegenerations: 0,
    projectUnderstandings: 2,
    structureSuggestions: 1,
  },
  PRO: {
    layoutGenerations: 1,
    layoutRegenerations: 1,
    projectUnderstandings: Number.POSITIVE_INFINITY,
    structureSuggestions: Number.POSITIVE_INFINITY,
  },
  SPRINT: {
    layoutGenerations: 3,
    layoutRegenerations: 3,
    projectUnderstandings: Number.POSITIVE_INFINITY,
    structureSuggestions: Number.POSITIVE_INFINITY,
  },
};

/**
 * 免费层在 `项目准备 · 生成章节结构` 仅可见 / 落地的章节数。
 * 参见 spec-system-v3/05 §6.1。
 */
export const FREE_STRUCTURE_CHAPTER_PREVIEW_LIMIT = 2;

const PORTFOLIO_ACTION_LIMITS: Record<
  PlanType,
  {
    diagnoses: number;
    packagingGenerations: number;
    packagingRegenerations: number;
  }
> = {
  FREE: {
    diagnoses: 0,
    packagingGenerations: 0,
    packagingRegenerations: 0,
  },
  PRO: {
    diagnoses: 2,
    packagingGenerations: 1,
    packagingRegenerations: 1,
  },
  SPRINT: {
    diagnoses: 6,
    packagingGenerations: 3,
    packagingRegenerations: 3,
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

function buildObjectActionQuota(label: string, limit: number, used: number): ObjectActionQuota {
  return {
    label,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
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
  const [plan, activeProjectTasks, projectLayoutsUsed, portfolioPackagingsUsed, publishLinksUsed] =
    await Promise.all([
      db.userPlan.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { planType: true, expiresAt: true },
      }),
      db.generationTask.findMany({
        where: {
          userId,
          objectType: "project",
          usageClass: "high_cost",
          countedToBudget: true,
        },
        select: { objectId: true },
        distinct: ["objectId"],
      }),
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
  const activeProjectsUsed = activeProjectTasks.length;

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

export async function getProjectActionSummary(userId: string, projectId: string) {
  const planType = await getUserPlan(userId);
  const [
    layoutGenerationsUsed,
    layoutRegenerationsUsed,
    projectUnderstandingsUsed,
    structureSuggestionsUsed,
  ] = await Promise.all([
    db.generationTask.count({
      where: {
        userId,
        objectType: "project",
        objectId: projectId,
        actionType: "project_layout_generation",
        countedToBudget: true,
      },
    }),
    db.generationTask.count({
      where: {
        userId,
        objectType: "project",
        objectId: projectId,
        actionType: "project_layout_regeneration",
        countedToBudget: true,
      },
    }),
    db.generationTask.count({
      where: {
        userId,
        objectType: "project",
        objectId: projectId,
        actionType: "project_material_recognition",
        countedToBudget: true,
      },
    }),
    db.generationTask.count({
      where: {
        userId,
        objectType: "project",
        objectId: projectId,
        actionType: "project_structure_suggestion",
        countedToBudget: true,
      },
    }),
  ]);

  const limits = PROJECT_ACTION_LIMITS[planType];
  return {
    layoutGenerations: buildObjectActionQuota(
      "生成排版",
      limits.layoutGenerations,
      layoutGenerationsUsed
    ),
    layoutRegenerations: buildObjectActionQuota(
      "重新生成",
      limits.layoutRegenerations,
      layoutRegenerationsUsed
    ),
    projectUnderstandings: buildObjectActionQuota(
      "AI 项目理解",
      limits.projectUnderstandings,
      projectUnderstandingsUsed
    ),
    structureSuggestions: buildObjectActionQuota(
      "生成章节结构",
      limits.structureSuggestions,
      structureSuggestionsUsed
    ),
  };
}

export async function getPortfolioActionSummary(userId: string, portfolioId: string) {
  const planType = await getUserPlan(userId);
  const [diagnosesUsed, packagingGenerationsUsed, packagingRegenerationsUsed] =
    await Promise.all([
      db.generationTask.count({
        where: {
          userId,
          objectType: "portfolio",
          objectId: portfolioId,
          actionType: "portfolio_diagnosis",
          countedToBudget: true,
        },
      }),
      db.generationTask.count({
        where: {
          userId,
          objectType: "portfolio",
          objectId: portfolioId,
          actionType: "portfolio_packaging_generation",
          countedToBudget: true,
        },
      }),
      db.generationTask.count({
        where: {
          userId,
          objectType: "portfolio",
          objectId: portfolioId,
          actionType: "portfolio_packaging_regeneration",
          countedToBudget: true,
        },
      }),
    ]);

  const limits = PORTFOLIO_ACTION_LIMITS[planType];
  return {
    diagnoses: buildObjectActionQuota("作品集诊断", limits.diagnoses, diagnosesUsed),
    packagingGenerations: buildObjectActionQuota(
      "生成作品集包装",
      limits.packagingGenerations,
      packagingGenerationsUsed
    ),
    packagingRegenerations: buildObjectActionQuota(
      "重新包装",
      limits.packagingRegenerations,
      packagingRegenerationsUsed
    ),
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

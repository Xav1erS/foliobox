import { db } from "@/lib/db";

export type PlanType = "FREE" | "PRO" | "SPRINT";

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
      "完整重制流程",
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

export async function getUserPlan(userId: string): Promise<PlanType> {
  const plan = await db.userPlan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return "FREE";
  return plan.planType as PlanType;
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

import { AppShell } from "@/components/shells/AppShell";
import type { AccountDialogData } from "@/components/app/AccountDialog";
import {
  getEntitlementSummary,
  getQuotaStatus,
  PLAN_DEFINITIONS,
  QUOTA_DISPLAY_ORDER,
  formatQuotaUsageValue,
} from "@/lib/entitlement";
import { formatProjectDate } from "@/lib/project-workflow";
import { getCachedSession } from "@/lib/required-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();
  let accountDialogData: AccountDialogData | null = null;

  if (session?.user?.id) {
    const entitlementSummary = await getEntitlementSummary(session.user.id);
    const quotaStatus = getQuotaStatus(entitlementSummary);
    const planDefinition =
      PLAN_DEFINITIONS.find((plan) => plan.planType === entitlementSummary.planType.toLowerCase()) ??
      PLAN_DEFINITIONS[0];

    accountDialogData = {
      currentPlan: entitlementSummary.planType,
      summaryTitle: entitlementSummary.title,
      summaryDescription: entitlementSummary.description,
      expiresAtLabel: entitlementSummary.expiresAt
        ? formatProjectDate(entitlementSummary.expiresAt)
        : null,
      featureList: planDefinition.featureList,
      quotaStatus,
      quotas: QUOTA_DISPLAY_ORDER.map((key) => {
        const quota = entitlementSummary.quotas[key];
        return {
          key,
          label: quota.label,
          value: formatQuotaUsageValue(key, quota),
          used: quota.used,
          remaining: quota.remaining,
          limit: quota.limit,
        };
      }),
    };
  }

  return (
    <AppShell userEmail={session?.user?.email} accountDialogData={accountDialogData}>
      {children}
    </AppShell>
  );
}

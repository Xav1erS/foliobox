import { db } from "../../lib/db";

export const TEST_USER_EMAIL = "playwright-test@foliobox.dev";

export async function getTestUserId() {
  const user = await db.user.findUniqueOrThrow({ where: { email: TEST_USER_EMAIL } });
  return user.id;
}

export async function ensureTestUserPlan(planType: "FREE" | "PRO" | "SPRINT" = "SPRINT") {
  const userId = await getTestUserId();
  const existingPlan = await db.userPlan.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (existingPlan) {
    await db.userPlan.update({
      where: { id: existingPlan.id },
      data: {
        planType,
        status: "ACTIVE",
        startedAt: existingPlan.startedAt ?? new Date(),
        expiresAt: null,
      },
    });
    return userId;
  }

  await db.userPlan.create({
    data: {
      userId,
      planType,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: null,
    },
  });
  return userId;
}

export async function cleanupProjectArtifacts(projectIds: string[]) {
  if (projectIds.length === 0) return;

  await db.generatedDraft.deleteMany({
    where: { objectType: "project", objectId: { in: projectIds } },
  });
  await db.generationTask.deleteMany({
    where: { objectType: "project", objectId: { in: projectIds } },
  });
  await db.precheckLog.deleteMany({
    where: { objectType: "project", objectId: { in: projectIds } },
  });
  await db.project.deleteMany({
    where: { id: { in: projectIds } },
  });
}

export async function cleanupPortfolioArtifacts(portfolioIds: string[]) {
  if (portfolioIds.length === 0) return;

  await db.generatedDraft.deleteMany({
    where: { objectType: "portfolio", objectId: { in: portfolioIds } },
  });
  await db.generationTask.deleteMany({
    where: { objectType: "portfolio", objectId: { in: portfolioIds } },
  });
  await db.precheckLog.deleteMany({
    where: { objectType: "portfolio", objectId: { in: portfolioIds } },
  });
  await db.portfolio.deleteMany({
    where: { id: { in: portfolioIds } },
  });
}

export function makeSvgDataUrl(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
      <rect width="1600" height="900" rx="32" fill="#efe7da" />
      <rect x="72" y="72" width="1456" height="756" rx="24" fill="#fffaf3" stroke="#d8cab3" stroke-width="6" />
      <text x="110" y="186" fill="#493f35" font-size="76" font-family="Arial, sans-serif" font-weight="700">${label}</text>
      <text x="110" y="284" fill="#7a6d61" font-size="34" font-family="Arial, sans-serif">Playwright smoke asset</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

import { db } from "@/lib/db";

export function canAccessPortfolioScore(params: {
  scoreUserId: string | null;
  scoreAnonymousSessionId: string | null;
  currentUserId?: string | null;
  anonymousSessionId?: string | null;
}) {
  if (params.currentUserId && params.scoreUserId === params.currentUserId) {
    return true;
  }

  if (
    params.anonymousSessionId &&
    params.scoreAnonymousSessionId &&
    params.anonymousSessionId === params.scoreAnonymousSessionId
  ) {
    return true;
  }

  return false;
}

export async function claimPortfolioScoreForUser(params: {
  scoreId: string;
  currentUserId: string;
  scoreUserId: string | null;
  scoreAnonymousSessionId: string | null;
  anonymousSessionId?: string | null;
}) {
  if (params.scoreUserId || !params.anonymousSessionId) {
    return;
  }

  if (params.scoreAnonymousSessionId !== params.anonymousSessionId) {
    return;
  }

  await db.portfolioScore.update({
    where: { id: params.scoreId },
    data: {
      userId: params.currentUserId,
    },
  });
}

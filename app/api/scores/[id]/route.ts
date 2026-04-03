import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SCORE_ANONYMOUS_SESSION_COOKIE } from "@/lib/score-contract";
import {
  canAccessPortfolioScore,
  claimPortfolioScoreForUser,
} from "@/lib/score-access";

function serializeScore(score: Awaited<ReturnType<typeof db.portfolioScore.findUnique>>) {
  if (!score) return null;

  return {
    id: score.id,
    inputType: score.inputType,
    inputUrl: score.inputUrl,
    totalScore: score.totalScore,
    level: score.level,
    dimensionScores: score.dimensionScores,
    coverage: score.coverageJson,
    processing: score.processingJson,
    summaryPoints: score.summaryPoints,
    recommendedActions: score.recommendedActions,
    createdAt: score.createdAt,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const cookieStore = await cookies();
  const anonymousSessionId =
    cookieStore.get(SCORE_ANONYMOUS_SESSION_COOKIE)?.value ?? null;
  if (!session?.user?.id) {
    const { id } = await params;
    const score = await db.portfolioScore.findUnique({ where: { id } });
    if (!score) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const canAccess = canAccessPortfolioScore({
      scoreUserId: score.userId,
      scoreAnonymousSessionId: score.anonymousSessionId,
      anonymousSessionId,
    });
    if (!canAccess) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(serializeScore(score));
  }
  const { id } = await params;
  const score = await db.portfolioScore.findUnique({
    where: { id },
  });
  if (!score) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await claimPortfolioScoreForUser({
    scoreId: score.id,
    currentUserId: session.user.id,
    scoreUserId: score.userId,
    scoreAnonymousSessionId: score.anonymousSessionId,
    anonymousSessionId,
  });
  const canAccess = canAccessPortfolioScore({
    scoreUserId: score.userId ?? session.user.id,
    scoreAnonymousSessionId: score.anonymousSessionId,
    currentUserId: session.user.id,
    anonymousSessionId,
  });
  if (!canAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(serializeScore(score));
}

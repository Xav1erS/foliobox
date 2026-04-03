import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { ExternalParseUsageMeta } from "@/lib/pdf-parse/provider";

export async function persistExternalParseUsageEvent(params: {
  usage: ExternalParseUsageMeta;
  portfolioScoreId?: string | null;
  userId?: string | null;
}) {
  try {
    await db.externalParseUsageEvent.create({
      data: {
        provider: params.usage.provider,
        success: params.usage.success,
        elapsedMs: params.usage.elapsedMs,
        pageCount: params.usage.pageCount ?? null,
        estimatedCostUsd: params.usage.estimatedCostUsd ?? null,
        fileSizeBytes: params.usage.fileSizeBytes ?? null,
        errorMessage: params.usage.errorMessage ?? null,
        metadataJson: (params.usage.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        portfolioScoreId: params.portfolioScoreId ?? null,
        userId: params.userId ?? null,
      },
    });
  } catch (error) {
    console.error("[external-parse] failed to persist usage event", error);
  }
}

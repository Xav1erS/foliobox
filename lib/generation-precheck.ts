import { createHash } from "node:crypto";
import { db } from "@/lib/db";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashGenerationInput(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export async function findReusableGeneratedDraft(params: {
  userId: string;
  objectType: "project" | "portfolio";
  objectId: string;
  requestHash: string;
  draftType: string;
}) {
  const { userId, objectType, objectId, requestHash, draftType } = params;

  const tasks = await db.generationTask.findMany({
    where: {
      userId,
      objectType,
      objectId,
      requestHash,
      status: "done",
      wasSuccessful: true,
    },
    orderBy: { createdAt: "desc" },
    include: {
      drafts: {
        where: { draftType, isReusable: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 5,
  });

  const matched = tasks.find((task) => task.drafts[0]);
  return matched
    ? {
        task: matched,
        draft: matched.drafts[0],
      }
    : null;
}

export async function writePrecheckLog(params: {
  userId: string;
  objectType: "project" | "portfolio";
  objectId: string;
  actionType: string;
  budgetStatus: "healthy" | "near_limit" | "needs_topup";
  suggestedMode: "continue" | "reuse" | "downgrade" | "block";
  reusableDraftId?: string | null;
}) {
  return db.precheckLog.create({
    data: {
      userId: params.userId,
      objectType: params.objectType,
      objectId: params.objectId,
      actionType: params.actionType,
      budgetStatus: params.budgetStatus,
      suggestedMode: params.suggestedMode,
      reusableDraftId: params.reusableDraftId ?? null,
    },
  });
}

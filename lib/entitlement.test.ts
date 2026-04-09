import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    userPlan: {
      findFirst: vi.fn(),
    },
    generationTask: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    publishedPortfolio: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  canDo,
  formatQuotaLimitLabel,
  getEntitlementSummary,
  getPortfolioActionSummary,
  getProjectActionSummary,
  type EntitlementAction,
} from "./entitlement";

const PAID_ACTIONS: EntitlementAction[] = [
  "full_score",
  "full_rewrite",
  "multi_variant",
  "pdf_export",
  "publish_link",
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canDo", () => {
  describe("FREE plan", () => {
    it("blocks all paid actions", () => {
      for (const action of PAID_ACTIONS) {
        expect(canDo("FREE", action), `FREE should not do ${action}`).toBe(false);
      }
    });
  });

  describe("PRO plan", () => {
    it("allows all paid actions", () => {
      for (const action of PAID_ACTIONS) {
        expect(canDo("PRO", action), `PRO should do ${action}`).toBe(true);
      }
    });
  });

  describe("SPRINT plan", () => {
    it("allows all paid actions", () => {
      for (const action of PAID_ACTIONS) {
        expect(canDo("SPRINT", action), `SPRINT should do ${action}`).toBe(true);
      }
    });
  });

  describe("boundary: plan upgrade path", () => {
    it("FREE cannot export PDF", () => {
      expect(canDo("FREE", "pdf_export")).toBe(false);
    });

    it("PRO can export PDF", () => {
      expect(canDo("PRO", "pdf_export")).toBe(true);
    });

    it("FREE cannot publish link", () => {
      expect(canDo("FREE", "publish_link")).toBe(false);
    });

    it("PRO can publish link", () => {
      expect(canDo("PRO", "publish_link")).toBe(true);
    });

    it("FREE cannot trigger full rewrite", () => {
      expect(canDo("FREE", "full_rewrite")).toBe(false);
    });

    it("SPRINT can trigger full rewrite", () => {
      expect(canDo("SPRINT", "full_rewrite")).toBe(true);
    });
  });
});

describe("formatQuotaLimitLabel", () => {
  it("formats active projects as count", () => {
    expect(formatQuotaLimitLabel("activeProjects", 12)).toBe("12 个");
  });

  it("formats generation quotas as times", () => {
    expect(formatQuotaLimitLabel("portfolioPackagings", 8)).toBe("8 次");
  });

  it("returns locked label for zero quota", () => {
    expect(formatQuotaLimitLabel("publishLinks", 0)).toBe("未解锁");
  });
});

describe("entitlement contracts", () => {
  it("builds the summary from counted usage only", async () => {
    mockDb.userPlan.findFirst.mockResolvedValue({
      planType: "PRO",
      expiresAt: new Date("2026-05-01T00:00:00.000Z"),
    });
    mockDb.generationTask.findMany.mockResolvedValue([{ objectId: "p-1" }, { objectId: "p-2" }]);
    mockDb.generationTask.count.mockResolvedValueOnce(4).mockResolvedValueOnce(1);
    mockDb.publishedPortfolio.count.mockResolvedValue(1);

    const summary = await getEntitlementSummary("user-1");

    expect(summary.planType).toBe("PRO");
    expect(summary.quotas.activeProjects).toMatchObject({ used: 2, limit: 10, remaining: 8 });
    expect(summary.quotas.projectLayouts).toMatchObject({ used: 4, limit: 10, remaining: 6 });
    expect(summary.quotas.portfolioPackagings).toMatchObject({
      used: 1,
      limit: 1,
      remaining: 0,
    });
    expect(summary.quotas.publishLinks).toMatchObject({ used: 1, limit: 1, remaining: 0 });
  });

  it("returns object-level quotas for project actions", async () => {
    mockDb.userPlan.findFirst.mockResolvedValue({
      planType: "SPRINT",
      expiresAt: null,
    });
    mockDb.generationTask.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const summary = await getProjectActionSummary("user-1", "project-1");

    expect(summary.diagnoses).toMatchObject({ limit: 3, used: 1, remaining: 2 });
    expect(summary.layoutGenerations).toMatchObject({ limit: 3, used: 2, remaining: 1 });
    expect(summary.layoutRegenerations).toMatchObject({ limit: 3, used: 1, remaining: 2 });
  });

  it("returns object-level quotas for portfolio actions", async () => {
    mockDb.userPlan.findFirst.mockResolvedValue({
      planType: "PRO",
      expiresAt: null,
    });
    mockDb.generationTask.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const summary = await getPortfolioActionSummary("user-1", "portfolio-1");

    expect(summary.diagnoses).toMatchObject({ limit: 2, used: 2, remaining: 0 });
    expect(summary.packagingGenerations).toMatchObject({ limit: 1, used: 1, remaining: 0 });
    expect(summary.packagingRegenerations).toMatchObject({ limit: 1, used: 0, remaining: 1 });
  });
});

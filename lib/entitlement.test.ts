import { describe, it, expect, vi } from "vitest";

// canDo is a pure function — mock DB so Prisma doesn't need a real connection
vi.mock("@/lib/db", () => ({ db: {} }));

import { canDo, type PlanType, type EntitlementAction } from "./entitlement";

const PAID_ACTIONS: EntitlementAction[] = [
  "full_score",
  "full_rewrite",
  "multi_variant",
  "pdf_export",
  "publish_link",
];

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

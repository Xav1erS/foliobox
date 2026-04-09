import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { hashGenerationInput } from "./generation-precheck";

describe("hashGenerationInput", () => {
  it("is stable for equivalent object key order", () => {
    const a = hashGenerationInput({
      projectId: "p_1",
      facts: { role: "设计师", industry: "SaaS" },
      styleSelection: { source: "preset", presetKey: "clean-case" },
    });
    const b = hashGenerationInput({
      styleSelection: { presetKey: "clean-case", source: "preset" },
      facts: { industry: "SaaS", role: "设计师" },
      projectId: "p_1",
    });

    expect(a).toBe(b);
  });

  it("changes when the style selection changes", () => {
    const a = hashGenerationInput({
      projectId: "p_1",
      styleSelection: { source: "none" },
    });
    const b = hashGenerationInput({
      projectId: "p_1",
      styleSelection: { source: "preset", presetKey: "clean-case" },
    });

    expect(a).not.toBe(b);
  });
});

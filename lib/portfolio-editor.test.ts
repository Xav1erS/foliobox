import { describe, expect, it } from "vitest";
import {
  DEFAULT_FIXED_PAGES,
  mergePortfolioEditorState,
  resolvePortfolioEditorState,
} from "./portfolio-editor";

describe("portfolio editor state", () => {
  it("returns default fixed pages when outlineJson is empty", () => {
    const state = resolvePortfolioEditorState(null);
    expect(state.fixedPages).toEqual(DEFAULT_FIXED_PAGES);
    expect(state.diagnosis).toBeNull();
  });

  it("merges provided fixed pages by id", () => {
    const state = resolvePortfolioEditorState({
      fixedPages: [{ id: "cover", label: "封面", enabled: false }],
    });

    expect(state.fixedPages).toEqual([
      { id: "cover", label: "封面", enabled: false },
      DEFAULT_FIXED_PAGES[1],
      DEFAULT_FIXED_PAGES[2],
    ]);
  });

  it("clears diagnosis when patch asks for null", () => {
    const merged = mergePortfolioEditorState(
      {
        diagnosis: {
          overallVerdict: "ready",
          summary: "ok",
          checks: [],
          suggestions: [],
          updatedAt: "2026-04-09T00:00:00.000Z",
        },
      },
      { diagnosis: null }
    );

    expect(merged.diagnosis).toBeNull();
  });
});


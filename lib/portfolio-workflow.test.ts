import { describe, expect, it } from "vitest";
import { getPortfolioContinuePath } from "./portfolio-workflow";

describe("getPortfolioContinuePath", () => {
  it("sends draft portfolios to the editor start state", () => {
    expect(getPortfolioContinuePath({ id: "portfolio-1", status: "DRAFT" })).toEqual({
      href: "/portfolios/portfolio-1/editor",
      label: "开始编辑作品集",
    });
  });

  it("sends in-progress portfolios back to the unified editor", () => {
    expect(getPortfolioContinuePath({ id: "portfolio-2", status: "OUTLINE" })).toEqual({
      href: "/portfolios/portfolio-2/editor",
      label: "回到作品集编辑器",
    });
  });

  it("keeps published portfolios on the editor as the primary continue path", () => {
    expect(getPortfolioContinuePath({ id: "portfolio-3", status: "PUBLISHED" })).toEqual({
      href: "/portfolios/portfolio-3/editor",
      label: "继续修改作品集",
    });
  });
});

import { describe, expect, it } from "vitest";
import { resolveStyleProfile } from "./style-reference-presets";

describe("resolveStyleProfile", () => {
  it("returns default profile when no selection is provided", () => {
    expect(resolveStyleProfile()).toMatchObject({
      source: "none",
      label: "默认风格",
    });
  });

  it("resolves preset selections", () => {
    expect(
      resolveStyleProfile({ source: "preset", presetKey: "swiss-grid" })
    ).toMatchObject({
      source: "preset",
      label: "瑞士网格",
      presetKey: "swiss-grid",
    });
  });

  it("resolves user reference sets", () => {
    expect(
      resolveStyleProfile({
        source: "reference_set",
        referenceSetId: "set_1",
        referenceSetName: "我的 B 端参考",
      })
    ).toMatchObject({
      source: "reference_set",
      referenceSetId: "set_1",
      referenceSetName: "我的 B 端参考",
    });
  });
});

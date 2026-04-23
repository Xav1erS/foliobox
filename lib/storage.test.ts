import { describe, expect, it } from "vitest";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";

describe("buildPrivateBlobProxyUrl", () => {
  it("returns data urls unchanged", () => {
    const source = "data:image/svg+xml;utf8,%3Csvg%3E";

    expect(buildPrivateBlobProxyUrl(source)).toBe(source);
  });

  it("wraps private blob sources with the proxy route", () => {
    const source = "project-assets/example.png";

    expect(buildPrivateBlobProxyUrl(source)).toBe(
      "/api/blob/file?source=project-assets%2Fexample.png"
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectAssetsCompatibilityPage from "./assets/page";
import ProjectFactsCompatibilityPage from "./facts/page";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

beforeEach(() => {
  redirectMock.mockClear();
});

describe("project compatibility pages", () => {
  it("redirects the legacy assets page back to the editor", async () => {
    await expect(
      ProjectAssetsCompatibilityPage({ params: Promise.resolve({ id: "project-1" }) })
    ).rejects.toThrow("REDIRECT:/projects/project-1/editor");

    expect(redirectMock).toHaveBeenCalledWith("/projects/project-1/editor");
  });

  it("redirects the legacy facts page back to the editor", async () => {
    await expect(
      ProjectFactsCompatibilityPage({ params: Promise.resolve({ id: "project-2" }) })
    ).rejects.toThrow("REDIRECT:/projects/project-2/editor");

    expect(redirectMock).toHaveBeenCalledWith("/projects/project-2/editor");
  });
});

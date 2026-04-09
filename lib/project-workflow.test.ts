import { describe, expect, it } from "vitest";
import { getProjectContinuePath } from "./project-workflow";

describe("getProjectContinuePath", () => {
  it("sends new projects to the editor", () => {
    expect(getProjectContinuePath({ id: "project-1", stage: "DRAFT" })).toEqual({
      href: "/projects/project-1/editor",
      label: "开始编辑项目",
    });
  });

  it("sends workflow-stage projects back to the editor instead of legacy pages", () => {
    expect(getProjectContinuePath({ id: "project-2", stage: "COMPLETENESS" })).toEqual({
      href: "/projects/project-2/editor",
      label: "回到项目编辑器",
    });
  });

  it("keeps ready projects on the editor continue path", () => {
    expect(getProjectContinuePath({ id: "project-3", stage: "READY" })).toEqual({
      href: "/projects/project-3/editor",
      label: "继续编辑项目",
    });
  });
});

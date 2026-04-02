import { describe, expect, it } from "vitest";
import {
  getModelTierForTask,
  getOpenAIModelConfig,
  resolveOpenAIModel,
} from "./model-routing";

describe("getModelTierForTask", () => {
  it("routes outline generation to primary tier", () => {
    expect(getModelTierForTask("outline_generation")).toBe("primary");
  });

  it("routes portfolio scoring to lite tier", () => {
    expect(getModelTierForTask("portfolio_score")).toBe("lite");
  });

  it("forces vision requests to vision tier", () => {
    expect(getModelTierForTask("portfolio_score", { vision: true })).toBe(
      "vision"
    );
  });
});

describe("getOpenAIModelConfig", () => {
  it("uses defaults when env is empty", () => {
    expect(getOpenAIModelConfig({} as NodeJS.ProcessEnv)).toEqual({
      primary: "gpt-5.4-mini",
      lite: "gpt-5.4-nano",
      vision: "gpt-5.4-mini",
    });
  });

  it("supports env overrides and vision fallback", () => {
    expect(
      getOpenAIModelConfig({
        OPENAI_MODEL_PRIMARY: "gpt-4.1",
        OPENAI_MODEL_LITE: "gpt-4.1-mini",
      } as NodeJS.ProcessEnv)
    ).toEqual({
      primary: "gpt-4.1",
      lite: "gpt-4.1-mini",
      vision: "gpt-4.1",
    });
  });
});

describe("resolveOpenAIModel", () => {
  const config = {
    primary: "primary-model",
    lite: "lite-model",
    vision: "vision-model",
  };

  it("prefers explicit model override", () => {
    expect(
      resolveOpenAIModel({ task: "portfolio_score", model: "manual-model" }, config)
    ).toBe("manual-model");
  });

  it("uses task-based tier for text tasks", () => {
    expect(resolveOpenAIModel({ task: "portfolio_score" }, config)).toBe(
      "lite-model"
    );
  });

  it("uses vision tier for image tasks", () => {
    expect(
      resolveOpenAIModel({ task: "portfolio_score", vision: true }, config)
    ).toBe("vision-model");
  });
});

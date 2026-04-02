import { TASK_MODEL_TIER, type GenerateOptions, type LLMTask } from "./provider";

export type OpenAIModelTier = "primary" | "lite" | "vision";

export type OpenAIModelConfig = {
  primary: string;
  lite: string;
  vision: string;
};

const DEFAULT_OPENAI_MODEL_CONFIG: OpenAIModelConfig = {
  primary: "gpt-5.4-mini",
  lite: "gpt-5.4-nano",
  vision: "gpt-5.4-mini",
};

export function getOpenAIModelConfig(
  env: NodeJS.ProcessEnv = process.env
): OpenAIModelConfig {
  const primary = env.OPENAI_MODEL_PRIMARY || DEFAULT_OPENAI_MODEL_CONFIG.primary;
  const lite = env.OPENAI_MODEL_LITE || DEFAULT_OPENAI_MODEL_CONFIG.lite;
  const vision = env.OPENAI_MODEL_VISION || primary;

  return {
    primary,
    lite,
    vision,
  };
}

export function getModelTierForTask(
  task?: LLMTask,
  options?: { vision?: boolean }
): OpenAIModelTier {
  if (options?.vision) {
    return "vision";
  }

  if (!task) {
    return "primary";
  }

  return TASK_MODEL_TIER[task];
}

export function resolveOpenAIModel(
  options?: GenerateOptions,
  config: OpenAIModelConfig = getOpenAIModelConfig()
): string {
  if (options?.model) {
    return options.model;
  }

  const tier = getModelTierForTask(options?.task, {
    vision: options?.vision,
  });

  return config[tier];
}

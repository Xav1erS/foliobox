import { z } from "zod";

export type LLMTask =
  | "outline_generation"      // 生成作品集大纲
  | "case_study_generation"   // 生成作品集初稿
  | "resume_parse"            // 简历解析
  | "portfolio_score"         // 作品集评分
  | "text_rewrite"            // 文案改写
  | "label_extraction"        // 标签/标题提取
  | "consistency_check";      // 简历与作品集一致性检查

export interface LLMTrackContext {
  userId?: string | null;
  projectId?: string | null;
  outlineId?: string | null;
  draftId?: string | null;
  portfolioScoreId?: string | null;
  inputType?: string | null;
  fileSizeBytes?: number | null;
  pageCount?: number | null;
  itemCount?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface GenerateOptions {
  task?: LLMTask;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  vision?: boolean;
  track?: LLMTrackContext;
}

export interface ImageInput {
  /** base64-encoded image data */
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export interface LLMProvider {
  /**
   * Generate a free-form text response.
   */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Generate a structured JSON response validated against a Zod schema.
   */
  generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>;

  /**
   * Generate a structured JSON response with image inputs (vision).
   * Requires a vision-capable model (e.g. gpt-4o).
   */
  generateStructuredWithImages<T>(
    prompt: string,
    images: ImageInput[],
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T>;
}

/**
 * 每个任务建议使用的模型档位
 */
export const TASK_MODEL_TIER: Record<LLMTask, "primary" | "lite"> = {
  outline_generation: "primary",
  case_study_generation: "primary",
  text_rewrite: "primary",
  resume_parse: "lite",
  portfolio_score: "lite",
  label_extraction: "lite",
  consistency_check: "lite",
};

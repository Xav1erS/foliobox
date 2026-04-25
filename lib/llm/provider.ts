import { z } from "zod";

export type LLMTask =
  | "outline_generation"          // 生成作品集大纲
  | "case_study_generation"       // 生成作品集初稿
  | "portfolio_score"             // 作品集评分
  | "text_rewrite"                // 文案改写
  | "label_extraction"            // 标签/标题提取
  | "consistency_check"           // 简历与作品集一致性检查
  | "project_boundary_analysis"   // 项目边界判断（判断层）
  | "project_completeness_analysis" // 项目完整度分析（判断层）
  | "project_package_recommendation" // 包装模式推荐（判断层）
  | "project_material_recognition" // 项目素材轻识别（判断层）
  | "project_structure_suggestion" // 项目结构建议（结构层）
  | "project_prototype_generation" // 项目低保真内容稿（结构层）
  | "project_visual_asset_generation" // 项目叙事视觉资产补全（结构层）
  | "project_prototype_visual_single" // 单页手动补图（结构层）
  | "project_asset_reasoning_vision" // 单图素材使用说明（结构层，可选）
  | "project_layout_generation";  // 项目排版生成（包装层）

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

export interface GeneratedImage {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  revisedPrompt?: string | null;
}

export interface GenerateImageOptions extends GenerateOptions {
  size?: "auto" | "1024x1024" | "1536x1024" | "1024x1536";
  quality?: "low" | "medium" | "high" | "auto";
  outputFormat?: "png" | "jpeg" | "webp";
  background?: "transparent" | "opaque" | "auto";
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

  /**
   * Generate a single image asset from a prompt.
   */
  generateImage(
    prompt: string,
    options?: GenerateImageOptions
  ): Promise<GeneratedImage>;
}

/**
 * 每个任务建议使用的模型档位
 */
export const TASK_MODEL_TIER: Record<LLMTask, "primary" | "lite"> = {
  outline_generation: "primary",
  case_study_generation: "primary",
  text_rewrite: "primary",
  project_layout_generation: "primary",
  portfolio_score: "lite",
  label_extraction: "lite",
  consistency_check: "lite",
  project_boundary_analysis: "lite",
  project_completeness_analysis: "lite",
  project_package_recommendation: "lite",
  project_material_recognition: "lite",
  project_structure_suggestion: "lite",
  project_prototype_generation: "primary",
  project_visual_asset_generation: "primary",
  project_prototype_visual_single: "primary",
  project_asset_reasoning_vision: "lite",
};

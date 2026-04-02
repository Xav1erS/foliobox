import OpenAI from "openai";
import { z } from "zod";
import { ProxyAgent } from "undici";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  getOpenAIModelConfig,
  resolveOpenAIModel,
} from "./model-routing";
import type { GenerateOptions, ImageInput, LLMProvider } from "./provider";

function getProxyUrl(): string | undefined {
  return (
    process.env.OPENAI_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    undefined
  );
}

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const proxyUrl = getProxyUrl();
  const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    fetch: proxyAgent
      ? ((input, init) =>
          fetch(input, {
            ...(init ?? {}),
            dispatcher: proxyAgent,
          } as RequestInit & { dispatcher: ProxyAgent })) as typeof fetch
      : undefined,
  });
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultOptions: GenerateOptions;

  constructor(useLite = false) {
    this.client = getClient();
    this.defaultOptions = useLite ? { model: getOpenAIModelConfig().lite } : {};
  }

  private async persistUsage(params: {
    provider: string;
    method: string;
    task: string;
    model: string;
    elapsedMs: number;
    success: boolean;
    usage?: OpenAI.Completions.CompletionUsage;
    options?: GenerateOptions;
    errorMessage?: string;
  }) {
    const track = params.options?.track;

    try {
      await db.lLMUsageEvent.create({
        data: {
          provider: params.provider,
          method: params.method,
          task: params.task,
          model: params.model,
          success: params.success,
          elapsedMs: params.elapsedMs,
          promptTokens: params.usage?.prompt_tokens ?? null,
          completionTokens: params.usage?.completion_tokens ?? null,
          totalTokens: params.usage?.total_tokens ?? null,
          inputType: track?.inputType ?? null,
          fileSizeBytes: track?.fileSizeBytes ?? null,
          pageCount: track?.pageCount ?? null,
          itemCount: track?.itemCount ?? null,
          errorMessage: params.errorMessage ?? null,
          metadataJson: track?.metadata as Prisma.InputJsonValue | undefined,
          userId: track?.userId ?? null,
          projectId: track?.projectId ?? null,
          outlineId: track?.outlineId ?? null,
          draftId: track?.draftId ?? null,
          portfolioScoreId: track?.portfolioScoreId ?? null,
        },
      });
    } catch (error) {
      console.error("[llm] failed to persist usage event", error);
    }
  }

  private logUsage(
    method: string,
    model: string,
    startedAt: number,
    options?: GenerateOptions,
    usage?: OpenAI.Completions.CompletionUsage
  ) {
    const elapsedMs = Date.now() - startedAt;
    const task = options?.task ?? "unspecified";

    console.info("[llm]", {
      provider: "openai",
      method,
      task,
      model,
      elapsedMs,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    });

    void this.persistUsage({
      provider: "openai",
      method,
      task,
      model,
      elapsedMs,
      success: true,
      usage,
      options,
    });
  }

  private async handleError(
    method: string,
    model: string,
    startedAt: number,
    options?: GenerateOptions,
    error?: unknown
  ) {
    const elapsedMs = Date.now() - startedAt;
    const task = options?.task ?? "unspecified";
    const errorMessage =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";

    console.error("[llm]", {
      provider: "openai",
      method,
      task,
      model,
      elapsedMs,
      errorMessage,
    });

    await this.persistUsage({
      provider: "openai",
      method,
      task,
      model,
      elapsedMs,
      success: false,
      options,
      errorMessage,
    });
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const model = resolveOpenAIModel(finalOptions);
    const startedAt = Date.now();
    try {
      const response = await this.client.chat.completions.create({
        model,
        temperature: finalOptions.temperature ?? 0.7,
        max_completion_tokens: finalOptions.maxTokens,
        messages: [
          ...(finalOptions.systemPrompt
            ? [{ role: "system" as const, content: finalOptions.systemPrompt }]
            : []),
          { role: "user" as const, content: prompt },
        ],
      });
      this.logUsage("generate", model, startedAt, finalOptions, response.usage);
      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      await this.handleError("generate", model, startedAt, finalOptions, error);
      throw error;
    }
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const model = resolveOpenAIModel(finalOptions);
    const startedAt = Date.now();
    try {
      const response = await this.client.chat.completions.create({
        model,
        temperature: finalOptions.temperature ?? 0.3,
        max_completion_tokens: finalOptions.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system" as const,
            content:
              (finalOptions.systemPrompt ?? "") +
              "\nRespond with valid JSON matching the requested schema.",
          },
          { role: "user" as const, content: prompt },
        ],
      });
      this.logUsage(
        "generateStructured",
        model,
        startedAt,
        finalOptions,
        response.usage
      );

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (error) {
      await this.handleError("generateStructured", model, startedAt, finalOptions, error);
      throw error;
    }
  }

  async generateStructuredWithImages<T>(
    prompt: string,
    images: ImageInput[],
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    const finalOptions = {
      ...this.defaultOptions,
      ...options,
      vision: true,
    };
    const model = resolveOpenAIModel(finalOptions);
    const startedAt = Date.now();

    const imageContent = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "low" as const, // low detail to save tokens
      },
    }));

    try {
      const response = await this.client.chat.completions.create({
        model,
        temperature: finalOptions.temperature ?? 0.3,
        max_completion_tokens: finalOptions.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              (finalOptions.systemPrompt ?? "") +
              "\nRespond with valid JSON matching the requested schema.",
          },
          {
            role: "user",
            content: [
              ...imageContent,
              { type: "text" as const, text: prompt },
            ],
          },
        ],
      });
      this.logUsage(
        "generateStructuredWithImages",
        model,
        startedAt,
        finalOptions,
        response.usage
      );

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (error) {
      await this.handleError(
        "generateStructuredWithImages",
        model,
        startedAt,
        finalOptions,
        error
      );
      throw error;
    }
  }
}

export const llm = new OpenAIProvider();
export const llmLite = new OpenAIProvider(true);

import OpenAI from "openai";
import { z } from "zod";
import { ProxyAgent } from "undici";
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
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const model = resolveOpenAIModel(finalOptions);
    const startedAt = Date.now();
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
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    const finalOptions = { ...this.defaultOptions, ...options };
    const model = resolveOpenAIModel(finalOptions);
    const startedAt = Date.now();
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
  }
}

export const llm = new OpenAIProvider();
export const llmLite = new OpenAIProvider(true);

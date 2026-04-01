import OpenAI from "openai";
import { z } from "zod";
import type { GenerateOptions, ImageInput, LLMProvider } from "./provider";

const PRIMARY_MODEL = "gpt-4o";
const LITE_MODEL = "gpt-4o-mini";

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private primaryModel: string;
  private liteModel: string;

  constructor(useLite = false) {
    this.client = getClient();
    this.primaryModel = useLite ? LITE_MODEL : PRIMARY_MODEL;
    this.liteModel = LITE_MODEL;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model ?? this.primaryModel;
    const response = await this.client.chat.completions.create({
      model,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      messages: [
        ...(options?.systemPrompt
          ? [{ role: "system" as const, content: options.systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodSchema<T>,
    options?: GenerateOptions
  ): Promise<T> {
    const model = options?.model ?? this.primaryModel;
    const response = await this.client.chat.completions.create({
      model,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system" as const,
          content:
            (options?.systemPrompt ?? "") +
            "\nRespond with valid JSON matching the requested schema.",
        },
        { role: "user" as const, content: prompt },
      ],
    });

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
    // Vision always uses the primary model (gpt-4o)
    const model = options?.model ?? PRIMARY_MODEL;

    const imageContent = images.map((img) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
        detail: "low" as const, // low detail to save tokens
      },
    }));

    const response = await this.client.chat.completions.create({
      model,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            (options?.systemPrompt ?? "") +
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

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return schema.parse(parsed);
  }
}

export const llm = new OpenAIProvider();
export const llmLite = new OpenAIProvider(true);

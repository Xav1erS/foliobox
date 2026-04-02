import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import { ProxyAgent } from "undici";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key]) continue;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalized =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = normalized;
  }
}

const projectRoot = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL_LITE || "gpt-4o-mini";
const proxyUrl =
  process.env.OPENAI_PROXY_URL ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.ALL_PROXY ||
  undefined;

if (!apiKey) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;

const client = new OpenAI({
  apiKey,
  timeout: 20000,
  maxRetries: 0,
  fetch: proxyAgent
    ? (input, init) =>
        fetch(input, {
          ...(init ?? {}),
          dispatcher: proxyAgent,
        })
    : undefined,
});
const startedAt = Date.now();

try {
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    max_completion_tokens: 120,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Respond with valid JSON only. Keep the response minimal and machine-readable.",
      },
      {
        role: "user",
        content:
          'Return {"status":"ok","scene":"openai_connectivity_test","provider":"openai"}',
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  console.info("OpenAI connectivity test passed", {
    model,
    elapsedMs: Date.now() - startedAt,
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
    totalTokens: response.usage?.total_tokens ?? null,
    payload: parsed,
  });
} catch (error) {
  console.error("OpenAI connectivity test failed");
  console.error(error);
  process.exit(1);
}

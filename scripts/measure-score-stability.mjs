import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { del, put } from "@vercel/blob";

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

function parseArgs(argv) {
  const args = {
    file: "",
    runs: 3,
    baseUrl: process.env.MEASURE_SCORE_BASE_URL || "https://www.foliobox.art",
    keepUploaded: false,
    output: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--file") args.file = argv[index + 1] ?? "";
    if (current === "--runs") args.runs = Number(argv[index + 1] ?? "3");
    if (current === "--base-url") args.baseUrl = argv[index + 1] ?? args.baseUrl;
    if (current === "--output") args.output = argv[index + 1] ?? "";
    if (current === "--keep-uploaded") args.keepUploaded = true;
  }

  return args;
}

function sanitizeFileSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function createDefaultOutputPath(projectRoot, filePath, kind) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = sanitizeFileSegment(path.basename(filePath, path.extname(filePath)));
  return path.join(
    projectRoot,
    "private-docs",
    "llm-measurements",
    `${kind}-${timestamp}-${baseName}.json`
  );
}

function mean(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
}

function getCookieHeader(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return "";
  const firstPair = raw.split(",")[0]?.split(";")[0]?.trim();
  return firstPair || "";
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function judgementCounts(dimensionScores) {
  const values = Object.values(dimensionScores || {});
  return {
    full: values.filter((item) => item?.judgementState === "full_judgement").length,
    limited: values.filter((item) => item?.judgementState === "limited_judgement").length,
    insufficient: values.filter((item) => item?.judgementState === "insufficient_evidence").length,
  };
}

async function uploadPrivatePdf(filePath) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const absolutePath = path.resolve(filePath);
  const fileBuffer = fs.readFileSync(absolutePath);
  const mimeType = getMimeType(absolutePath);
  const pathname = `score-inputs/${Date.now()}-${randomUUID()}-${sanitizeFileSegment(path.basename(absolutePath))}`;

  const blob = await put(pathname, fileBuffer, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    access: "private",
    addRandomSuffix: false,
    contentType: mimeType,
  });

  return {
    uploadedFile: {
      url: blob.url,
      pathname: blob.pathname,
      name: path.basename(absolutePath),
      size: fileBuffer.byteLength,
      type: mimeType,
    },
    cleanupUrl: blob.url,
  };
}

async function createScore(baseUrl, uploadedFile) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/scores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputType: "pdf",
      file: uploadedFile,
    }),
  });

  const cookieHeader = getCookieHeader(response);
  const payload = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    elapsedMs: Date.now() - startedAt,
    payload,
    cookieHeader,
  };
}

async function fetchScore(baseUrl, scoreId, cookieHeader) {
  const response = await fetch(`${baseUrl}/api/scores/${scoreId}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

const projectRoot = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const { file, runs, baseUrl, keepUploaded, output } = parseArgs(process.argv.slice(2));

if (!file) {
  console.error(
    "Usage: npm run measure:score-stability -- --file /abs/path/file.pdf [--runs 3] [--base-url https://www.foliobox.art]"
  );
  process.exit(1);
}

const absolutePath = path.resolve(file);
const fileStats = fs.statSync(absolutePath);
const { uploadedFile, cleanupUrl } = await uploadPrivatePdf(absolutePath);

console.info("Starting score stability measurement", {
  file: absolutePath,
  fileSizeBytes: fileStats.size,
  fileSizeMB: Number((fileStats.size / 1024 / 1024).toFixed(2)),
  runs,
  baseUrl,
  uploadedPathname: uploadedFile.pathname,
});

const runResults = [];

try {
  for (let runIndex = 0; runIndex < runs; runIndex += 1) {
    const submitResult = await createScore(baseUrl, uploadedFile);

    if (!submitResult.ok || !submitResult.payload?.id) {
      const failedRun = {
        run: runIndex + 1,
        success: false,
        submitStatus: submitResult.status,
        submitElapsedMs: submitResult.elapsedMs,
        error: submitResult.payload?.error ?? "score_create_failed",
      };
      runResults.push(failedRun);
      console.info("Run finished", failedRun);
      continue;
    }

    const scoreResult = await fetchScore(
      baseUrl,
      submitResult.payload.id,
      submitResult.cookieHeader
    );

    if (!scoreResult.ok) {
      const failedRun = {
        run: runIndex + 1,
        success: false,
        scoreId: submitResult.payload.id,
        submitStatus: submitResult.status,
        scoreStatus: scoreResult.status,
        submitElapsedMs: submitResult.elapsedMs,
        error: scoreResult.payload?.error ?? "score_fetch_failed",
      };
      runResults.push(failedRun);
      console.info("Run finished", failedRun);
      continue;
    }

    const coverage = scoreResult.payload.coverage ?? {};
    const processing = scoreResult.payload.processing ?? {};
    const counts = judgementCounts(scoreResult.payload.dimensionScores);

    const successfulRun = {
      run: runIndex + 1,
      success: true,
      scoreId: submitResult.payload.id,
      submitStatus: submitResult.status,
      submitElapsedMs: submitResult.elapsedMs,
      totalScore: scoreResult.payload.totalScore ?? null,
      level: scoreResult.payload.level ?? null,
      parseProvider: processing.parseProvider ?? null,
      parseFallbackUsed: processing.parseFallbackUsed ?? null,
      parseElapsedMs: processing.parseElapsedMs ?? null,
      visualSourceAvailable: processing.visualSourceAvailable ?? null,
      detectedProjects: coverage.detectedProjects ?? null,
      totalUnits: coverage.totalUnits ?? null,
      visualAnchorCount: Array.isArray(coverage.visualAnchorUnits)
        ? coverage.visualAnchorUnits.length
        : 0,
      judgementCounts: counts,
      summaryPointsCount: Array.isArray(scoreResult.payload.summaryPoints)
        ? scoreResult.payload.summaryPoints.length
        : null,
      recommendedActionsCount: Array.isArray(scoreResult.payload.recommendedActions)
        ? scoreResult.payload.recommendedActions.length
        : null,
    };

    runResults.push(successfulRun);
    console.info("Run finished", successfulRun);
  }
} finally {
  if (!keepUploaded) {
    await del(cleanupUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
}

const successfulRuns = runResults.filter((item) => item.success);
const providerCounts = successfulRuns.reduce((acc, item) => {
  const key = item.parseProvider || "unknown";
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

const summary = {
  file: absolutePath,
  fileSizeBytes: fileStats.size,
  fileSizeMB: Number((fileStats.size / 1024 / 1024).toFixed(2)),
  baseUrl,
  runs,
  successCount: successfulRuns.length,
  failureCount: runResults.length - successfulRuns.length,
  providerCounts,
  averages: {
    submitElapsedMs: Math.round(
      mean(successfulRuns.map((item) => item.submitElapsedMs).filter((value) => typeof value === "number"))
    ),
    totalScore: Math.round(
      mean(successfulRuns.map((item) => item.totalScore).filter((value) => typeof value === "number"))
    ),
    detectedProjects: Number(
      mean(successfulRuns.map((item) => item.detectedProjects).filter((value) => typeof value === "number")).toFixed(2)
    ),
    visualAnchorCount: Number(
      mean(successfulRuns.map((item) => item.visualAnchorCount).filter((value) => typeof value === "number")).toFixed(2)
    ),
  },
  runResults,
};

console.info("\nScore stability summary");
console.info(JSON.stringify(summary, null, 2));

const outputPath = path.resolve(
  output || createDefaultOutputPath(projectRoot, absolutePath, "score-stability")
);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      kind: "score-stability",
      generatedAt: new Date().toISOString(),
      hostname: os.hostname(),
      summary,
    },
    null,
    2
  )
);
console.info(`Saved measurement to ${outputPath}`);

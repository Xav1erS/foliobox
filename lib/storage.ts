import { put, del, list, get } from "@vercel/blob";

export type StorageFolder = "resumes" | "project-assets" | "exports" | "score-inputs";
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";
const PRIVATE_BLOB_RETRY_DELAYS_MS = [150, 400, 900];

/**
 * Upload a file to Vercel Blob storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File | Blob,
  folder: StorageFolder,
  filename: string,
  access: "public" | "private" = "public"
): Promise<string> {
  const pathname = `${folder}/${Date.now()}-${filename}`;
  const { url } = await put(pathname, file, {
    access,
    addRandomSuffix: false,
  });
  return url;
}

/**
 * Delete a file from Vercel Blob storage by URL or pathname.
 */
export async function deleteFile(source: string): Promise<void> {
  await del(source);
}

export async function deleteFiles(sources: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(
      sources
        .map((source) => source.trim())
        .filter(Boolean)
    )
  );

  if (normalized.length === 0) {
    return;
  }

  await del(normalized);
}

/**
 * List files in a folder.
 */
export async function listFiles(folder: StorageFolder) {
  const { blobs } = await list({ prefix: `${folder}/` });
  return blobs;
}

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token ? token : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getPrivateBlob(sourceOrSources: string | string[]) {
  const sources = Array.from(
    new Set(
      (Array.isArray(sourceOrSources) ? sourceOrSources : [sourceOrSources])
        .map((source) => source.trim())
        .filter(Boolean)
    )
  );

  if (sources.length === 0) {
    throw new Error("blob_fetch_failed");
  }

  let lastError: unknown = new Error("blob_fetch_failed");

  for (const source of sources) {
    for (let attempt = 0; attempt <= PRIVATE_BLOB_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const result = await get(source, {
          access: "private",
          useCache: false,
          ...(getBlobToken() ? { token: getBlobToken() } : {}),
        });

        if (result && result.statusCode === 200) {
          return result;
        }

        lastError = new Error("blob_fetch_failed");
      } catch (error) {
        lastError = error;
      }

      const delayMs = PRIVATE_BLOB_RETRY_DELAYS_MS[attempt];
      if (typeof delayMs === "number") {
        await sleep(delayMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("blob_fetch_failed");
}

export function isBlobStorageUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function buildPrivateBlobProxyUrl(source: string) {
  return `/api/blob/file?source=${encodeURIComponent(source)}`;
}

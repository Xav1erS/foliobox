import { put, del, list } from "@vercel/blob";

export type StorageFolder = "resumes" | "project-assets" | "exports" | "score-inputs";
const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

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
 * Delete a file from Vercel Blob storage by URL.
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

/**
 * List files in a folder.
 */
export async function listFiles(folder: StorageFolder) {
  const { blobs } = await list({ prefix: `${folder}/` });
  return blobs;
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

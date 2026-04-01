import { put, del, list } from "@vercel/blob";

export type StorageFolder = "resumes" | "project-assets" | "exports";

/**
 * Upload a file to Vercel Blob storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  file: File | Blob,
  folder: StorageFolder,
  filename: string
): Promise<string> {
  const pathname = `${folder}/${Date.now()}-${filename}`;
  const { url } = await put(pathname, file, {
    access: "public",
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

import { upload } from "@vercel/blob/client";

type UploadFolder = "project-assets" | "score-inputs";
type UploadKind = "project-image" | "score-image" | "score-pdf";

export type UploadedBlobFile = {
  url: string;
  pathname: string;
  name: string;
  size: number;
  type: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function buildPathname(folder: UploadFolder, file: File) {
  return `${folder}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
}

export async function uploadFilesFromBrowser(params: {
  files: File[];
  folder: UploadFolder;
  kind: UploadKind;
}) {
  const { files, folder, kind } = params;

  const uploaded = await Promise.all(
    files.map(async (file) => {
      const blob = await upload(buildPathname(folder, file), file, {
        access: "public",
        contentType: file.type,
        multipart: file.size > 4 * 1024 * 1024,
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({
          folder,
          kind,
          originalName: file.name,
        }),
      });

      return {
        url: blob.url,
        pathname: blob.pathname,
        name: file.name,
        size: file.size,
        type: file.type,
      } satisfies UploadedBlobFile;
    })
  );

  return uploaded;
}

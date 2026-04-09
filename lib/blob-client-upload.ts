import { upload } from "@vercel/blob/client";

type UploadFolder = "project-assets" | "score-inputs" | "resumes" | "style-references";
type UploadKind =
  | "project-image"
  | "score-image"
  | "score-pdf"
  | "resume-pdf"
  | "style-reference-image";

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
        access: "private",
        contentType: file.type,
        // Keep client uploads on the simpler direct-upload path for MVP.
        // The multipart endpoint introduced cross-origin 400s in production.
        multipart: false,
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

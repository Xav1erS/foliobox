import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { createZipArchive, type ZipArchiveEntry } from "@/lib/zip-archive";

export const runtime = "nodejs";

const PLUGIN_FOLDER = "FolioBox-Figma-Plugin";
const PLUGIN_ARCHIVE_NAME = "foliobox-figma-plugin.zip";
const PLUGIN_FILES = ["manifest.json", "code.js", "ui.html", "README.md"] as const;

export async function GET() {
  const pluginRoot = path.join(process.cwd(), "figma-plugin");

  const entries = await Promise.all(
    PLUGIN_FILES.map(async (fileName) => {
      const filePath = path.join(pluginRoot, fileName);
      const data = await readFile(filePath);
      return {
        name: `${PLUGIN_FOLDER}/${fileName}`,
        data,
      } satisfies ZipArchiveEntry;
    })
  );

  const archive = createZipArchive(entries);

  return new NextResponse(archive, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(PLUGIN_ARCHIVE_NAME)}`,
      "Cache-Control": "no-store",
    },
  });
}

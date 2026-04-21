import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildProjectFigmaExportPayload } from "@/lib/project-figma-export";
import {
  getPrivateBlob,
  isBlobStorageUrl,
} from "@/lib/storage";
import { resolveProjectEditorScene } from "@/lib/project-editor-scene";

export const runtime = "nodejs";

function guessMimeType(source: string) {
  const lower = source.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/png";
}

function sanitizeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "project";
}

async function resolveAssetToDataUrl(source: string) {
  const isHttp = source.startsWith("http://") || source.startsWith("https://");

  if (!isHttp || isBlobStorageUrl(source)) {
    const result = await getPrivateBlob(source);
    if (result.statusCode !== 200) {
      throw new Error("blob_unavailable");
    }
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    const mimeType = result.blob.contentType || guessMimeType(source);
    return {
      mimeType,
      dataUrl: `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`,
    };
  }

  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("asset_fetch_failed");
  }
  const arrayBuffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type")?.split(";")[0] || guessMimeType(source);
  return {
    mimeType,
    dataUrl: `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      layoutJson: true,
      assets: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          imageUrl: true,
          title: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });

  const payload = await buildProjectFigmaExportPayload({
    projectId: project.id,
    projectName: project.name,
    scene,
    assets: project.assets,
    resolveImageData: async (asset) => resolveAssetToDataUrl(asset.imageUrl),
  });

  const filename = `${sanitizeFilenamePart(project.name)}-figma-export.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

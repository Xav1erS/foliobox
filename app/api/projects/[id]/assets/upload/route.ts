import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

type UploadedImagePayload = {
  url: string;
  pathname?: string;
  name: string;
  type: string;
  size: number;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isJson = req.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await req.json() : null;
  const formData = isJson ? null : await req.formData();
  const uploadedFiles = (isJson ? body?.files : null) as UploadedImagePayload[] | null;
  const files = (isJson ? [] : ((formData?.getAll("files") as File[]) ?? [])) as File[];

  if (!isJson && files.length === 0) {
    return NextResponse.json({ error: "请上传至少一张图片" }, { status: 400 });
  }
  if (isJson && (!uploadedFiles || uploadedFiles.length === 0)) {
    return NextResponse.json({ error: "请上传至少一张图片" }, { status: 400 });
  }

  const fileCount = isJson ? uploadedFiles!.length : files.length;
  if (fileCount > MAX_IMAGES) {
    return NextResponse.json({ error: `最多上传 ${MAX_IMAGES} 张` }, { status: 400 });
  }

  if (isJson) {
    for (const file of uploadedFiles!) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "仅支持 JPG / PNG / WebP 格式" }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "单张图片不能超过 20MB" }, { status: 400 });
      }
      if (typeof file.url !== "string" || typeof file.name !== "string") {
        return NextResponse.json({ error: "上传文件信息无效" }, { status: 400 });
      }
    }
  } else {
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "仅支持 JPG / PNG / WebP 格式" }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "单张图片不能超过 20MB" }, { status: 400 });
      }
    }
  }

  // Get current max sortOrder to append after existing assets
  const existing = await db.projectAsset.count({ where: { projectId: id } });

  const uploadResults = isJson
    ? uploadedFiles!.map((file, i) => ({
        url: file.url,
        pathname: file.pathname,
        index: existing + i,
        name: file.name,
      }))
    : await Promise.all(
        files.map((file, i) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const filename = `${id}-extra-${Date.now()}-${i}.${ext}`;
          return uploadFile(file, "project-assets", filename, "private").then((url) => ({
            url,
            pathname: undefined,
            index: existing + i,
            name: file.name,
          }));
        })
      );

  await db.projectAsset.createMany({
    data: uploadResults.map(({ url, pathname, index, name: fileName }) => ({
      projectId: id,
      assetType: "IMAGE",
      title: fileName.replace(/\.[^.]+$/, ""),
      imageUrl: pathname ?? url,
      sortOrder: index,
      selected: true,
      isCover: existing === 0 && index === 0,
    })),
  });

  if (project.importStatus !== "IMPORTED") {
    await db.project.update({ where: { id }, data: { importStatus: "IMPORTED" } });
  }

  return NextResponse.json({ ok: true });
}

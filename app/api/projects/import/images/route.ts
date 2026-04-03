import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

type UploadedImagePayload = {
  url: string;
  pathname?: string;
  name: string;
  type: string;
  size: number;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isJson = req.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await req.json() : null;
  const formData = isJson ? null : await req.formData();
  const name = (isJson ? body?.name : formData?.get("name"))?.toString().trim();
  if (!name) {
    return NextResponse.json({ error: "请提供项目名称" }, { status: 400 });
  }

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
    return NextResponse.json({ error: `最多上传 ${MAX_IMAGES} 张图片` }, { status: 400 });
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
        return NextResponse.json({ error: `单张图片不能超过 20MB` }, { status: 400 });
      }
    }
  }

  // Create project record
  const project = await db.project.create({
    data: {
      userId: session.user.id,
      name,
      sourceType: "IMAGES",
      importStatus: "IMPORTING",
    },
  });

  // Upload all images in parallel, then create asset records
  try {
    const uploadResults = isJson
      ? uploadedFiles!.map((file, i) => ({
          url: file.url,
          pathname: file.pathname,
          index: i,
          name: file.name,
        }))
      : await Promise.all(
          files.map((file, i) => {
            const ext = file.name.split(".").pop() ?? "jpg";
            const filename = `${project.id}-${i}.${ext}`;
            return uploadFile(file, "project-assets", filename, "private").then((url) => ({
              url,
              pathname: undefined,
              index: i,
              name: file.name,
            }));
          })
        );

    await db.projectAsset.createMany({
      data: uploadResults.map(({ url, pathname, index, name: fileName }) => ({
        projectId: project.id,
        assetType: "IMAGE",
        title: fileName.replace(/\.[^.]+$/, ""),
        imageUrl: pathname ?? url,
        sortOrder: index,
        selected: true,
        isCover: index === 0,
      })),
    });

    await db.project.update({
      where: { id: project.id },
      data: { importStatus: "IMPORTED" },
    });

    return NextResponse.json({ projectId: project.id }, { status: 201 });
  } catch (err) {
    // Mark project as failed if upload errors
    // TODO: clean up successfully uploaded Blob files on partial failure
    await db.project.update({
      where: { id: project.id },
      data: { importStatus: "FAILED" },
    }).catch(() => null);
    console.error("Image import error:", err);
    return NextResponse.json({ error: "图片上传失败，请重试" }, { status: 500 });
  }
}

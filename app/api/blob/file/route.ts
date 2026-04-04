import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrivateBlob, isBlobStorageUrl } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = request.nextUrl.searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "Missing source" }, { status: 400 });
  }

  const isPathname = !source.startsWith("http://") && !source.startsWith("https://");
  if (!isPathname && !isBlobStorageUrl(source)) {
    return NextResponse.json({ error: "Invalid blob source" }, { status: 400 });
  }

  try {
    const result = await getPrivateBlob(source);

    return new NextResponse(result.stream, {
      headers: {
        "content-type": result.blob.contentType,
        "content-disposition": result.blob.contentDisposition,
        "cache-control": result.blob.cacheControl,
        etag: result.blob.etag,
      },
    });
  } catch {
    return NextResponse.json({ error: "Blob not found" }, { status: 404 });
  }
}

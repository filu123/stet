import { NextResponse, type NextRequest } from "next/server";

import { isSupportedImageType, saveImageFile } from "@/lib/server/image-files";

export const dynamic = "force-dynamic";

/** Max upload size — keeps the data folder (and documents) sane. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }
  if (!isSupportedImageType(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 10MB)" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = await saveImageFile(bytes, file.type);
  return NextResponse.json({ url: `/api/images/${name}` });
}

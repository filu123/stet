import { NextResponse, type NextRequest } from "next/server";

import { readImageFile } from "@/lib/server/image-files";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ filename: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { filename } = await context.params;
  const image = await readImageFile(filename);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

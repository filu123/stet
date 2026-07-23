import { NextResponse, type NextRequest } from "next/server";

import { deleteFolder, isValidFolderName } from "@/lib/server/document-files";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ folderName: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { folderName } = await context.params;
  const name = decodeURIComponent(folderName);
  if (!isValidFolderName(name)) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }
  await deleteFolder(name);
  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from "next/server";

import { createFolder, isValidFolderName, listFolders } from "@/lib/server/document-files";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listFolders());
}

export async function POST(request: NextRequest) {
  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  if (!isValidFolderName(name)) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }
  await createFolder(name);
  return NextResponse.json({ ok: true });
}

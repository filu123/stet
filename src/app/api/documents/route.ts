import { NextResponse } from "next/server";

import { listDocumentFiles } from "@/lib/server/document-files";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listDocumentFiles());
}

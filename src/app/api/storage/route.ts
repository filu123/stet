import { NextResponse } from "next/server";

import { getDataDirectory } from "@/lib/server/document-files";

export const dynamic = "force-dynamic";

/** Storage health/info — its reachability is how the client detects file mode. */
export async function GET() {
  return NextResponse.json({ mode: "files", dataDir: getDataDirectory() });
}

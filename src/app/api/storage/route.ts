import { NextResponse } from "next/server";

import { getDataDirectory } from "@/lib/server/document-files";

export const dynamic = "force-dynamic";

/**
 * Storage health/info — its reachability is how the client detects file mode.
 *
 * On an ephemeral host (a Vercel/Netlify demo), set `STET_STORAGE_MODE=browser`
 * so this route 404s and the app falls back to in-browser storage — otherwise
 * it would try to write documents to a disappearing serverless filesystem.
 */
export async function GET() {
  if (process.env.STET_STORAGE_MODE === "browser") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.json({ mode: "files", dataDir: getDataDirectory() });
}

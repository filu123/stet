import { NextResponse, type NextRequest } from "next/server";

// Deep import on purpose: pulling the editor feature's index into a server
// route would drag "use client" components into the server bundle (see
// AGENTS.md dependency rules, api-route exception).
import { documentContentToMarkdown } from "@/features/editor/lib/markdown-serializer";
import {
  deleteDocumentFile,
  isValidDocumentId,
  readDocumentFile,
  writeDocumentFile,
  writeMarkdownSibling,
  type SerializedDocument,
} from "@/lib/server/document-files";
import type { TipTapJsonContent } from "@/types/document";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { documentId } = await context.params;
  if (!isValidDocumentId(documentId)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }
  const document = await readDocumentFile(documentId);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(document);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { documentId } = await context.params;
  if (!isValidDocumentId(documentId)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  let patch: Partial<Omit<SerializedDocument, "id">>;
  try {
    patch = (await request.json()) as Partial<Omit<SerializedDocument, "id">>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const document = await writeDocumentFile(documentId, patch);

  // Readable Markdown sibling — best-effort, never blocks the save.
  try {
    await writeMarkdownSibling(
      document,
      documentContentToMarkdown(document.content as TipTapJsonContent | null),
    );
  } catch {
    /* markdown sibling is a bonus, not a requirement */
  }

  return NextResponse.json(document);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { documentId } = await context.params;
  if (!isValidDocumentId(documentId)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }
  await deleteDocumentFile(documentId);
  return NextResponse.json({ ok: true });
}

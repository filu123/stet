"use client";

import { useParams } from "next/navigation";

import { ReaderScreen } from "@/features/reader";

/** `/read/[bookId]` — one book, one piece of it at a time. */
export default function ReadBookPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = typeof params.bookId === "string" ? params.bookId : null;

  if (!bookId) return null;
  return <ReaderScreen bookId={bookId} />;
}

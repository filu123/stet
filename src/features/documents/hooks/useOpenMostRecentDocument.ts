"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { ensureDocumentExists, listDocumentsByRecency } from "../lib/document-repository";

/**
 * For the `/` route: opens the most recently edited document,
 * creating a first document on a fresh install.
 */
export function useOpenMostRecentDocument(): void {
  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;

    const openMostRecent = async () => {
      await ensureDocumentExists();
      const documents = await listDocumentsByRecency();
      if (!isCancelled && documents[0]) {
        router.replace(`/document/${documents[0].id}`);
      }
    };

    void openMostRecent();
    return () => {
      isCancelled = true;
    };
  }, [router]);
}

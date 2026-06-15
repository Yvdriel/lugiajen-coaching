import { renderToBuffer } from "@react-pdf/renderer";
import { headers } from "next/headers";
import type { ReactElement } from "react";
import { auth } from "@/lib/auth";

// Route-handler helpers for the Ch11 PDF endpoints (server-only).

/**
 * Render a PDF document element to bytes. Centralizes the one cast `renderToBuffer`
 * needs: its param is typed to a `<Document>` element, but our wrapper components
 * (`FeedbackDocument` etc.) carry their own props type — they each return a Document.
 */
export function renderPdf(element: ReactElement): Promise<Uint8Array> {
  return renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0],
  ) as Promise<Uint8Array>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

/** Coach-only PDF routes re-check the session (convention 2): 401 Response if absent. */
export async function assertCoach(): Promise<Response | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  return null;
}

/** Filename-safe slug from a name (ASCII, lowercased). */
export function safeName(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "document"
  );
}

/** Wrap a rendered PDF buffer in a Response (inline so it opens in the viewer). */
export function pdfResponse(buffer: Uint8Array, filename: string): Response {
  // Node's Response accepts a Uint8Array body at runtime; the DOM lib's BodyInit
  // type doesn't model the generic Uint8Array, so cast at this one seam.
  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

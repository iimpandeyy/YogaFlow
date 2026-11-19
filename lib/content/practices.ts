import { getSupabaseClient } from "@/lib/supabase/client";
import { mapPracticeRow } from "./mapping";
import { isPracticeType, PRACTICE_COLUMNS, type Practice, type PracticeType } from "./types";

/**
 * Data-access layer for practice content (ARCHITECTURE §3, §9; Issue #8).
 *
 * - The only path from screens to practice content. Screens never query Supabase directly.
 * - Reads from Supabase PostgreSQL with the public anonymous key (RLS: SELECT only). Intended for
 *   server-side use (Server Components / route handlers).
 * - Never throws for expected failures: every call returns a typed result the UI can render
 *   (RC-09). There is no local fallback data at runtime.
 *
 * Rules for callers:
 * - Screens choose their copy from `reason` / `error.kind` only. They never render
 *   `error.message` (diagnostic detail for server logs). Only `kind` may cross the
 *   server → client boundary; never pass the whole error object to a Client Component.
 * - Every Supabase-backed route must opt in to dynamic rendering, with `await connection()`
 *   (from "next/server") or `export const dynamic = "force-dynamic"`. Owner decision recorded for
 *   ARCHITECTURE §10 item 1. Otherwise `next build` (which runs without Supabase variables) would
 *   prerender and bake in a "not-configured" page.
 */

export type ContentErrorKind =
  /** NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. */
  | "not-configured"
  /** Supabase returned an error, or the request could not be completed. */
  | "query-failed"
  /** A row did not match the content contract (unexpected type, vocabulary, or missing field). */
  | "invalid-data";

export interface ContentError {
  kind: ContentErrorKind;
  /** Diagnostic detail for logs only. Not user-facing copy, and never contains configuration values. */
  message: string;
}

export type ContentFailure = { ok: false; reason: "error"; error: ContentError };
export type ContentNotFound = { ok: false; reason: "not-found" };

export type PracticeListResult = { ok: true; data: Practice[] } | ContentFailure;
export type PracticeResult = { ok: true; data: Practice } | ContentNotFound | ContentFailure;

const TABLE = "practices";

function failure(kind: ContentErrorKind, message: string): ContentFailure {
  return { ok: false, reason: "error", error: { kind, message } };
}

function describe(error: unknown): string {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    const parts = [code, message].filter((part) => typeof part === "string" && part.length > 0);
    if (parts.length > 0) return parts.join(": ");
  }
  return "Unknown error";
}

/** All practices of one type, ordered by title. */
export async function listPractices(type: PracticeType): Promise<PracticeListResult> {
  if (!isPracticeType(type)) return failure("invalid-data", "Unknown practice type");

  const clientResult = getSupabaseClient();
  if (!clientResult.ok) {
    return failure("not-configured", `Missing: ${clientResult.missing.join(", ")}`);
  }

  try {
    const { data, error } = await clientResult.client
      .from(TABLE)
      .select(PRACTICE_COLUMNS)
      .eq("type", type)
      .order("title", { ascending: true });

    if (error) return failure("query-failed", describe(error));
    if (!Array.isArray(data)) return failure("invalid-data", "Expected a list of practices");

    const practices: Practice[] = [];
    for (const row of data) {
      const practice = mapPracticeRow(row);
      if (!practice || practice.type !== type) {
        return failure("invalid-data", "A practice row did not match the content model");
      }
      practices.push(practice);
    }
    return { ok: true, data: practices };
  } catch (error) {
    return failure("query-failed", describe(error));
  }
}

/** One practice by its stable slug. An unknown slug returns `{ ok: false, reason: "not-found" }`. */
export async function getPracticeBySlug(slug: string): Promise<PracticeResult> {
  if (typeof slug !== "string" || slug.trim().length === 0) {
    return { ok: false, reason: "not-found" };
  }

  const clientResult = getSupabaseClient();
  if (!clientResult.ok) {
    return failure("not-configured", `Missing: ${clientResult.missing.join(", ")}`);
  }

  try {
    const { data, error } = await clientResult.client
      .from(TABLE)
      .select(PRACTICE_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (error) return failure("query-failed", describe(error));
    if (data === null || data === undefined) return { ok: false, reason: "not-found" };

    const practice = mapPracticeRow(data);
    if (!practice)
      return failure("invalid-data", "The practice row did not match the content model");
    return { ok: true, data: practice };
  } catch (error) {
    return failure("query-failed", describe(error));
  }
}

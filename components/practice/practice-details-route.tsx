import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { focusRing } from "@/components/layout/focus-ring";
import { SAFETY_STOP_NOTICE } from "@/components/layout/wellness-copy";
import { FailureState } from "@/components/states/failure-state";
import { LoadingState } from "@/components/states/loading-state";
import { getPracticeBySlug, type PracticeResult, type PracticeType } from "@/lib/content";
import { PracticeDetailLayout } from "./practice-detail-layout";

/**
 * Shared Practice Details route logic for `/yoga/[slug]`, `/breathwork/[slug]`, and
 * `/meditation/[slug]` (US-04; DD-04; Issue #13). Server-side only.
 *
 * - The route's practice type is fixed by its folder. A slug that exists under another type is
 *   treated as not found, so a practice is only ever shown under its own library.
 * - The pages export `dynamic = "force-dynamic"` (ARCHITECTURE §10 item 1, owner decision).
 * - User-facing copy is chosen from `reason` / `error.kind` only; `error.message` is logged on the
 *   server and never rendered.
 */

/** Library each practice type belongs to (labels per RC-10 / POLICY §5). */
export const PRACTICE_LIBRARIES: Record<PracticeType, { href: string; label: string }> = {
  Yoga: { href: "/yoga", label: "Yoga" },
  Breathwork: { href: "/breathwork", label: "Breathwork" },
  Meditation: { href: "/meditation", label: "Meditation" },
};

export type PracticeDetailsParams = { params: Promise<{ slug: string }> };

/**
 * Mirrors the `practices_slug_format` database constraint. A slug outside this shape can never
 * exist, so it is not found without a content read.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Loads one practice for a route of the given type. Deduplicated per request, so the page and
 * `generateMetadata` share a single content read.
 */
const loadPractice = cache(async (type: PracticeType, slug: string): Promise<PracticeResult> => {
  if (!SLUG_PATTERN.test(slug)) return { ok: false, reason: "not-found" };
  const result = await getPracticeBySlug(slug);
  if (result.ok && result.data.type !== type) return { ok: false, reason: "not-found" };
  return result;
});

function libraryLinkLabel(type: PracticeType): string {
  return `Back to ${PRACTICE_LIBRARIES[type].label}`;
}

export async function generatePracticeMetadata(
  type: PracticeType,
  { params }: PracticeDetailsParams,
): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadPractice(type, slug);
  if (result.ok) return { title: `${result.data.title} | YogaFlow` };
  if (result.reason === "not-found") return { title: "Practice not found | YogaFlow" };
  return { title: "Practice could not be loaded | YogaFlow", robots: { index: false } };
}

function BackToLibraryLink({ type }: { type: PracticeType }) {
  return (
    <Link
      href={PRACTICE_LIBRARIES[type].href}
      className={`inline-flex items-center gap-1 rounded-md font-medium text-teal-900 underline underline-offset-4 hover:text-teal-950 ${focusRing}`}
    >
      <span aria-hidden="true">&larr;</span>
      {libraryLinkLabel(type)}
    </Link>
  );
}

/** Renders the Practice Details page body, or calls `notFound()` for an unknown slug. */
export async function renderPracticeDetailsPage(
  type: PracticeType,
  { params }: PracticeDetailsParams,
) {
  const { slug } = await params;
  const result = await loadPractice(type, slug);

  if (!result.ok && result.reason === "not-found") notFound();

  if (!result.ok) {
    console.error(
      `Practice details (${type}) failed: ${result.error.kind}: ${result.error.message}`,
    );
    return (
      <div className="mx-auto max-w-3xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
        <FailureState
          title="This practice could not be loaded"
          message="Something went wrong while loading this practice. Please try again."
          action={{ href: PRACTICE_LIBRARIES[type].href, label: libraryLinkLabel(type) }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-3xl min-w-0 px-4 pt-6 sm:px-6">
        <BackToLibraryLink type={type} />
      </div>
      {/* actions (#16, #17) are intentionally left unset here. */}
      <PracticeDetailLayout practice={result.data} safetyNotice={<p>{SAFETY_STOP_NOTICE}</p>} />
    </>
  );
}

/** Not-found body for a practice type's detail routes, with a path back to its library. */
export function PracticeNotFound({ type }: { type: PracticeType }) {
  return (
    <div data-state="not-found" className="mx-auto max-w-3xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Practice not found</h1>
      <p className="mt-4 text-base text-slate-700 sm:text-lg">
        We couldn&rsquo;t find this {PRACTICE_LIBRARIES[type].label} practice.
      </p>
      <Link
        href={PRACTICE_LIBRARIES[type].href}
        className={`mt-6 inline-block rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 ${focusRing}`}
      >
        {libraryLinkLabel(type)}
      </Link>
    </div>
  );
}

/** Loading body for the detail routes (RC-09). */
export function PracticeDetailsLoading() {
  return (
    <div className="mx-auto max-w-3xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
      <LoadingState label="Loading practice" placeholderCount={1} />
    </div>
  );
}

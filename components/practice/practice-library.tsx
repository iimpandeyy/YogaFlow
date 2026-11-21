import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";
import { EmptyState } from "@/components/states/empty-state";
import type { PracticeListResult, PracticeType } from "@/lib/content";
import { PracticeCard } from "./practice-card";
import { RetryButton } from "./retry-button";

type PracticeLibraryProps = {
  /** Practice type being listed. Used in the empty-state copy. */
  type: PracticeType;
  /** Result of `listPractices(type)` from the data-access layer. */
  result: PracticeListResult;
  /** Base path of the details route, for example "/yoga". Cards link to `${basePath}/${slug}`. */
  basePath: string;
};

/**
 * Practice library body shared by the Yoga, Breathwork, and Meditation pages (US-01, US-05, US-06).
 *
 * Renders the list in a responsive card grid, in the order the data-access layer returns it, or a
 * clear empty or failure state (RC-09): never a blank page. The calling page owns the h1, so card
 * and state titles are h2.
 *
 * Copy is chosen from `result.reason` only; `error.message` is diagnostic detail and is never
 * rendered. This component stays a Server Component: only the retry button runs in the browser.
 */
export function PracticeLibrary({ type, result, basePath }: PracticeLibraryProps) {
  if (!result.ok) {
    return (
      <div
        data-state="error"
        className="rounded-lg border border-slate-400 px-4 py-8 text-center sm:px-6"
      >
        <h2 className="text-lg font-semibold break-words text-slate-900">
          Practices could not be loaded
        </h2>
        <p role="alert" className="mt-2 break-words text-slate-700">
          Something went wrong while loading practices. Please try again.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <RetryButton />
          <Link
            href="/"
            className={`rounded-md border border-slate-400 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 ${focusRing}`}
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (result.data.length === 0) {
    return (
      <EmptyState
        title={`No ${type} practices yet`}
        message="Please check back later."
        action={{ href: "/", label: "Go to Home" }}
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.data.map((practice) => (
        <li key={practice.slug} className="min-w-0">
          <PracticeCard
            practice={practice}
            href={`${basePath}/${encodeURIComponent(practice.slug)}`}
            headingLevel={2}
          />
        </li>
      ))}
    </ul>
  );
}

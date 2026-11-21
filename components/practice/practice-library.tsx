import { EmptyState } from "@/components/states/empty-state";
import { FailureState } from "@/components/states/failure-state";
import type { PracticeListResult, PracticeType } from "@/lib/content";
import { PracticeCard } from "./practice-card";

type PracticeLibraryProps = {
  /** Practice type being listed. Used in the empty and failure copy. */
  type: PracticeType;
  /** Result of `listPractices(type)` from the data-access layer. */
  result: PracticeListResult;
  /** Base path of the details route, for example "/yoga". Cards link to `${basePath}/${slug}`. */
  basePath: string;
  /** Optional hint shown above the cards only when there are cards to select. */
  selectHint?: string;
};

/**
 * Practice library body shared by the Yoga, Breathwork, and Meditation pages (US-01, US-05, US-06).
 *
 * Renders the list in a responsive card grid, in the order the data-access layer returns it, or a
 * clear empty or failure state (RC-09): never a blank page. The calling page owns the h1, so card
 * and state titles are h2.
 *
 * Copy is chosen from `result.ok` / `result.reason` only; `error.message` is diagnostic detail
 * and is never rendered.
 */
export function PracticeLibrary({ type, result, basePath, selectHint }: PracticeLibraryProps) {
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-slate-400 px-4 py-8 sm:px-6">
        <FailureState
          headingLevel={2}
          title={`${type} practices could not be loaded`}
          message={`Something went wrong while loading ${type} practices. Please try again.`}
          action={{ href: "/", label: "Go to Home" }}
        />
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
    <>
      {selectHint ? <p className="mb-4 text-slate-700">{selectHint}</p> : null}
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
    </>
  );
}

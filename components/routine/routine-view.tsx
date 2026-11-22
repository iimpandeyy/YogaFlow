"use client";

import { useEffect, useRef, useState } from "react";
import { focusRing } from "@/components/layout/focus-ring";
import { PracticeCard } from "@/components/practice/practice-card";
import { practiceDetailsHref } from "@/components/practice/practice-href";
import { EmptyState } from "@/components/states/empty-state";
import { FailureState } from "@/components/states/failure-state";
import { LoadingState } from "@/components/states/loading-state";
import type { Practice } from "@/lib/content";
import { resolveSavedPractices, useSavedPractices } from "@/lib/saved";

/**
 * Practice content for resolving Routine slugs. Only success or failure crosses the server →
 * client boundary; error details stay in the server log.
 */
export type RoutineContent = { ok: true; practices: Practice[] } | { ok: false };

/** Discovery paths offered from an empty Routine (US-08; SDD §6.3 refinement 3). */
const DISCOVERY_LINKS = [
  { href: "/yoga", label: "Browse Yoga" },
  { href: "/breathwork", label: "Browse Breathwork" },
  { href: "/meditation", label: "Browse Meditation" },
] as const;

/** Visible item count, for example "1 practice" or "3 practices". */
export function routineCountLabel(count: number): string {
  return `${count} ${count === 1 ? "practice" : "practices"}`;
}

type PendingFocus = { kind: "item"; slug: string } | { kind: "empty" } | null;

/**
 * The Routine summary (US-08; Issue #17). A single Routine, in the order practices were added.
 * No reordering, timers, or scheduling (OQ-03).
 *
 * - Before saved state has loaded in this browser it shows a loading state, never an "empty" flash.
 * - With nothing in the Routine it shows the empty state with paths back to discovery.
 * - Routine slugs with no matching practice are skipped (and not counted) but never removed
 *   automatically; a failed content load shows the failure state and keeps every item.
 * - Removing an item updates the list and count at once, announces both, and moves focus to a
 *   nearby Remove button, or to the empty-state heading after the last one.
 */
export function RoutineView({ content }: { content: RoutineContent }) {
  const { hydrated, routine } = useSavedPractices();
  const [announcement, setAnnouncement] = useState("");
  // Where focus goes after the removed item leaves the list; applied after the next render.
  const pendingFocus = useRef<PendingFocus>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const emptyHeading = useRef<HTMLHeadingElement>(null);

  const items = content.ok ? resolveSavedPractices(routine.list, content.practices) : [];

  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target.kind === "empty") emptyHeading.current?.focus();
    else removeButtons.current.get(target.slug)?.focus();
  });

  function remove(practice: Practice) {
    const index = items.findIndex((item) => item.slug === practice.slug);
    const neighbor = items[index + 1] ?? items[index - 1];
    if (!routine.remove(practice.slug)) return;
    pendingFocus.current = neighbor ? { kind: "item", slug: neighbor.slug } : { kind: "empty" };
    const remaining = items.length - 1;
    setAnnouncement(
      remaining > 0
        ? `Removed ${practice.title} from Routine. ${routineCountLabel(remaining)} in your Routine.`
        : `Removed ${practice.title} from Routine. Your Routine is empty.`,
    );
  }

  let body;
  if (!hydrated) {
    body = <LoadingState label="Loading your Routine" />;
  } else if (routine.list.length > 0 && !content.ok) {
    body = (
      <FailureState
        headingLevel={2}
        title="Your Routine could not be loaded"
        message="Something went wrong while loading your Routine. Please try again. The practices in your Routine are kept."
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title="Your Routine is empty"
        message="Add practices from their details pages to collect them here, in the order you add them. Your Routine is kept in this browser only."
        action={DISCOVERY_LINKS}
        headingRef={emptyHeading}
      />
    );
  } else {
    body = (
      <>
        <p data-routine-count className="font-medium text-slate-800">
          {routineCountLabel(items.length)}
        </p>
        <ol
          aria-label="Practices in your Routine"
          className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((practice) => (
            <li key={practice.slug} className="flex min-w-0 flex-col gap-3">
              <PracticeCard
                practice={practice}
                href={practiceDetailsHref(practice)}
                headingLevel={2}
              />
              <button
                type="button"
                ref={(element) => {
                  if (element) removeButtons.current.set(practice.slug, element);
                  else removeButtons.current.delete(practice.slug);
                }}
                onClick={() => remove(practice)}
                className={`self-start rounded-md border border-slate-400 bg-white px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 ${focusRing}`}
              >
                Remove <span className="sr-only">{`${practice.title} from Routine`}</span>
              </button>
            </li>
          ))}
        </ol>
      </>
    );
  }

  return (
    <div data-routine-view className="mt-6">
      {/* Always mounted so removals and the new count are announced (RC-06). */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {body}
    </div>
  );
}

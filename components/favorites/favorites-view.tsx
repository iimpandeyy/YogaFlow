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
 * Practice content for resolving saved slugs. Only success or failure crosses the server → client
 * boundary; error details stay in the server log.
 */
export type FavoritesContent = { ok: true; practices: Practice[] } | { ok: false };

/** Discovery paths offered from an empty Favorites list (US-07; SDD §6.3 Flow 2). */
const DISCOVERY_LINKS = [
  { href: "/yoga", label: "Browse Yoga" },
  { href: "/breathwork", label: "Browse Breathwork" },
  { href: "/meditation", label: "Browse Meditation" },
] as const;

type PendingFocus = { kind: "item"; slug: string } | { kind: "empty" } | null;

/**
 * The Favorites list (US-07; Issue #16).
 *
 * - Before saved state has loaded in this browser it shows a loading state, never an "empty" flash.
 * - With nothing saved it shows the empty state with paths back to discovery. That needs no content.
 * - Saved practices are listed in saved order. Saved slugs with no matching practice are skipped
 *   and are never removed automatically; a failed content load shows the failure state and keeps
 *   every saved item.
 * - Removing an item updates the list at once, announces it, and moves focus to a nearby control.
 */
export function FavoritesView({ content }: { content: FavoritesContent }) {
  const { hydrated, favorites } = useSavedPractices();
  const [announcement, setAnnouncement] = useState("");
  // Where focus goes after the removed item leaves the list; applied after the next render.
  const pendingFocus = useRef<PendingFocus>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const emptyHeading = useRef<HTMLHeadingElement>(null);

  const items = content.ok ? resolveSavedPractices(favorites.list, content.practices) : [];

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
    if (!favorites.remove(practice.slug)) return;
    pendingFocus.current = neighbor ? { kind: "item", slug: neighbor.slug } : { kind: "empty" };
    setAnnouncement(`Removed ${practice.title} from Favorites`);
  }

  let body;
  if (!hydrated) {
    body = <LoadingState label="Loading your Favorites" />;
  } else if (favorites.list.length > 0 && !content.ok) {
    body = (
      <FailureState
        headingLevel={2}
        title="Your Favorites could not be loaded"
        message="Something went wrong while loading your Favorites. Please try again. Your saved practices are kept."
      />
    );
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title="No Favorites yet"
        message="Save a practice from its details page to find it here. Favorites are kept in this browser only."
        action={DISCOVERY_LINKS}
        headingRef={emptyHeading}
      />
    );
  } else {
    body = (
      <ul aria-label="Saved practices" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              Remove <span className="sr-only">{`${practice.title} from Favorites`}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div data-favorites-view className="mt-6">
      {/* Always mounted so removals are announced (RC-06). */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {body}
    </div>
  );
}

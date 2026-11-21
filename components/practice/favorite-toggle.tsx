"use client";

import { useState } from "react";
import { focusRing } from "@/components/layout/focus-ring";
import { useSavedPractices } from "@/lib/saved";

type FavoriteToggleProps = {
  /** Stable practice ID. Only this value is saved (POLICY §3). */
  slug: string;
};

/** Heart icon; filled when saved. Decorative: the state is always also given in text. */
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.2 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" />
    </svg>
  );
}

/**
 * Save / remove a practice from Favorites on its details page (US-07; Issue #16).
 *
 * - Saved state is shown by visible text and a filled/outlined icon, not color alone. The visible
 *   label is also the accessible name, so the label carries the state; `aria-pressed` is not used
 *   as well, because a toggle should not both change its label and report a pressed state.
 * - Until saved state has loaded in this browser (`hydrated`), the button is disabled and neutral,
 *   so it never shows a wrong saved/unsaved state.
 * - Each toggle updates immediately and writes a brief confirmation to a polite live region that
 *   stays mounted, so screen readers announce it.
 */
export function FavoriteToggle({ slug }: FavoriteToggleProps) {
  const { hydrated, favorites } = useSavedPractices();
  const [confirmation, setConfirmation] = useState("");
  const saved = hydrated && favorites.has(slug);

  function toggle() {
    if (!hydrated) return;
    if (saved) {
      favorites.remove(slug);
      setConfirmation("Removed from Favorites");
    } else if (favorites.add(slug)) {
      setConfirmation("Added to Favorites");
    }
  }

  const base = `inline-flex items-center gap-2 rounded-md border px-4 py-2 font-medium ${focusRing}`;
  const look = !hydrated
    ? "cursor-not-allowed border-slate-300 bg-slate-50 text-slate-700"
    : saved
      ? "border-teal-800 bg-teal-800 text-white hover:bg-teal-900"
      : "border-teal-800 bg-white text-teal-900 hover:bg-teal-50";

  return (
    <div data-favorite-toggle className="flex min-w-0 flex-col gap-1">
      <button type="button" onClick={toggle} disabled={!hydrated} className={`${base} ${look}`}>
        {hydrated ? <HeartIcon filled={saved} /> : null}
        <span>{saved ? "Saved to Favorites" : "Save to Favorites"}</span>
      </button>
      <p role="status" className="min-h-5 text-sm text-slate-700">
        {confirmation}
      </p>
    </div>
  );
}

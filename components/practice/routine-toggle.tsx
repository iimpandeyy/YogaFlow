"use client";

import { useState } from "react";
import { focusRing } from "@/components/layout/focus-ring";
import { useSavedPractices } from "@/lib/saved";

type RoutineToggleProps = {
  /** Stable practice ID. Only this value is saved (POLICY §3). */
  slug: string;
};

/**
 * Plus icon when the practice can be added; check mark once it is in the Routine.
 * Decorative: the state is always also given in text.
 */
function RoutineIcon({ added }: { added: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {added ? <path d="M4.5 12.5l5 5 10-11" /> : <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

/**
 * Add / remove a practice from the Routine on its details page (US-08; Issue #17).
 *
 * Mirrors the Favorites toggle (#16):
 * - The added state is shown by visible text and a plus/check icon, not color alone. The visible
 *   label is also the accessible name, so the label carries the state; `aria-pressed` is not used.
 * - When the practice is already in the Routine, the control shows "Added to Routine" and never
 *   offers a second add (D5). Activating it removes the practice from the Routine.
 * - Until saved state has loaded in this browser (`hydrated`), the button is disabled and neutral.
 * - Each change writes a brief confirmation to a polite live region that stays mounted.
 */
export function RoutineToggle({ slug }: RoutineToggleProps) {
  const { hydrated, routine } = useSavedPractices();
  const [confirmation, setConfirmation] = useState("");
  const added = hydrated && routine.has(slug);

  function toggle() {
    if (!hydrated) return;
    if (added) {
      if (routine.remove(slug)) setConfirmation("Removed from Routine");
    } else if (routine.add(slug)) {
      setConfirmation("Added to Routine");
    }
  }

  const base = `inline-flex items-center gap-2 rounded-md border px-4 py-2 font-medium ${focusRing}`;
  const look = !hydrated
    ? "cursor-not-allowed border-slate-300 bg-slate-50 text-slate-700"
    : added
      ? "border-teal-800 bg-teal-800 text-white hover:bg-teal-900"
      : "border-teal-800 bg-white text-teal-900 hover:bg-teal-50";

  return (
    <div data-routine-toggle className="flex min-w-0 flex-col gap-1">
      <button type="button" onClick={toggle} disabled={!hydrated} className={`${base} ${look}`}>
        {hydrated ? <RoutineIcon added={added} /> : null}
        <span>{added ? "Added to Routine" : "Add to Routine"}</span>
      </button>
      <p role="status" className="min-h-5 text-sm text-slate-700">
        {confirmation}
      </p>
    </div>
  );
}

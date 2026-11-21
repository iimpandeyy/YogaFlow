import type { Difficulty, PracticeType } from "@/lib/content";

/**
 * Small text labels shared by the practice card and the detail layout (DD-04).
 *
 * Every label carries its meaning in visible text, never color alone (RC-06). Values come from the
 * approved vocabularies in `@/lib/content` (RC-10); raw field names are never rendered.
 */

const badge =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5";

export function TypeLabel({ type }: { type: PracticeType }) {
  return <span className={`${badge} border-teal-800 bg-white text-teal-900`}>{type}</span>;
}

export function DifficultyLabel({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`${badge} border-slate-500 bg-slate-50 text-slate-800`}>
      <span className="sr-only">Difficulty: </span>
      {difficulty}
    </span>
  );
}

/** Visible marker for AI-written or not-yet-reviewed text and imagery (RC-11, OQ-02). */
export function PlaceholderLabel() {
  return (
    <span className={`${badge} border-dashed border-amber-800 bg-amber-50 text-amber-950`}>
      Placeholder
    </span>
  );
}

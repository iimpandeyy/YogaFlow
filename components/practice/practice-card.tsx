import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";
import type { Practice } from "@/lib/content";
import { PracticeImage } from "./practice-image";
import { DifficultyLabel, TypeLabel } from "./practice-labels";

type PracticeCardProps = {
  practice: Practice;
  /** Destination of the practice's details. The route scheme belongs to the details page (#13). */
  href: string;
  /** Level of the card title in the page outline. Defaults to 3. */
  headingLevel?: 2 | 3 | 4;
};

/**
 * Reusable practice card for every practice type (DD-04; US-01, US-05, US-06).
 *
 * The title is the link. A stretched overlay makes the whole card open the practice, while the
 * link's accessible name stays the practice title. Difficulty appears only when applicable and
 * body focus only where available. Reads the shared `Practice` type only; no per-type forks.
 */
export function PracticeCard({ practice, href, headingLevel = 3 }: PracticeCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <article className="relative flex h-full min-w-0 flex-col rounded-lg border border-slate-300 bg-white p-4 hover:border-slate-500 hover:bg-slate-50">
      <PracticeImage
        practice={practice}
        sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 100vw"
      />
      <Heading className="mt-4 text-lg font-semibold break-words text-slate-900">
        <Link
          href={href}
          className={`rounded after:absolute after:inset-0 after:content-[''] ${focusRing}`}
        >
          {practice.title}
        </Link>
      </Heading>
      <div className="mt-2 flex flex-wrap gap-2">
        <TypeLabel type={practice.type} />
        {practice.difficulty ? <DifficultyLabel difficulty={practice.difficulty} /> : null}
      </div>
      {practice.bodyFocus.length > 0 ? (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium text-slate-800">Body focus:</span>{" "}
          {practice.bodyFocus.join(", ")}
        </p>
      ) : null}
      <p className="mt-2 text-sm break-words text-slate-700">{practice.summary}</p>
    </article>
  );
}

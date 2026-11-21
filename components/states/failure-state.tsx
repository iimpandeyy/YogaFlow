import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";
import { RetryButton } from "./retry-button";

type FailureStateProps = {
  title: string;
  message: string;
  /** Path back to discovery, for example the practice type's library. */
  action?: { href: string; label: string };
  /** Level of the title in the page outline. Defaults to 1 (the state replaces the page body). */
  headingLevel?: 1 | 2;
};

/**
 * Reusable failure state for content that could not be loaded (RC-09): never a blank interface,
 * always a retry option. Callers supply neutral copy; raw error messages are never rendered.
 */
export function FailureState({ title, message, action, headingLevel = 1 }: FailureStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div data-state="failure">
      <Heading
        className={`font-semibold tracking-tight break-words text-slate-900 ${
          headingLevel === 1 ? "text-3xl sm:text-4xl" : "text-lg"
        }`}
      >
        {title}
      </Heading>
      <p role="alert" className="mt-4 text-base break-words text-slate-700 sm:text-lg">
        {message}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <RetryButton />
        {action ? (
          <Link
            href={action.href}
            className={`rounded-md border border-slate-400 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 ${focusRing}`}
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

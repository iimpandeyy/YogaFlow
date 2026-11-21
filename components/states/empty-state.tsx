import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";

type EmptyStateProps = {
  title: string;
  message?: string;
  /** Optional path back to discovery, for example from an empty Favorites list (US-07). */
  action?: { href: string; label: string };
  /** Level of the title in the page outline. Defaults to 2. */
  headingLevel?: 2 | 3;
};

/**
 * Reusable empty state for libraries and saved views (RC-09): never a blank interface.
 * Callers supply the copy.
 */
export function EmptyState({ title, message, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div
      data-state="empty"
      className="rounded-lg border border-dashed border-slate-400 px-4 py-8 text-center sm:px-6"
    >
      <Heading className="text-lg font-semibold break-words text-slate-900">{title}</Heading>
      {message ? <p className="mt-2 break-words text-slate-700">{message}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className={`mt-4 inline-block rounded-md border border-slate-400 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 ${focusRing}`}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";

type EmptyStateLink = { href: string; label: string };

type EmptyStateProps = {
  title: string;
  message?: string;
  /**
   * Optional path back to discovery, for example from an empty Favorites list (US-07). Pass a list
   * to offer several paths (for example Yoga, Breathwork, and Meditation).
   */
  action?: EmptyStateLink | readonly EmptyStateLink[];
  /** Level of the title in the page outline. Defaults to 2. */
  headingLevel?: 2 | 3;
};

const linkClass = `inline-block rounded-md border border-slate-400 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 ${focusRing}`;

/**
 * Reusable empty state for libraries and saved views (RC-09): never a blank interface.
 * Callers supply the copy.
 */
export function EmptyState({ title, message, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  const links = action === undefined ? [] : Array.isArray(action) ? action : [action];
  return (
    <div
      data-state="empty"
      className="rounded-lg border border-dashed border-slate-400 px-4 py-8 text-center sm:px-6"
    >
      <Heading className="text-lg font-semibold break-words text-slate-900">{title}</Heading>
      {message ? <p className="mt-2 break-words text-slate-700">{message}</p> : null}
      {links.length === 1 ? (
        <Link href={links[0].href} className={`mt-4 ${linkClass}`}>
          {links[0].label}
        </Link>
      ) : null}
      {links.length > 1 ? (
        <ul className="mt-4 flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkClass}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

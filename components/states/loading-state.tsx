type LoadingStateProps = {
  /** Visible, announced text, for example "Loading practices". Callers supply the copy. */
  label: string;
  /** Number of placeholder card outlines to show while loading. Defaults to 3. */
  placeholderCount?: number;
};

/**
 * Reusable loading state for libraries and saved views (RC-09): never a blank interface.
 * The label is visible text inside a polite live region; the card outlines are decorative.
 */
export function LoadingState({ label, placeholderCount = 3 }: LoadingStateProps) {
  return (
    <div data-state="loading">
      <p role="status" className="text-slate-700">
        {label}
      </p>
      <ul aria-hidden="true" className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: placeholderCount }, (_, index) => (
          <li
            key={index}
            className="h-48 rounded-lg border border-slate-200 bg-slate-100 motion-safe:animate-pulse"
          />
        ))}
      </ul>
    </div>
  );
}

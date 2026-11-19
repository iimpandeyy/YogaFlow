type SectionPlaceholderProps = {
  title: string;
};

/** Temporary page body for sections whose content is delivered by later Issues. */
export function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-4 text-base text-slate-700 sm:text-lg">This section is coming soon.</p>
    </div>
  );
}

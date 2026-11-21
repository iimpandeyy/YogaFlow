import type { ReactNode } from "react";
import type { Practice } from "@/lib/content";
import { PracticeImage } from "./practice-image";
import { DifficultyLabel, PlaceholderLabel, TypeLabel } from "./practice-labels";

type PracticeDetailLayoutProps = {
  practice: Practice;
  /**
   * Slot for the practice's actions (Favorites / Routine buttons, #15–#17). Rendered in the
   * header. Nothing is built behind it here.
   */
  actions?: ReactNode;
  /**
   * Slot inside the Safety & Caution section for the detail-page safety reinforcement owned by
   * #14 (prominence, disclaimer). Nothing is built behind it here.
   */
  safetyNotice?: ReactNode;
};

/**
 * Shared Practice Details layout for every practice type (DD-04; US-04; SDD §6.3).
 *
 * Section order is fixed and is not configurable:
 *   header (title, type, difficulty) → Safety & Caution → Instructions → Benefits → attribution.
 * Safety & Caution therefore always comes before the instructions (POLICY §3). Reads the shared
 * `Practice` type only; there are no per-type forks of this layout.
 */
export function PracticeDetailLayout({
  practice,
  actions,
  safetyNotice,
}: PracticeDetailLayoutProps) {
  const { attribution } = practice;
  const hasCautionSection = practice.caution !== null || safetyNotice !== undefined;
  const credits = [
    { label: "Source", value: attribution.source },
    { label: "License", value: attribution.license },
    { label: "Image credit", value: attribution.imageAttribution },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));
  const hasAttributionSection = attribution.isPlaceholder || credits.length > 0;

  return (
    <article
      aria-labelledby="practice-title"
      className="mx-auto max-w-3xl min-w-0 px-4 py-10 sm:px-6 sm:py-14"
    >
      <header data-section="header">
        <h1
          id="practice-title"
          className="text-3xl font-semibold tracking-tight break-words sm:text-4xl"
        >
          {practice.title}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <TypeLabel type={practice.type} />
          {practice.difficulty ? <DifficultyLabel difficulty={practice.difficulty} /> : null}
        </div>
        {practice.bodyFocus.length > 0 ? (
          <p className="mt-3 text-slate-700">
            <span className="font-medium text-slate-800">Body focus:</span>{" "}
            {practice.bodyFocus.join(", ")}
          </p>
        ) : null}
        <p className="mt-3 text-base break-words text-slate-700 sm:text-lg">{practice.summary}</p>
        <div className="mt-6">
          <PracticeImage practice={practice} sizes="(min-width: 768px) 720px, 100vw" preload />
        </div>
        {actions ? (
          <div data-slot="practice-actions" className="mt-6 flex flex-wrap gap-3">
            {actions}
          </div>
        ) : null}
      </header>

      {hasCautionSection ? (
        <section data-section="safety-caution" aria-labelledby="practice-caution" className="mt-10">
          <h2 id="practice-caution" className="text-xl font-semibold">
            Safety &amp; Caution
          </h2>
          {practice.caution !== null ? (
            <p className="mt-3 break-words text-slate-800">{practice.caution}</p>
          ) : null}
          {safetyNotice !== undefined ? (
            <div data-slot="safety-notice" className="mt-3">
              {safetyNotice}
            </div>
          ) : null}
        </section>
      ) : null}

      <section
        data-section="instructions"
        aria-labelledby="practice-instructions"
        className="mt-10"
      >
        <h2 id="practice-instructions" className="text-xl font-semibold">
          Instructions
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-800">
          {practice.instructions.map((step, index) => (
            <li key={index} className="break-words">
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section data-section="benefits" aria-labelledby="practice-benefits" className="mt-10">
        <h2 id="practice-benefits" className="text-xl font-semibold">
          Benefits
        </h2>
        <p className="mt-3 break-words text-slate-800">{practice.benefits}</p>
      </section>

      {hasAttributionSection ? (
        <section
          data-section="attribution"
          aria-labelledby="practice-attribution"
          className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-700"
        >
          <h2 id="practice-attribution" className="text-base font-semibold text-slate-900">
            Source &amp; attribution
          </h2>
          {attribution.isPlaceholder ? (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <PlaceholderLabel />
              <span>This practice&apos;s text or image has not yet been reviewed.</span>
            </p>
          ) : null}
          {credits.length > 0 ? (
            <dl className="mt-2 space-y-1">
              {credits.map((item) => (
                <div key={item.label} className="flex flex-wrap gap-x-1">
                  <dt className="font-medium text-slate-800">{item.label}:</dt>{" "}
                  <dd className="min-w-0 break-words">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}

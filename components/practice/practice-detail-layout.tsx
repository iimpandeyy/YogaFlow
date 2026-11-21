import type { ReactNode } from "react";
import { WELLNESS_DISCLAIMER } from "@/components/layout/wellness-copy";
import type { Practice } from "@/lib/content";
import { PracticeImage } from "./practice-image";
import { DifficultyLabel, PlaceholderLabel, TypeLabel } from "./practice-labels";

/**
 * Decorative "info" mark beside the Safety & Caution heading. The heading text carries the
 * meaning, so the section never relies on color or the icon alone (POLICY §3; WCAG 1.4.1).
 */
function SafetyIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 shrink-0 text-amber-800"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

type PracticeDetailLayoutProps = {
  practice: Practice;
  /**
   * Slot for the practice's actions (Favorites / Routine buttons, #15–#17). Rendered in the
   * header. Nothing is built behind it here.
   */
  actions?: ReactNode;
  /**
   * Line rendered directly under the Safety & Caution heading, before the practice's own caution
   * (#14). The detail routes always pass the owner-approved stop-on-pain line, so the section
   * always renders there, even when `caution` is null.
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
        <section
          data-section="safety-caution"
          aria-labelledby="practice-caution"
          className="mt-10 rounded-lg border-2 border-l-8 border-amber-700 bg-amber-50 p-4 text-slate-900 sm:p-6"
        >
          <h2 id="practice-caution" className="flex items-center gap-2 text-xl font-semibold">
            <SafetyIcon />
            Safety &amp; Caution
          </h2>
          {safetyNotice !== undefined ? (
            <div data-slot="safety-notice" className="mt-3 font-medium break-words">
              {safetyNotice}
            </div>
          ) : null}
          {practice.caution !== null ? (
            <p data-slot="practice-caution" className="mt-3 break-words text-slate-800">
              {practice.caution}
            </p>
          ) : null}
          <p
            data-slot="detail-wellness-disclaimer"
            className="mt-4 text-sm break-words text-slate-800"
          >
            {WELLNESS_DISCLAIMER}
          </p>
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

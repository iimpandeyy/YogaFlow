import { WELLNESS_DISCLAIMER } from "./wellness-copy";

/**
 * General-wellness disclaimer shown in the footer of every page (SDD US-10, RC-01; POLICY §2;
 * Issue #14). The wording is owner-approved and lives in `wellness-copy.ts`.
 */
export function WellnessDisclaimerSlot() {
  return (
    <p data-slot="wellness-disclaimer" className="break-words">
      {WELLNESS_DISCLAIMER}
    </p>
  );
}

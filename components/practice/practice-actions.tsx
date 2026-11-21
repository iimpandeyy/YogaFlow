import type { Practice } from "@/lib/content";
import { FavoriteToggle } from "./favorite-toggle";

type PracticeActionsProps = {
  practice: Pick<Practice, "slug">;
};

/**
 * Actions for a Practice Details page, passed to `PracticeDetailLayout`'s `actions` slot, which
 * lays them out in a wrapping row. Favorites (#16) lives here; Routine (#17) adds its control
 * next to it. Only the slug crosses to the client components.
 */
export function PracticeActions({ practice }: PracticeActionsProps) {
  return (
    <>
      <FavoriteToggle slug={practice.slug} />
    </>
  );
}

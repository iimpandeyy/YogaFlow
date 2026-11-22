import type { Practice } from "@/lib/content";
import { FavoriteToggle } from "./favorite-toggle";
import { RoutineToggle } from "./routine-toggle";

type PracticeActionsProps = {
  practice: Pick<Practice, "slug">;
};

/**
 * Actions for a Practice Details page, passed to `PracticeDetailLayout`'s `actions` slot, which
 * lays them out in a wrapping row: Favorites (#16), then Routine (#17). Only the slug crosses to
 * the client components.
 */
export function PracticeActions({ practice }: PracticeActionsProps) {
  return (
    <>
      <FavoriteToggle slug={practice.slug} />
      <RoutineToggle slug={practice.slug} />
    </>
  );
}

import type { Practice } from "@/lib/content";

/**
 * Turns saved slugs into practices for display, in saved order.
 *
 * Slugs with no matching practice (stale, removed from content, or never valid) are skipped, so
 * they never render as broken items. Repeated slugs appear once. The stored list is not changed.
 */
export function resolveSavedPractices(
  slugs: readonly string[],
  practices: readonly Practice[],
): Practice[] {
  const bySlug = new Map(practices.map((practice) => [practice.slug, practice]));
  const seen = new Set<string>();
  const result: Practice[] = [];
  for (const slug of slugs) {
    const practice = bySlug.get(slug);
    if (practice && !seen.has(slug)) {
      seen.add(slug);
      result.push(practice);
    }
  }
  return result;
}

/**
 * Saved slugs that match none of `practices`. Callers may pass these to `remove` to prune storage,
 * but only when `practices` is the complete content set; a partial list (one type, or a failed
 * load) would wrongly mark valid slugs as stale.
 */
export function findStaleSlugs(slugs: readonly string[], practices: readonly Practice[]): string[] {
  const known = new Set(practices.map((practice) => practice.slug));
  return slugs.filter((slug) => !known.has(slug));
}

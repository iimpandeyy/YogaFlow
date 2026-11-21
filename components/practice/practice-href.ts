import type { Practice } from "@/lib/content";

/**
 * Path of a practice's details page: `/{type}/{slug}` with the lower-case type folder
 * (`/yoga/…`, `/breathwork/…`, `/meditation/…`; #13). Safe to use in client components.
 */
export function practiceDetailsHref(practice: Pick<Practice, "slug" | "type">): string {
  return `/${practice.type.toLowerCase()}/${practice.slug}`;
}

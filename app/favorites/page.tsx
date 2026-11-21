import type { Metadata } from "next";
import { FavoritesView, type FavoritesContent } from "@/components/favorites/favorites-view";
import { listPractices, PRACTICE_TYPES, type Practice } from "@/lib/content";

export const metadata: Metadata = {
  title: "Favorites | YogaFlow",
};

// Supabase-backed: render per request, never at build (ARCHITECTURE §10 item 1).
export const dynamic = "force-dynamic";

/**
 * Loads every practice through the data-access layer so the browser can resolve its saved slugs
 * (ARCHITECTURE Flow 2). Favorites themselves stay in the browser and never reach the server.
 */
async function loadFavoritesContent(): Promise<FavoritesContent> {
  const results = await Promise.all(PRACTICE_TYPES.map((type) => listPractices(type)));
  const practices: Practice[] = [];
  for (const result of results) {
    if (!result.ok) {
      console.error(`Favorites content failed: ${result.error.kind}: ${result.error.message}`);
      return { ok: false };
    }
    practices.push(...result.data);
  }
  return { ok: true, practices };
}

export default async function FavoritesPage() {
  const content = await loadFavoritesContent();
  return (
    <div className="mx-auto max-w-5xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Favorites</h1>
      <FavoritesView content={content} />
    </div>
  );
}

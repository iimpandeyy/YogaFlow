import type { Metadata } from "next";
import { RoutineView, type RoutineContent } from "@/components/routine/routine-view";
import { listPractices, PRACTICE_TYPES, type Practice } from "@/lib/content";

export const metadata: Metadata = {
  title: "Routine | YogaFlow",
};

// Supabase-backed: render per request, never at build (ARCHITECTURE §10 item 1).
export const dynamic = "force-dynamic";

/**
 * Loads every practice through the data-access layer so the browser can resolve its Routine
 * slugs (ARCHITECTURE Flow 3). The Routine itself stays in the browser and never reaches the server.
 */
async function loadRoutineContent(): Promise<RoutineContent> {
  const results = await Promise.all(PRACTICE_TYPES.map((type) => listPractices(type)));
  const practices: Practice[] = [];
  for (const result of results) {
    if (!result.ok) {
      console.error(`Routine content failed: ${result.error.kind}: ${result.error.message}`);
      return { ok: false };
    }
    practices.push(...result.data);
  }
  return { ok: true, practices };
}

export default async function RoutinePage() {
  const content = await loadRoutineContent();
  return (
    <div className="mx-auto max-w-5xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Routine</h1>
      <RoutineView content={content} />
    </div>
  );
}

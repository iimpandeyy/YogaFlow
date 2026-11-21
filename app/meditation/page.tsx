import type { Metadata } from "next";
import { connection } from "next/server";
import { PracticeLibrary } from "@/components/practice/practice-library";
import { listPractices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Meditation | YogaFlow",
};

/** Meditation Library (US-06): every Meditation practice from the data-access layer, as cards. */
export default async function MeditationPage() {
  // Per-request rendering for Supabase-backed routes (owner decision; ARCHITECTURE §10 item 1).
  await connection();
  const result = await listPractices("Meditation");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Meditation</h1>
      <p className="mt-4 max-w-2xl text-base text-slate-700 sm:text-lg">
        Read guided meditation practice descriptions.
      </p>
      <div className="mt-8">
        <PracticeLibrary
          type="Meditation"
          result={result}
          basePath="/meditation"
          selectHint="Select a practice to see its details."
        />
      </div>
    </div>
  );
}

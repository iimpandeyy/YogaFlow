import type { Metadata } from "next";
import { connection } from "next/server";
import { PracticeLibrary } from "@/components/practice/practice-library";
import { listPractices } from "@/lib/content";

export const metadata: Metadata = {
  title: "Breathwork | YogaFlow",
};

/** Breathwork Library (US-05): every Breathwork practice from the data-access layer, as cards. */
export default async function BreathworkPage() {
  // Per-request rendering for Supabase-backed routes (owner decision; ARCHITECTURE §10 item 1).
  await connection();
  const result = await listPractices("Breathwork");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Breathwork</h1>
      <p className="mt-4 max-w-2xl text-base text-slate-700 sm:text-lg">
        Explore beginner-friendly breathing exercises.
      </p>
      <div className="mt-8">
        <PracticeLibrary
          type="Breathwork"
          result={result}
          basePath="/breathwork"
          selectHint="Select an exercise to see its steps."
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import {
  generatePracticeMetadata,
  renderPracticeDetailsPage,
  type PracticeDetailsParams,
} from "@/components/practice/practice-details-route";

// Supabase-backed: render per request, never at build (ARCHITECTURE §10 item 1).
export const dynamic = "force-dynamic";

export function generateMetadata(props: PracticeDetailsParams): Promise<Metadata> {
  return generatePracticeMetadata("Breathwork", props);
}

export default function BreathworkPracticePage(props: PracticeDetailsParams) {
  return renderPracticeDetailsPage("Breathwork", props);
}

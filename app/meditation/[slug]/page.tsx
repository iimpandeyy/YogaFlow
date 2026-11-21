import type { Metadata } from "next";
import {
  generatePracticeMetadata,
  renderPracticeDetailsPage,
  type PracticeDetailsParams,
} from "@/components/practice/practice-details-route";

// Supabase-backed: render per request, never at build (ARCHITECTURE §10 item 1).
export const dynamic = "force-dynamic";

export function generateMetadata(props: PracticeDetailsParams): Promise<Metadata> {
  return generatePracticeMetadata("Meditation", props);
}

export default function MeditationPracticePage(props: PracticeDetailsParams) {
  return renderPracticeDetailsPage("Meditation", props);
}

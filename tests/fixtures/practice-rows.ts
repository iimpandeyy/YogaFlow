import type { PracticeRow } from "@/lib/content/types";

/** Deterministic test fixtures (tests only; never imported by the application). */

export const yogaRow: PracticeRow = {
  slug: "test-yoga-pose",
  title: "Test Yoga Pose",
  type: "Yoga",
  difficulty: "Beginner",
  body_focus: ["Back", "Hips"],
  summary: "A test summary.",
  instructions: ["Step one.", "Step two."],
  benefits: "Test benefits.",
  caution: "Stop if you feel pain.",
  image_path: "/images/practices/test-yoga-pose.svg",
  image_alt: "Test image",
  source: "Test source",
  license: "Test license",
  image_attribution: "Test image attribution",
  is_placeholder: true,
};

export const secondYogaRow: PracticeRow = {
  ...yogaRow,
  slug: "another-test-pose",
  title: "Another Test Pose",
  difficulty: "Intermediate",
  body_focus: ["Core"],
};

export const breathworkRow: PracticeRow = {
  ...yogaRow,
  slug: "test-breathing",
  title: "Test Breathing",
  type: "Breathwork",
  difficulty: null,
  body_focus: [],
  caution: null,
  image_path: "/images/practices/test-breathing.svg",
};

import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";

type Entry = {
  href: string;
  label: string;
  description: string;
};

// Practice areas from SDD §2.2 / §6.1. Descriptions paraphrase the SDD MVP scope only.
const PRACTICE_AREAS: readonly Entry[] = [
  { href: "/yoga", label: "Yoga", description: "Browse a curated set of yoga poses." },
  {
    href: "/breathwork",
    label: "Breathwork",
    description: "Explore beginner-friendly breathing exercises.",
  },
  {
    href: "/meditation",
    label: "Meditation",
    description: "Read guided meditation practice descriptions.",
  },
];

const SAVED: readonly Entry[] = [
  { href: "/favorites", label: "Favorites", description: "Return to practices you saved." },
  { href: "/routine", label: "Routine", description: "Review the practices in your routine." },
];

function EntryCard({ entry, headingLevel }: { entry: Entry; headingLevel: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <li>
      <Link
        href={entry.href}
        className={`block h-full rounded-lg border border-slate-300 p-5 hover:border-slate-500 hover:bg-slate-50 ${focusRing}`}
      >
        <Heading className="text-lg font-semibold text-slate-900">{entry.label}</Heading>
        <p className="mt-1 text-slate-700">{entry.description}</p>
      </Link>
    </li>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">YogaFlow</h1>
      <p className="mt-4 max-w-2xl text-base text-slate-700 sm:text-lg">
        Discover yoga, breathwork, and meditation practices in one simple library.
      </p>

      <section aria-labelledby="practice-areas-heading" className="mt-10">
        <h2 id="practice-areas-heading" className="text-xl font-semibold">
          Explore practices
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {PRACTICE_AREAS.map((entry) => (
            <EntryCard key={entry.href} entry={entry} headingLevel="h3" />
          ))}
        </ul>
      </section>

      <section aria-labelledby="saved-heading" className="mt-10">
        <h2 id="saved-heading" className="text-xl font-semibold">
          Your saved practices
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {SAVED.map((entry) => (
            <EntryCard key={entry.href} entry={entry} headingLevel="h3" />
          ))}
        </ul>
      </section>
    </div>
  );
}

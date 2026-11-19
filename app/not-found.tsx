import type { Metadata } from "next";
import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";

export const metadata: Metadata = {
  title: "Page not found | YogaFlow",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mt-4 text-base text-slate-700 sm:text-lg">
        We couldn&rsquo;t find the page you were looking for.
      </p>
      <Link
        href="/"
        className={`mt-6 inline-block rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 ${focusRing}`}
      >
        Go to Home
      </Link>
    </div>
  );
}

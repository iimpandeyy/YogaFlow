"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import Link from "next/link";
import { focusRing } from "@/components/layout/focus-ring";

type ErrorProps = {
  error: unknown;
  retry: () => void;
};

export default function ErrorBoundary({ error, retry }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Something went wrong</h1>
      <p role="alert" className="mt-4 text-base text-slate-700 sm:text-lg">
        This page could not be loaded. Please try again.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className={`rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 ${focusRing}`}
        >
          Try again
        </button>
        <Link
          href="/"
          className={`rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-900 hover:bg-slate-100 ${focusRing}`}
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}

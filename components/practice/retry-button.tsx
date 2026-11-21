"use client";

import { useRouter } from "next/navigation";
import { focusRing } from "@/components/layout/focus-ring";

/** "Try again" for a server-rendered failure state: re-requests the current route's data. */
export function RetryButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={`rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 ${focusRing}`}
    >
      Try again
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { focusRing } from "@/components/layout/focus-ring";

type RetryButtonProps = {
  /** Visible button text. Defaults to "Try again". */
  label?: string;
};

/**
 * Asks the server to render the current route again (for example after a failed content read).
 * Dynamic routes re-run their data-access calls on refresh.
 */
export function RetryButton({ label = "Try again" }: RetryButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={`rounded-md bg-teal-800 px-4 py-2 font-medium text-white hover:bg-teal-900 ${focusRing}`}
    >
      {label}
    </button>
  );
}

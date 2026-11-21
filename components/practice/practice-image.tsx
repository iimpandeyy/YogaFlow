import Image from "next/image";
import type { Practice } from "@/lib/content";
import { PlaceholderLabel } from "./practice-labels";

type PracticeImageProps = {
  practice: Practice;
  /** `sizes` hint for responsive loading. */
  sizes: string;
  /** Set on the most prominent image of a page (for example the detail header). */
  preload?: boolean;
};

/**
 * The practice's static repository image (ARCHITECTURE: static images are repository assets).
 * Alt text comes from the content record. Placeholder imagery is labelled in visible text
 * (RC-11). `next/image` serves `.svg` sources unoptimized.
 */
export function PracticeImage({ practice, sizes, preload = false }: PracticeImageProps) {
  return (
    <div className="relative overflow-hidden rounded-md bg-slate-100">
      <Image
        src={practice.image.path}
        alt={practice.image.alt}
        width={640}
        height={480}
        sizes={sizes}
        preload={preload}
        className="block h-auto w-full"
      />
      {practice.attribution.isPlaceholder ? (
        <span className="absolute top-2 left-2">
          <PlaceholderLabel />
        </span>
      ) : null}
    </div>
  );
}

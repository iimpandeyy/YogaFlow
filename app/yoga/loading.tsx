import { LoadingState } from "@/components/states/loading-state";

/** Shown while the Yoga Library reads practices (RC-09): never a blank page. */
export default function YogaLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Yoga</h1>
      <div className="mt-8">
        <LoadingState label="Loading Yoga practices" />
      </div>
    </div>
  );
}

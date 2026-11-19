import { WellnessDisclaimerSlot } from "./wellness-disclaimer-slot";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-700 sm:px-6">
        <WellnessDisclaimerSlot />
      </div>
    </footer>
  );
}

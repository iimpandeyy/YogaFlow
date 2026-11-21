import { LoadingState } from "@/components/states/loading-state";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-5xl min-w-0 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Favorites</h1>
      <div className="mt-6">
        <LoadingState label="Loading your Favorites" />
      </div>
    </div>
  );
}

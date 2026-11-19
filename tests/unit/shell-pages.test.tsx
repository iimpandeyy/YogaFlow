import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/app/error";
import NotFound from "@/app/not-found";
import BreathworkPage from "@/app/breathwork/page";
import FavoritesPage from "@/app/favorites/page";
import MeditationPage from "@/app/meditation/page";
import RoutinePage from "@/app/routine/page";
import YogaPage from "@/app/yoga/page";
import { SiteFooter } from "@/components/layout/site-footer";

describe("not-found page", () => {
  it("shows a friendly message and a link back to Home", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
  });
});

describe("error boundary", () => {
  it("shows a generic message and retries on request", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} retry={retry} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    ).toBeInTheDocument();
    // The raw error message is not shown to users.
    expect(screen.queryByText(/boom/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
  });
});

describe("section placeholder pages", () => {
  it.each([
    ["Yoga", YogaPage],
    ["Breathwork", BreathworkPage],
    ["Meditation", MeditationPage],
    ["Favorites", FavoritesPage],
    ["Routine", RoutinePage],
  ] as const)("%s renders its heading and a coming-soon note", (label, Page) => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: label })).toBeInTheDocument();
    expect(screen.getByText("This section is coming soon.")).toBeInTheDocument();
  });
});

describe("site footer", () => {
  it("is a contentinfo landmark with an empty, marked disclaimer slot (#14)", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");
    const slot = footer.querySelector('[data-slot="wellness-disclaimer"]');
    expect(slot).not.toBeNull();
    expect(slot?.textContent).toBe("");
  });
});

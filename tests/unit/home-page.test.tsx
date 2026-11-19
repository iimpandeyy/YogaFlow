import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("Home page", () => {
  it("renders the YogaFlow heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "YogaFlow" })).toBeInTheDocument();
  });

  it("offers entry points to Yoga, Breathwork, and Meditation", () => {
    render(<HomePage />);
    const section = screen.getByRole("region", { name: "Explore practices" });
    for (const [label, href] of [
      ["Yoga", "/yoga"],
      ["Breathwork", "/breathwork"],
      ["Meditation", "/meditation"],
    ]) {
      expect(
        within(section).getByRole("link", { name: new RegExp(`^${label}\\b`) }),
      ).toHaveAttribute("href", href);
    }
  });

  it("offers access to Favorites and Routine", () => {
    render(<HomePage />);
    const section = screen.getByRole("region", { name: "Your saved practices" });
    expect(within(section).getByRole("link", { name: /^Favorites\b/ })).toHaveAttribute(
      "href",
      "/favorites",
    );
    expect(within(section).getByRole("link", { name: /^Routine\b/ })).toHaveAttribute(
      "href",
      "/routine",
    );
  });

  it("has no sign-in, profile, or social entry", () => {
    render(<HomePage />);
    expect(
      screen.queryByRole("link", { name: /sign in|log in|sign up|profile|account|share/i }),
    ).toBeNull();
  });
});

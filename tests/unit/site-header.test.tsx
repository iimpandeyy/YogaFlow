import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SiteHeader } from "@/components/layout/site-header";
import { NAV_ITEMS, isActivePath } from "@/components/layout/nav-items";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

const EXPECTED = [
  ["Home", "/"],
  ["Yoga", "/yoga"],
  ["Breathwork", "/breathwork"],
  ["Meditation", "/meditation"],
  ["Favorites", "/favorites"],
  ["Routine", "/routine"],
] as const;

function primaryNav() {
  return screen.getByRole("navigation", { name: "Primary" });
}

describe("SiteHeader primary navigation", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("renders exactly the six destinations with the exact labels, in order", () => {
    render(<SiteHeader />);
    const links = within(primaryNav()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(EXPECTED.map(([label]) => label));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(EXPECTED.map(([, h]) => h));
  });

  it("keeps the NAV_ITEMS config in sync with the required labels", () => {
    expect(NAV_ITEMS.map((item) => [item.label, item.href])).toEqual(EXPECTED.map((e) => [...e]));
  });

  it("has no sign-in or profile entry", () => {
    render(<SiteHeader />);
    expect(screen.queryByRole("link", { name: /sign in|log in|profile|account/i })).toBeNull();
  });

  it.each(EXPECTED)("marks %s as the current page at %s", (label, href) => {
    navigation.pathname = href;
    render(<SiteHeader />);
    const nav = primaryNav();
    const current = within(nav).getByRole("link", { name: label });
    expect(current).toHaveAttribute("aria-current", "page");
    // Not color alone: the active link is also underlined and bold.
    expect(current.className).toMatch(/\bunderline\b/);
    expect(current.className).toMatch(/\bfont-semibold\b/);
    for (const other of within(nav).getAllByRole("link")) {
      if (other !== current) expect(other).not.toHaveAttribute("aria-current");
    }
  });

  it("marks the section as current on nested pages", () => {
    navigation.pathname = "/yoga/some-practice";
    render(<SiteHeader />);
    expect(within(primaryNav()).getByRole("link", { name: "Yoga" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(primaryNav()).getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("toggles the small-screen menu with aria-expanded and aria-controls", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    const nav = primaryNav();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", nav.id);
    expect(nav.className).toMatch(/(^|\s)hidden(\s|$)/);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(nav.className).not.toMatch(/(^|\s)hidden(\s|$)/);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu with Escape and returns focus to the toggle", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("closes the menu after navigating to another page", () => {
    const { rerender } = render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    navigation.pathname = "/yoga";
    rerender(<SiteHeader />);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu when a link is chosen, even for the current page", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(toggle);
    fireEvent.click(within(primaryNav()).getByRole("link", { name: "Home" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("gives nav links a visible focus style", () => {
    render(<SiteHeader />);
    for (const link of within(primaryNav()).getAllByRole("link")) {
      expect(link.className).toMatch(/focus-visible:outline/);
    }
  });
});

describe("isActivePath", () => {
  it("matches Home only on the root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/yoga", "/")).toBe(false);
  });

  it("does not match a sibling route that shares a prefix", () => {
    expect(isActivePath("/yogalike", "/yoga")).toBe(false);
  });

  it("handles a null pathname", () => {
    expect(isActivePath(null, "/")).toBe(false);
  });
});

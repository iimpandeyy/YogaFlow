import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("placeholder home page", () => {
  it("renders the YogaFlow heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "YogaFlow" })).toBeInTheDocument();
  });
});

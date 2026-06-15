import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

test("home page renders the brand heading", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { level: 1, name: "Lu Gia Jen" }),
  ).toBeDefined();
});

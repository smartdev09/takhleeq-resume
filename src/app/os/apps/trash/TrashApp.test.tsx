/** @jest-environment jsdom */

import "@testing-library/jest-dom";

import { render, screen } from "@testing-library/react";

import TrashApp from "./TrashApp";

describe("TrashApp", () => {
  it("renders empty trash messaging (no placeholder copy)", () => {
    render(
      <TrashApp windowId="w-test" appProps={{}} />,
    );
    expect(screen.getByTestId("trash-app")).toBeInTheDocument();
    expect(screen.getByText("Trash is empty")).toBeInTheDocument();
    expect(
      screen.queryByText(/Phase 3 will replace/i),
    ).not.toBeInTheDocument();
  });
});

/**
 * Smoke test for the placeholder app body. Mostly here to keep the
 * `os/apps/placeholders/` tree above the coverage floor and to verify that
 * the anchor sections render with the correct ids — the TopMenuBar e2e
 * smoke depends on those ids existing for scroll-to-section behavior.
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import PlaceholderApp from "./PlaceholderApp";

describe("<PlaceholderApp>", () => {
  it("renders the windowId in the body", () => {
    render(
      <PlaceholderApp
        windowId="w-123"
        appProps={{} as never}
        label="Docs"
      />,
    );
    expect(screen.getByTestId("placeholder-app")).toHaveAttribute(
      "data-window-id",
      "w-123",
    );
    expect(screen.getByText("w-123")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Docs" })).toBeInTheDocument();
  });

  it("shows the resume id row only when provided", () => {
    const { rerender } = render(
      <PlaceholderApp windowId="w" appProps={{} as never} />,
    );
    expect(screen.queryByText(/Resume id/i)).not.toBeInTheDocument();
    rerender(
      <PlaceholderApp
        windowId="w"
        appProps={{} as never}
        resumeId="resume-7"
      />,
    );
    expect(screen.getByText(/Resume id/i)).toBeInTheDocument();
    expect(screen.getByText("resume-7")).toBeInTheDocument();
  });

  it("renders an anchor section per anchor entry", () => {
    render(
      <PlaceholderApp
        windowId="w"
        appProps={{} as never}
        anchors={[
          { id: "getting-started", label: "Getting Started" },
          { id: "ai-setup", label: "AI Setup" },
        ]}
      />,
    );
    expect(
      screen.getByTestId("placeholder-anchor-getting-started"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("placeholder-anchor-ai-setup"),
    ).toBeInTheDocument();
    expect(
      document.getElementById("getting-started"),
    ).toBeInTheDocument();
    expect(document.getElementById("ai-setup")).toBeInTheDocument();
  });
});

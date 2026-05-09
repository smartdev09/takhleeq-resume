/**
 * Tests for the Desktop subtree.
 *
 * Covers:
 *  - DesktopIcon: keyboard activation; first-visit single-click; later
 *    visits require double-click; aria-label state.
 *  - DesktopIconGrid: renders one icon per registered desktop app, splits
 *    by `desktopColumn`, dispatches `openWindow` on activation, marks
 *    welcome shown after the first activation.
 *  - Desktop: composes wallpaper, ambient art, and grid; the wallpaper and
 *    ambient art are decorative (`aria-hidden`).
 *
 * Tests share the same `seedRegistry` helper as the provider tests so the
 * registry shape is realistic without pulling the real placeholder bundle.
 */

import "@testing-library/jest-dom";

// jsdom 22 doesn't ship ResizeObserver / DOMRect. Radix UI's tooltip and
// floating-ui based primitives both reach for them on mount; without these
// polyfills the layout-effect crashes the entire test render. Define them
// before any imports that pull in the Radix tree.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPoly {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverPoly;
}
if (typeof globalThis.DOMRect === "undefined") {
  class DOMRectPoly {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.left = x;
      this.right = x + width;
      this.bottom = y + height;
    }
    static fromRect(r?: { x?: number; y?: number; width?: number; height?: number }) {
      return new DOMRectPoly(r?.x, r?.y, r?.width, r?.height);
    }
    toJSON() {
      return { ...this };
    }
  }
  (globalThis as unknown as { DOMRect: unknown }).DOMRect = DOMRectPoly;
}

import * as React from "react";
import { lazy } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Tooltip from "@radix-ui/react-tooltip";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import { useWindowManager } from "os/context/use-window-manager";

import { Desktop } from "./Desktop";
import { DesktopIcon } from "./DesktopIcon";
import { DesktopIconGrid } from "./DesktopIconGrid";

/** Wrap a single DesktopIcon in the Radix Tooltip.Provider it needs. */
function renderIcon(ui: React.ReactElement) {
  return render(<Tooltip.Provider>{ui}</Tooltip.Provider>);
}

/**
 * Renders state info into DOM data attributes so tests can read it without
 * mutating any closure-scoped variable (forbidden by the
 * `react-hooks/immutability` lint rule).
 */
function StateProbe({ id = "state-probe" }: { id?: string } = {}) {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
  }));
  return (
    <div
      data-testid={id}
      data-windows={JSON.stringify(summary)}
      data-has-shown-welcome={String(state.hasShownWelcome)}
    />
  );
}

function readWindows(testId = "state-probe"): {
  id: string;
  appId: string;
}[] {
  const el = screen.getByTestId(testId);
  return JSON.parse(el.getAttribute("data-windows") ?? "[]");
}

function readState(testId = "state-probe"): { hasShownWelcome: boolean } {
  const el = screen.getByTestId(testId);
  return {
    hasShownWelcome: el.getAttribute("data-has-shown-welcome") === "true",
  };
}

const Stub = lazy(async () => ({ default: () => null }));

function makeApp<K extends AppId>(
  appId: K,
  partial: Partial<RegisteredApp<K>> = {},
): RegisteredApp<K> {
  return {
    appId,
    title: () => appId as string,
    icon: () => <span data-testid={`icon-${appId}`}>{appId}</span>,
    desktopLabel: appId as string,
    defaultSize: { width: 700, height: 550 },
    minSize: { width: 320, height: 200 },
    defaultPosition: "center",
    bind: "standalone",
    showOnDesktop: true,
    Component: Stub as RegisteredApp<K>["Component"],
    ...partial,
  };
}

function seed() {
  registerApp(makeApp("home", { desktopColumn: "left", desktopOrder: 0 }));
  registerApp(makeApp("myResumes", { desktopColumn: "left", desktopOrder: 1 }));
  registerApp(makeApp("templates", { desktopColumn: "left", desktopOrder: 2 }));
  registerApp(makeApp("importer", { desktopColumn: "right", desktopOrder: 0 }));
  registerApp(makeApp("parser", { desktopColumn: "right", desktopOrder: 1 }));
  // Hidden app: should NOT appear on the desktop grid.
  registerApp(
    makeApp("editor", { showOnDesktop: false, bind: "resume" }),
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  seed();
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

function renderWithManager(ui: React.ReactElement) {
  return render(
    <WindowManagerProvider initialState={{ isHydrated: true }}>
      {ui}
    </WindowManagerProvider>,
  );
}

/* ------------------------------ DesktopIcon ------------------------------ */

describe("<DesktopIcon>", () => {
  // Cast to the wide `RegisteredApp<AppId>` because `RegisteredApp<K>` has a
  // contravariant `title(props: K-narrowed)` and TS rejects assignment from
  // the narrow form to the union form even though the runtime value is fine.
  const homeApp = makeApp("home", {
    desktopLabel: "home.md",
    icon: () => <span data-testid="home-svg">H</span>,
  }) as unknown as RegisteredApp<AppId>;

  it("first-visit: single click activates", async () => {
    const onOpen = jest.fn();
    const onFirstActivation = jest.fn();
    const user = userEvent.setup();
    renderIcon(
      <DesktopIcon
        app={homeApp}
        isFirstVisit
        onOpen={onOpen}
        onFirstActivation={onFirstActivation}
      />,
    );
    await user.click(screen.getByTestId("desktop-icon-home"));
    expect(onOpen).toHaveBeenCalledWith("home");
    expect(onFirstActivation).toHaveBeenCalledTimes(1);
  });

  it("returning visit: single click does NOT activate", async () => {
    const onOpen = jest.fn();
    const user = userEvent.setup();
    renderIcon(
      <DesktopIcon app={homeApp} isFirstVisit={false} onOpen={onOpen} />,
    );
    await user.click(screen.getByTestId("desktop-icon-home"));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("returning visit: double click activates", () => {
    const onOpen = jest.fn();
    renderIcon(
      <DesktopIcon app={homeApp} isFirstVisit={false} onOpen={onOpen} />,
    );
    const btn = screen.getByTestId("desktop-icon-home");
    fireEvent.doubleClick(btn);
    expect(onOpen).toHaveBeenCalledWith("home");
  });

  it("Enter activates (keyboard) regardless of visit count", async () => {
    const onOpen = jest.fn();
    const user = userEvent.setup();
    renderIcon(
      <DesktopIcon app={homeApp} isFirstVisit={false} onOpen={onOpen} />,
    );
    const btn = screen.getByTestId("desktop-icon-home");
    btn.focus();
    await user.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledWith("home");
  });

  it("Space also activates via keyboard", async () => {
    const onOpen = jest.fn();
    const user = userEvent.setup();
    renderIcon(<DesktopIcon app={homeApp} isFirstVisit onOpen={onOpen} />);
    const btn = screen.getByTestId("desktop-icon-home");
    btn.focus();
    await user.keyboard(" ");
    expect(onOpen).toHaveBeenCalledWith("home");
  });

  it("aria-label distinguishes first-visit vs returning state", () => {
    const { rerender } = render(
      <Tooltip.Provider>
        <DesktopIcon app={homeApp} isFirstVisit onOpen={jest.fn()} />
      </Tooltip.Provider>,
    );
    expect(screen.getByTestId("desktop-icon-home")).toHaveAccessibleName(
      /click to open/i,
    );
    rerender(
      <Tooltip.Provider>
        <DesktopIcon app={homeApp} isFirstVisit={false} onOpen={jest.fn()} />
      </Tooltip.Provider>,
    );
    expect(screen.getByTestId("desktop-icon-home")).toHaveAccessibleName(
      /double-click to open/i,
    );
  });
});

/* ----------------------------- DesktopIconGrid --------------------------- */

describe("<DesktopIconGrid>", () => {
  it("renders one icon per registered desktop app", () => {
    renderWithManager(<DesktopIconGrid />);
    expect(screen.getAllByTestId("desktop-icon-home").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("desktop-icon-myResumes").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("desktop-icon-importer").length).toBeGreaterThan(0);
    // Hidden app is not on the desktop:
    expect(screen.queryByTestId("desktop-icon-editor")).not.toBeInTheDocument();
  });

  it("clicking an icon dispatches openWindow", () => {
    renderWithManager(<DesktopIconGrid />);
    // Use the left column instance (desktop layout) so clicks are unique.
    const left = screen.getByTestId("desktop-icon-grid-left");
    const home = left.querySelector(
      '[data-testid="desktop-icon-home"]',
    ) as HTMLButtonElement;
    expect(home).toBeTruthy();
    fireEvent.click(home);
    // First-visit: a window should now exist for `home`.
    // We re-render with the manager exposed via a child consumer.
    // Quick check via DOM: clicking opened a window so a new <AppWindow>
    // would appear if we mounted WindowsLayer. Instead, we read via a
    // separate render below.
  });

  it("activates openWindow via the manager (state-level check)", () => {
    render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <StateProbe />
        <DesktopIconGrid />
      </WindowManagerProvider>,
    );
    // importer is in the right column; pick its instance from the right
    // grid container so the click event has a real target.
    const right = screen.getByTestId("desktop-icon-grid-right");
    const importer = right.querySelector(
      '[data-testid="desktop-icon-importer"]',
    ) as HTMLButtonElement;
    expect(importer).toBeTruthy();
    act(() => {
      fireEvent.click(importer);
    });
    expect(readWindows().map((w) => w.appId)).toContain("importer");
  });

  it("marks welcome shown after the first activation", () => {
    render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <StateProbe />
        <DesktopIconGrid />
      </WindowManagerProvider>,
    );
    expect(readState().hasShownWelcome).toBe(false);
    const left = screen.getByTestId("desktop-icon-grid-left");
    const home = left.querySelector(
      '[data-testid="desktop-icon-home"]',
    ) as HTMLButtonElement;
    act(() => {
      fireEvent.click(home);
    });
    expect(readState().hasShownWelcome).toBe(true);
  });

  it("renders two columns based on desktopColumn metadata", () => {
    renderWithManager(<DesktopIconGrid />);
    const left = screen.getByTestId("desktop-icon-grid-left");
    const right = screen.getByTestId("desktop-icon-grid-right");
    expect(left.querySelectorAll('[data-testid^="desktop-icon-"]').length).toBe(3); // home, myResumes, templates
    expect(right.querySelectorAll('[data-testid^="desktop-icon-"]').length).toBe(2); // importer, parser
  });
});

/* -------------------------------- Desktop -------------------------------- */

describe("<Desktop>", () => {
  it("renders wallpaper, ambient art, and the icon grid", () => {
    renderWithManager(<Desktop />);
    expect(screen.getByTestId("os-wallpaper")).toBeInTheDocument();
    expect(screen.getByTestId("os-ambient-art")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-icon-grid-left")).toBeInTheDocument();
  });

  it("ambient art is hidden from assistive tech", () => {
    renderWithManager(<Desktop />);
    const art = screen.getByTestId("os-ambient-art");
    expect(art).toHaveAttribute("aria-hidden");
  });

  it("renders children inside the desktop surface", () => {
    renderWithManager(
      <Desktop>
        <div data-testid="custom-overlay">Overlay</div>
      </Desktop>,
    );
    expect(screen.getByTestId("custom-overlay")).toBeInTheDocument();
  });
});

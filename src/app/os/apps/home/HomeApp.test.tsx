/**
 * Tests for the `home.md` app body.
 *
 * Coverage:
 *  - All four scroll-anchor sections are rendered (`#hero`, `#features`,
 *    `#steps`, `#faq`).
 *  - `appProps.initialAnchor` triggers a scroll on mount.
 *  - Subsequent `setScrollAnchor` updates trigger a scroll on the matching
 *    section (verifies the manager-state forwarding path).
 *  - The four navigation actions (Star → auth, Start Building → myResumes,
 *    See Templates → templates, resume parser → parser) call `openWindow`
 *    with the right appId.
 *
 * The tests do not import the app's `index.ts` because that registers the
 * app via lazy import, which would interfere with the registry seeding done
 * here. We register a stub for `home` and the four target apps directly.
 */

import "@testing-library/jest-dom";

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPoly {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverPoly;
}

// jsdom does not implement Element.scrollIntoView. Polyfill before any
// component renders so HomeApp's scroll-effect path is exercised end-to-end.
const scrollIntoViewSpy = jest.fn();
if (typeof Element !== "undefined") {
  (Element.prototype as unknown as { scrollIntoView: jest.Mock }).scrollIntoView =
    scrollIntoViewSpy;
}

import * as React from "react";
import { lazy } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import { useWindowManager } from "os/context/use-window-manager";
import type {
  WindowManagerState,
  WindowState,
} from "os/context/window-types";

import HomeApp from "./HomeApp";

const Stub = lazy(async () => ({ default: () => null }));

function makeApp<K extends AppId>(
  appId: K,
  partial: Partial<RegisteredApp<K>> = {},
): RegisteredApp<K> {
  return {
    appId,
    title: () => appId as string,
    icon: () => null,
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

function makeHomeWindowState({
  initialAnchor,
  scrollAnchor,
}: {
  initialAnchor?: string;
  scrollAnchor?: string;
} = {}): WindowState {
  return {
    id: "w-home",
    appId: "home",
    appProps: { initialAnchor },
    position: { x: 0, y: 0 },
    size: { width: 900, height: 600 },
    minSize: { width: 480, height: 380 },
    zIndex: 1,
    status: "open",
    scrollAnchor,
    isModal: false,
    openedAt: 0,
    title: "home.md",
  };
}

/* Reads state.windows out of the manager into a DOM data-attr so tests can
 * make assertions without breaking the no-mutate-closure rule. */
function StateProbe({ id = "state-probe" }: { id?: string } = {}) {
  const { state, dispatch } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
  }));
  return (
    <div
      data-testid={id}
      data-windows={JSON.stringify(summary)}
      data-window-count={String(Object.keys(state.windows).length)}
    >
      {/* Lets a test toggle the home window's scrollAnchor without coupling
       * to any chrome component. */}
      <button
        data-testid="set-anchor-features"
        onClick={() =>
          dispatch({
            type: "SET_SCROLL_ANCHOR",
            id: "w-home",
            anchor: "features",
          })
        }
      >
        anchor:features
      </button>
      <button
        data-testid="set-anchor-faq"
        onClick={() =>
          dispatch({ type: "SET_SCROLL_ANCHOR", id: "w-home", anchor: "faq" })
        }
      >
        anchor:faq
      </button>
    </div>
  );
}

function readWindowAppIds(testId = "state-probe"): string[] {
  const el = screen.getByTestId(testId);
  return (
    JSON.parse(el.getAttribute("data-windows") ?? "[]") as Array<{
      id: string;
      appId: string;
    }>
  ).map((w) => w.appId);
}

function seedRegistry() {
  registerApp(makeApp("home"));
  registerApp(makeApp("myResumes"));
  registerApp(makeApp("templates"));
  registerApp(makeApp("parser"));
  registerApp(
    makeApp("auth", { isModal: false, defaultSize: { width: 480, height: 420 } }),
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  seedRegistry();
  scrollIntoViewSpy.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

function renderHome({
  initialAnchor,
  scrollAnchor,
}: { initialAnchor?: string; scrollAnchor?: string } = {}) {
  const home = makeHomeWindowState({ initialAnchor, scrollAnchor });
  const state: Partial<WindowManagerState> = {
    windows: { [home.id]: home },
    zOrder: [home.id],
    isHydrated: true,
  };
  return render(
    <WindowManagerProvider
      initialState={state}
      disablePersistence
      router={null}
    >
      <StateProbe />
      <HomeApp
        windowId={home.id}
        appProps={{ initialAnchor }}
      />
    </WindowManagerProvider>,
  );
}

describe("<HomeApp>", () => {
  it("renders the four anchored sections", () => {
    renderHome();
    expect(document.getElementById("hero")).toBeTruthy();
    expect(document.getElementById("features")).toBeTruthy();
    expect(document.getElementById("steps")).toBeTruthy();
    expect(document.getElementById("faq")).toBeTruthy();
  });

  it("renders the marketing CTAs", () => {
    renderHome();
    expect(
      screen.getByRole("button", { name: /start building/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /see templates/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resume parser/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /star on github/i }),
    ).toBeInTheDocument();
  });

  it("Start Building opens the My Resumes window", () => {
    renderHome();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /start building/i }));
    });
    expect(readWindowAppIds()).toContain("myResumes");
  });

  it("See Templates opens the Templates window", () => {
    renderHome();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /see templates/i }));
    });
    expect(readWindowAppIds()).toContain("templates");
  });

  it("resume parser link opens the Parser window", () => {
    renderHome();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /resume parser/i }));
    });
    expect(readWindowAppIds()).toContain("parser");
  });

  it("star CTA opens the Auth window", () => {
    renderHome();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /star on github/i }));
    });
    expect(readWindowAppIds()).toContain("auth");
  });

  it("appProps.initialAnchor scrolls the matching section into view", () => {
    renderHome({ initialAnchor: "features" });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
    const lastArg = scrollIntoViewSpy.mock.calls.at(-1)?.[0];
    expect(lastArg).toEqual({ behavior: "smooth", block: "start" });
  });

  it("scrollAnchor changes scroll the matching section into view", () => {
    renderHome();
    scrollIntoViewSpy.mockClear();
    act(() => {
      fireEvent.click(screen.getByTestId("set-anchor-features"));
    });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
    const lastArg = scrollIntoViewSpy.mock.calls.at(-1)?.[0];
    expect(lastArg).toEqual({ behavior: "smooth", block: "start" });
  });

  it("supports re-scrolling when the anchor changes between sections", () => {
    renderHome();
    scrollIntoViewSpy.mockClear();
    act(() => {
      fireEvent.click(screen.getByTestId("set-anchor-features"));
    });
    const featuresCalls = scrollIntoViewSpy.mock.calls.length;
    act(() => {
      fireEvent.click(screen.getByTestId("set-anchor-faq"));
    });
    expect(scrollIntoViewSpy.mock.calls.length).toBeGreaterThan(featuresCalls);
  });
});

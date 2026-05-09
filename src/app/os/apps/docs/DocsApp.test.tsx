/**
 * Tests for the Docs app body. Mirrors `HomeApp.test.tsx`'s harness shape:
 *  - Asserts every registered scroll anchor renders.
 *  - Verifies `appProps.initialAnchor` and runtime `setScrollAnchor`
 *    forwarding both produce a smooth scroll into view.
 *  - Confirms the inline buttons open the right partner apps.
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

import DocsApp from "./DocsApp";

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

function makeDocsWindow({
  initialAnchor,
  scrollAnchor,
}: {
  initialAnchor?: string;
  scrollAnchor?: string;
} = {}): WindowState {
  return {
    id: "w-docs",
    appId: "docs",
    appProps: { initialAnchor },
    position: { x: 0, y: 0 },
    size: { width: 900, height: 620 },
    minSize: { width: 480, height: 380 },
    zIndex: 1,
    status: "open",
    scrollAnchor,
    isModal: false,
    openedAt: 0,
    title: "Docs — OpenResume",
  };
}

function StateProbe({ id = "state-probe" }: { id?: string } = {}) {
  const { state, dispatch } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
  }));
  return (
    <div data-testid={id} data-windows={JSON.stringify(summary)}>
      <button
        data-testid="set-anchor-ai-setup"
        onClick={() =>
          dispatch({
            type: "SET_SCROLL_ANCHOR",
            id: "w-docs",
            anchor: "ai-setup",
          })
        }
      >
        anchor:ai-setup
      </button>
      <button
        data-testid="set-anchor-shortcuts"
        onClick={() =>
          dispatch({
            type: "SET_SCROLL_ANCHOR",
            id: "w-docs",
            anchor: "shortcuts",
          })
        }
      >
        anchor:shortcuts
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
  registerApp(makeApp("docs"));
  registerApp(makeApp("help"));
  registerApp(makeApp("aiSetup"));
  registerApp(makeApp("templates"));
  registerApp(makeApp("importer"));
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

function renderDocs({
  initialAnchor,
  scrollAnchor,
}: { initialAnchor?: string; scrollAnchor?: string } = {}) {
  const docs = makeDocsWindow({ initialAnchor, scrollAnchor });
  const state: Partial<WindowManagerState> = {
    windows: { [docs.id]: docs },
    zOrder: [docs.id],
    isHydrated: true,
  };
  return render(
    <WindowManagerProvider
      initialState={state}
      disablePersistence
      router={null}
    >
      <StateProbe />
      <DocsApp windowId={docs.id} appProps={{ initialAnchor }} />
    </WindowManagerProvider>,
  );
}

describe("<DocsApp>", () => {
  it("renders the four anchored sections", () => {
    renderDocs();
    expect(document.getElementById("getting-started")).toBeTruthy();
    expect(document.getElementById("ai-setup")).toBeTruthy();
    expect(document.getElementById("templates-guide")).toBeTruthy();
    expect(document.getElementById("shortcuts")).toBeTruthy();
  });

  it("appProps.initialAnchor scrolls on mount", () => {
    renderDocs({ initialAnchor: "ai-setup" });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
    const lastArg = scrollIntoViewSpy.mock.calls.at(-1)?.[0];
    expect(lastArg).toEqual({ behavior: "smooth", block: "start" });
  });

  it("setScrollAnchor dispatched at runtime triggers a scroll", () => {
    renderDocs();
    scrollIntoViewSpy.mockClear();
    act(() => {
      fireEvent.click(screen.getByTestId("set-anchor-ai-setup"));
    });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
  });

  it("Open AI Setup button opens the aiSetup window", () => {
    renderDocs();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /open ai setup/i }));
    });
    expect(readWindowAppIds()).toContain("aiSetup");
  });

  it("Open Help button opens the help window", () => {
    renderDocs();
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /open help & shortcuts/i }),
      );
    });
    expect(readWindowAppIds()).toContain("help");
  });

  it("Templates inline link opens the templates window", () => {
    renderDocs();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /^templates$/i }));
    });
    expect(readWindowAppIds()).toContain("templates");
  });

  it("Import Resume inline link opens the importer window", () => {
    renderDocs();
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /^import resume$/i }),
      );
    });
    expect(readWindowAppIds()).toContain("importer");
  });
});

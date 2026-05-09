/**
 * Tests for the Help app: every anchor renders, FAQ entries populate, and
 * the scroll-anchor wiring matches Home/Docs.
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

import HelpApp from "./HelpApp";

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

function makeHelpWindow({
  initialAnchor,
  scrollAnchor,
}: {
  initialAnchor?: string;
  scrollAnchor?: string;
} = {}): WindowState {
  return {
    id: "w-help",
    appId: "help",
    appProps: { initialAnchor },
    position: { x: 0, y: 0 },
    size: { width: 720, height: 600 },
    minSize: { width: 420, height: 360 },
    zIndex: 1,
    status: "open",
    scrollAnchor,
    isModal: false,
    openedAt: 0,
    title: "Help & Shortcuts",
  };
}

function StateProbe() {
  const { dispatch } = useWindowManager();
  return (
    <div data-testid="state-probe">
      <button
        data-testid="set-anchor-faq"
        onClick={() =>
          dispatch({
            type: "SET_SCROLL_ANCHOR",
            id: "w-help",
            anchor: "faq",
          })
        }
      >
        anchor:faq
      </button>
    </div>
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("help"));
  scrollIntoViewSpy.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

function renderHelp({
  initialAnchor,
  scrollAnchor,
}: { initialAnchor?: string; scrollAnchor?: string } = {}) {
  const help = makeHelpWindow({ initialAnchor, scrollAnchor });
  const state: Partial<WindowManagerState> = {
    windows: { [help.id]: help },
    zOrder: [help.id],
    isHydrated: true,
  };
  return render(
    <WindowManagerProvider
      initialState={state}
      disablePersistence
      router={null}
    >
      <StateProbe />
      <HelpApp windowId={help.id} appProps={{ initialAnchor }} />
    </WindowManagerProvider>,
  );
}

describe("<HelpApp>", () => {
  it("renders both anchored sections", () => {
    renderHelp();
    expect(document.getElementById("shortcuts")).toBeTruthy();
    expect(document.getElementById("faq")).toBeTruthy();
  });

  it("renders the canonical shortcut list", () => {
    renderHelp();
    expect(
      screen.getByText(/open the search palette/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/close the focused window/i)).toBeInTheDocument();
    expect(
      screen.getByText(/snap focused window to the left half/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/cycle through open windows/i)).toBeInTheDocument();
    expect(screen.getByText(/show this help window/i)).toBeInTheDocument();
    expect(screen.getByText(/toggle boring mode/i)).toBeInTheDocument();
  });

  it("renders FAQ entries", () => {
    renderHelp();
    expect(
      screen.getByText(/styled like a desktop os/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does this work on mobile/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/where does my data live/i),
    ).toBeInTheDocument();
  });

  it("appProps.initialAnchor scrolls on mount", () => {
    renderHelp({ initialAnchor: "faq" });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
  });

  it("setScrollAnchor dispatched at runtime triggers a scroll", () => {
    renderHelp();
    scrollIntoViewSpy.mockClear();
    act(() => {
      fireEvent.click(screen.getByTestId("set-anchor-faq"));
    });
    expect(scrollIntoViewSpy).toHaveBeenCalled();
    const lastArg = scrollIntoViewSpy.mock.calls.at(-1)?.[0];
    expect(lastArg).toEqual({ behavior: "smooth", block: "start" });
  });

  it("does not throw when a non-existent anchor is set", () => {
    renderHelp({ initialAnchor: "non-existent-anchor" });
    // No scrollIntoView for missing anchor, but no exception either.
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});

/**
 * WindowsLayer tests.
 *
 * Verifies:
 *  - One <AppWindow> per state.windows entry, ordered by zOrder.
 *  - The placeholder app component mounts inside each window (via Suspense).
 *  - isFocused is true only for the topmost window in zOrder.
 *  - When a modal window exists, all non-modal siblings receive `inert`.
 *  - Drag/move/close callbacks dispatch into the reducer.
 */

import "@testing-library/jest-dom";
import * as React from "react";
import { lazy } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

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

import { WindowsLayer } from "./WindowsLayer";

// Polyfill PointerEvent for jsdom (AppWindow uses it).
if (
  typeof window !== "undefined" &&
  typeof window.PointerEvent === "undefined"
) {
  class PolyPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  // @ts-expect-error attach polyfill to window/global
  window.PointerEvent = PolyPointerEvent;
  // @ts-expect-error attach polyfill to window/global
  globalThis.PointerEvent = PolyPointerEvent;
}
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
}

/* ---------- helpers ---------- */

const Stub = lazy(async () => ({
  default: () => <div data-testid="stub-body">stub-body</div>,
}));

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
    showOnDesktop: false,
    Component: Stub as RegisteredApp<K>["Component"],
    ...partial,
  };
}

function makeWindow(overrides: Partial<WindowState> = {}): WindowState {
  return {
    id: overrides.id ?? "w1",
    appId: overrides.appId ?? "home",
    appProps: overrides.appProps ?? {},
    resumeId: overrides.resumeId,
    parentId: overrides.parentId,
    poppedOutFromTab: overrides.poppedOutFromTab,
    position: overrides.position ?? { x: 100, y: 100 },
    size: overrides.size ?? { width: 600, height: 400 },
    minSize: overrides.minSize ?? { width: 320, height: 240 },
    zIndex: overrides.zIndex ?? 1,
    status: overrides.status ?? "open",
    preStatusGeometry: overrides.preStatusGeometry,
    scrollAnchor: overrides.scrollAnchor,
    isModal: overrides.isModal ?? false,
    openedAt: overrides.openedAt ?? 1000,
    title: overrides.title ?? "Window",
  };
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("home"));
  registerApp(makeApp("auth", { isModal: true }));
});

afterEach(() => {
  __resetRegistryForTests();
});

/**
 * Renders state info into DOM data attributes so tests can read it without
 * mutating any closure-scoped variable (forbidden by `react-hooks/immutability`).
 */
function StateProbe({ id = "state-probe" }: { id?: string } = {}) {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
    status: w.status,
  }));
  return (
    <div
      data-testid={id}
      data-windows={JSON.stringify(summary)}
      data-zorder={JSON.stringify(state.zOrder)}
    />
  );
}

function readWindowIds(testId = "state-probe"): string[] {
  const el = screen.getByTestId(testId);
  return JSON.parse(el.getAttribute("data-windows") ?? "[]").map(
    (w: { id: string }) => w.id,
  );
}

function readZOrder(testId = "state-probe"): string[] {
  const el = screen.getByTestId(testId);
  return JSON.parse(el.getAttribute("data-zorder") ?? "[]");
}

function renderLayer(initial?: Partial<WindowManagerState>) {
  return render(
    <WindowManagerProvider initialState={{ isHydrated: true, ...initial }}>
      <StateProbe />
      <WindowsLayer />
    </WindowManagerProvider>,
  );
}

/* =============================== tests =============================== */

describe("<WindowsLayer>", () => {
  it("renders nothing meaningful when there are no windows", () => {
    renderLayer();
    expect(screen.queryByTestId("app-window")).not.toBeInTheDocument();
    expect(screen.getByTestId("os-windows-layer")).toBeInTheDocument();
  });

  it("renders one AppWindow per zOrder entry, in order", async () => {
    renderLayer({
      windows: {
        a: makeWindow({ id: "a", title: "First" }),
        b: makeWindow({ id: "b", title: "Second" }),
      },
      zOrder: ["a", "b"],
    });
    const windows = screen.getAllByTestId("app-window");
    expect(windows).toHaveLength(2);
    expect(windows[0].getAttribute("data-window-id")).toBe("a");
    expect(windows[1].getAttribute("data-window-id")).toBe("b");
  });

  it("marks the topmost zOrder window as focused", () => {
    renderLayer({
      windows: {
        a: makeWindow({ id: "a" }),
        b: makeWindow({ id: "b" }),
      },
      zOrder: ["a", "b"],
    });
    const windows = screen.getAllByTestId("app-window");
    expect(windows[0].getAttribute("data-focused")).toBe("false");
    expect(windows[1].getAttribute("data-focused")).toBe("true");
  });

  it("inerts non-modal siblings when a modal is open", () => {
    renderLayer({
      windows: {
        a: makeWindow({ id: "a", appId: "home" }),
        m: makeWindow({ id: "m", appId: "auth", isModal: true }),
      },
      zOrder: ["a", "m"],
    });
    const a = screen
      .getAllByTestId("app-window")
      .find((n) => n.getAttribute("data-window-id") === "a")!;
    const m = screen
      .getAllByTestId("app-window")
      .find((n) => n.getAttribute("data-window-id") === "m")!;
    expect(a).toHaveAttribute("inert");
    expect(m).not.toHaveAttribute("inert");
  });

  it("renders the registered Component inside each window body (via Suspense)", async () => {
    renderLayer({
      windows: { a: makeWindow({ id: "a" }) },
      zOrder: ["a"],
    });
    // Suspense fallback may flash; await the resolved body.
    const body = await screen.findByTestId("stub-body");
    expect(body).toBeInTheDocument();
  });

  it("renders a missing-app notice when no Component is registered", () => {
    __resetRegistryForTests(); // wipe so the lookup misses
    renderLayer({
      windows: { a: makeWindow({ id: "a", appId: "home" }) },
      zOrder: ["a"],
    });
    expect(screen.getByTestId("window-missing-app")).toBeInTheDocument();
  });

  it("close button in the title bar dispatches CLOSE_WINDOW", () => {
    renderLayer({
      windows: { a: makeWindow({ id: "a" }) },
      zOrder: ["a"],
    });
    expect(readWindowIds()).toContain("a");
    const win = screen.getByTestId("app-window");
    const closeBtn = within(win).getByRole("button", { name: "Close" });
    act(() => {
      fireEvent.click(closeBtn);
    });
    expect(readWindowIds()).not.toContain("a");
  });

  it("clicking a non-focused window dispatches BRING_TO_FRONT", () => {
    renderLayer({
      windows: {
        a: makeWindow({ id: "a" }),
        b: makeWindow({ id: "b" }),
      },
      zOrder: ["a", "b"],
    });
    expect(readZOrder().at(-1)).toBe("b");
    const a = screen
      .getAllByTestId("app-window")
      .find((n) => n.getAttribute("data-window-id") === "a")!;
    act(() => {
      fireEvent.pointerDown(a);
    });
    expect(readZOrder().at(-1)).toBe("a");
  });

  it("hides minimized windows entirely (their AppWindow returns null)", () => {
    renderLayer({
      windows: {
        a: makeWindow({ id: "a", status: "minimized" }),
        b: makeWindow({ id: "b" }),
      },
      zOrder: ["b"], // minimized excluded from zOrder by reducer convention
    });
    const windows = screen.getAllByTestId("app-window");
    expect(windows).toHaveLength(1);
    expect(windows[0].getAttribute("data-window-id")).toBe("b");
  });
});

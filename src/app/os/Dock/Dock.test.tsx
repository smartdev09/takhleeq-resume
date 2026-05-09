/**
 * Dock + WindowChip + ActiveResumeIndicator tests.
 *
 * The Dock is mostly state-driven so most assertions are about the right
 * chips appearing for the right windows; right-click context-menu items are
 * verified via Radix's `data-testid` slots.
 *
 * `lib/storage/resume-store` is mocked at the import level so the
 * ActiveResumeIndicator's IndexedDB calls return a deterministic list.
 */

import "@testing-library/jest-dom";
import * as React from "react";
import { lazy } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
// Radix's context-menu uses Floating UI which calls getBoundingClientRect
// returning a DOMRect; jsdom doesn't provide the constructor so the
// `instanceof DOMRect` check inside Floating UI throws. Polyfill the bare
// minimum interface — just an object with the right field shape.
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

import { ActiveResumeIndicator } from "./ActiveResumeIndicator";
import { Dock } from "./Dock";
import { WindowChip, resumeStripeColor } from "./WindowChip";

const Stub = lazy(async () => ({ default: () => null }));

function makeApp<K extends AppId>(
  appId: K,
  partial: Partial<RegisteredApp<K>> = {},
): RegisteredApp<K> {
  return {
    appId,
    title: () => appId as string,
    icon: () => <span data-testid={`chip-icon-${appId}`}>{appId}</span>,
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

function seed() {
  registerApp(makeApp("home"));
  registerApp(makeApp("editor", { bind: "resume" }));
  registerApp(makeApp("analyzer", { bind: "resume" }));
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
    size: overrides.size ?? { width: 700, height: 550 },
    minSize: overrides.minSize ?? { width: 320, height: 200 },
    zIndex: overrides.zIndex ?? 1,
    status: overrides.status ?? "open",
    preStatusGeometry: overrides.preStatusGeometry,
    scrollAnchor: overrides.scrollAnchor,
    isModal: overrides.isModal ?? false,
    openedAt: overrides.openedAt ?? 1000,
    title: overrides.title ?? "Window",
  };
}

/* ---------- mocks ---------- */

jest.mock("lib/storage/resume-store", () => ({
  listResumes: jest.fn(),
}));

const mockedListResumes = jest.requireMock("lib/storage/resume-store")
  .listResumes as jest.Mock;

beforeEach(() => {
  __resetRegistryForTests();
  seed();
  mockedListResumes.mockResolvedValue([]);
});

afterEach(() => {
  __resetRegistryForTests();
  jest.clearAllMocks();
});

/**
 * `StateProbe` exposes a snapshot of the window-manager state via DOM data
 * attributes so tests can assert without mutating any closure-scoped variable
 * (which the `react-hooks/immutability` lint rule forbids).
 */
function StateProbe({ id = "state-probe" }: { id?: string } = {}) {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
    resumeId: w.resumeId,
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

function readWindows(testId = "state-probe"): {
  id: string;
  appId: string;
  resumeId?: string;
  status: string;
}[] {
  const el = screen.getByTestId(testId);
  return JSON.parse(el.getAttribute("data-windows") ?? "[]");
}

function readZOrder(testId = "state-probe"): string[] {
  const el = screen.getByTestId(testId);
  return JSON.parse(el.getAttribute("data-zorder") ?? "[]");
}

function renderDock(initial?: Partial<WindowManagerState>) {
  return render(
    <WindowManagerProvider initialState={{ isHydrated: true, ...initial }}>
      <StateProbe />
      <Dock />
    </WindowManagerProvider>,
  );
}

/* =========================== resumeStripeColor =========================== */

describe("resumeStripeColor", () => {
  it("returns null without a resumeId", () => {
    expect(resumeStripeColor(undefined)).toBeNull();
  });
  it("returns a stable hsl(...) for the same id", () => {
    const c1 = resumeStripeColor("abc-123");
    const c2 = resumeStripeColor("abc-123");
    expect(c1).toBe(c2);
    expect(c1).toMatch(/^hsl\(\d+ 60% 55%\)$/);
  });
  it("returns different colors for different ids (with high probability)", () => {
    expect(resumeStripeColor("a")).not.toBe(resumeStripeColor("zzz-xyz-789"));
  });
});

/* ============================== WindowChip ============================== */

describe("<WindowChip>", () => {
  // Cast to the wide `RegisteredApp<AppId>` because `RegisteredApp<K>` has a
  // contravariant `title(props: K-narrowed)` and TS rejects assignment from
  // the narrow form to the union form even though the runtime value is fine.
  const app = makeApp("editor", {
    icon: () => <span data-testid="chip-svg">E</span>,
  }) as unknown as RegisteredApp<AppId>;

  it("renders the title and an icon", () => {
    render(
      <WindowChip
        window={makeWindow({ id: "w1", appId: "editor", title: "Resume Editor" })}
        app={app}
        isFocused
        onFocus={jest.fn()}
        onClose={jest.fn()}
        onMinimize={jest.fn()}
        onRestore={jest.fn()}
      />,
    );
    expect(screen.getByText("Resume Editor")).toBeInTheDocument();
    expect(screen.getByTestId("chip-svg")).toBeInTheDocument();
  });

  it("clicking calls onFocus", () => {
    const onFocus = jest.fn();
    render(
      <WindowChip
        window={makeWindow({ id: "w1" })}
        app={app}
        isFocused={false}
        onFocus={onFocus}
        onClose={jest.fn()}
        onMinimize={jest.fn()}
        onRestore={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("dock-chip-w1"));
    expect(onFocus).toHaveBeenCalledWith("w1");
  });

  it("clicking a minimized chip calls onRestore + onFocus", () => {
    const onFocus = jest.fn();
    const onRestore = jest.fn();
    render(
      <WindowChip
        window={makeWindow({ id: "w1", status: "minimized" })}
        app={app}
        isFocused={false}
        onFocus={onFocus}
        onClose={jest.fn()}
        onMinimize={jest.fn()}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByTestId("dock-chip-w1"));
    expect(onRestore).toHaveBeenCalledWith("w1");
    expect(onFocus).toHaveBeenCalledWith("w1");
  });

  it("right-click context menu fires close / minimize", async () => {
    const onClose = jest.fn();
    const onMinimize = jest.fn();
    render(
      <WindowChip
        window={makeWindow({ id: "w1" })}
        app={app}
        isFocused
        onFocus={jest.fn()}
        onClose={onClose}
        onMinimize={onMinimize}
        onRestore={jest.fn()}
      />,
    );
    fireEvent.contextMenu(screen.getByTestId("dock-chip-w1"));
    const minimize = await screen.findByTestId("dock-chip-w1-minimize");
    fireEvent.click(minimize);
    expect(onMinimize).toHaveBeenCalledWith("w1");
    fireEvent.contextMenu(screen.getByTestId("dock-chip-w1"));
    const close = await screen.findByTestId("dock-chip-w1-close");
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledWith("w1");
  });

  it("renders the resume color stripe when resumeId is present", () => {
    render(
      <WindowChip
        window={makeWindow({ id: "w1", resumeId: "abc-123" })}
        app={app}
        isFocused
        onFocus={jest.fn()}
        onClose={jest.fn()}
        onMinimize={jest.fn()}
        onRestore={jest.fn()}
      />,
    );
    expect(screen.getByTestId("dock-chip-stripe")).toBeInTheDocument();
  });
});

/* ============================ ActiveResumeIndicator ============================ */

describe("<ActiveResumeIndicator>", () => {
  it("shows 'No resume open' when there is no current resume", () => {
    render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <ActiveResumeIndicator />
      </WindowManagerProvider>,
    );
    expect(screen.getByText(/No resume open/i)).toBeInTheDocument();
  });

  it("opening the dropdown loads the resume list", async () => {
    mockedListResumes.mockResolvedValue([
      {
        id: "r1",
        name: "Engineering Resume",
        resume: {} as never,
        settings: {} as never,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <ActiveResumeIndicator />
      </WindowManagerProvider>,
    );
    fireEvent.click(screen.getByTestId("active-resume-button"));
    await waitFor(() => {
      expect(screen.getByText("Engineering Resume")).toBeInTheDocument();
    });
  });

  it("selecting a resume opens the editor window", async () => {
    mockedListResumes.mockResolvedValue([
      {
        id: "r1",
        name: "Engineering Resume",
        resume: {} as never,
        settings: {} as never,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <StateProbe />
        <ActiveResumeIndicator />
      </WindowManagerProvider>,
    );
    fireEvent.click(screen.getByTestId("active-resume-button"));
    await waitFor(() => {
      expect(screen.getByTestId("active-resume-row-r1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("active-resume-row-r1"));
    await waitFor(() => {
      expect(
        readWindows().map((w) => ({
          appId: w.appId,
          resumeId: w.resumeId,
        })),
      ).toContainEqual({ appId: "editor", resumeId: "r1" });
    });
  });
});

/* ================================== Dock ================================== */

describe("<Dock>", () => {
  it("renders the empty state when no windows are open", () => {
    renderDock();
    expect(screen.getByTestId("os-dock-empty")).toBeInTheDocument();
  });

  it("renders one chip per open window in z-order", () => {
    renderDock({
      windows: {
        w1: makeWindow({ id: "w1", appId: "home", title: "home.md" }),
        w2: makeWindow({ id: "w2", appId: "editor", title: "Resume Editor" }),
      },
      zOrder: ["w1", "w2"],
    });
    const chips = screen.getAllByTestId(/^dock-chip-/);
    // Each chip also has stripe + menu items, filter to the buttons.
    const buttons = chips.filter(
      (n) => n.getAttribute("data-testid")?.match(/^dock-chip-w[12]$/),
    );
    expect(buttons).toHaveLength(2);
  });

  it("clicking a chip dispatches focus", () => {
    renderDock({
      windows: {
        w1: makeWindow({ id: "w1", appId: "home" }),
        w2: makeWindow({ id: "w2", appId: "editor" }),
      },
      zOrder: ["w1", "w2"],
    });
    act(() => {
      fireEvent.click(screen.getByTestId("dock-chip-w1"));
    });
    expect(readZOrder().at(-1)).toBe("w1");
  });

  it("right-click → close removes the window from state", async () => {
    renderDock({
      windows: {
        w1: makeWindow({ id: "w1", appId: "home" }),
      },
      zOrder: ["w1"],
    });
    fireEvent.contextMenu(screen.getByTestId("dock-chip-w1"));
    const close = await screen.findByTestId("dock-chip-w1-close");
    act(() => {
      fireEvent.click(close);
    });
    expect(readWindows().find((w) => w.id === "w1")).toBeUndefined();
  });

  it("includes minimized windows at the end of the list", () => {
    renderDock({
      windows: {
        w1: makeWindow({ id: "w1", status: "open" }),
        w2: makeWindow({ id: "w2", status: "minimized" }),
      },
      zOrder: ["w1"], // minimized window not in zOrder
    });
    expect(screen.getByTestId("dock-chip-w2")).toHaveAttribute(
      "data-minimized",
      "true",
    );
  });
});

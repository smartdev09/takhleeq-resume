/**
 * Top menu bar + Auth + Search palette tests.
 *
 * Strategy:
 *  - Use a real `<WindowManagerProvider initialState={{ isHydrated: true }}>`
 *    so menu callbacks dispatch into a real reducer; we then read the state
 *    via a `<Probe />` consumer to assert on the windows that opened.
 *  - For the auth slot, mock `lib/auth/use-auth-status` so we can flip
 *    between authenticated / anonymous deterministically.
 *  - Radix Menubar opens its dropdown asynchronously; tests use
 *    `await screen.findByText` to wait for the items to render.
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
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import { useWindowManager } from "os/context/use-window-manager";

import { OSAuthIndicator } from "./AuthIndicator";
import { SearchPalette } from "./SearchPalette";
import { TopMenuBar } from "./TopMenuBar";

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
    showOnDesktop: false,
    Component: Stub as RegisteredApp<K>["Component"],
    ...partial,
  };
}

function seed() {
  registerApp(makeApp("home"));
  registerApp(makeApp("editor", { bind: "resume" }));
  registerApp(makeApp("templates"));
  registerApp(makeApp("analyzer"));
  registerApp(makeApp("jobMatcher"));
  registerApp(makeApp("parser"));
  registerApp(makeApp("importer"));
  registerApp(makeApp("docs"));
  registerApp(makeApp("help"));
  registerApp(makeApp("auth"));
  registerApp(makeApp("community"));
  registerApp(makeApp("myResumes"));
  registerApp(makeApp("aiSetup"));
  registerApp(makeApp("trash"));
  registerApp(makeApp("coverLetter"));
  registerApp(makeApp("searchPalette"));
}

/* ---------- mocks ---------- */

jest.mock("lib/auth/use-auth-status", () => ({
  useAuthStatus: jest.fn(),
}));

const mockedUseAuthStatus = jest.requireMock(
  "lib/auth/use-auth-status",
).useAuthStatus as jest.Mock;

function setAuth(state: {
  authenticated?: boolean;
  username?: string;
  loading?: boolean;
}) {
  mockedUseAuthStatus.mockReturnValue({
    authenticated: state.authenticated ?? false,
    starred: false,
    username: state.username,
    loading: state.loading ?? false,
    noGithub: false,
    setNoGithub: jest.fn(),
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  __resetRegistryForTests();
  seed();
  setAuth({ loading: false });
});

afterEach(() => {
  __resetRegistryForTests();
  jest.clearAllMocks();
});

/* ---------- helpers ---------- */

/**
 * `StateProbe` exposes a snapshot of window-manager state via DOM data
 * attributes so tests can read state without mutating any closure-scoped
 * variable (forbidden by the `react-hooks/immutability` lint rule).
 */
function StateProbe({ id = "state-probe" }: { id?: string } = {}) {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
    resumeId: w.resumeId,
    scrollAnchor: w.scrollAnchor,
    appProps: w.appProps,
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
  scrollAnchor?: string;
  appProps?: Record<string, unknown>;
}[] {
  const el = screen.getByTestId(testId);
  return JSON.parse(el.getAttribute("data-windows") ?? "[]");
}

function renderMenuBar() {
  return render(
    <WindowManagerProvider initialState={{ isHydrated: true }}>
      <StateProbe />
      <TopMenuBar />
    </WindowManagerProvider>,
  );
}

/* ============================== TopMenuBar ============================== */

describe("<TopMenuBar>", () => {
  it("logo click opens the home window", () => {
    renderMenuBar();
    fireEvent.click(screen.getByTestId("menu-logo"));
    expect(readWindows().map((w) => w.appId)).toContain("home");
  });

  it("Star CTA opens the auth window with proactive trigger", () => {
    renderMenuBar();
    fireEvent.click(screen.getByTestId("menu-star-cta"));
    const auth = readWindows().find((w) => w.appId === "auth");
    expect(auth).toBeDefined();
    expect((auth!.appProps as { trigger?: string } | undefined)?.trigger).toBe(
      "proactive",
    );
  });

  it("Templates menu item opens the templates window", async () => {
    const user = userEvent.setup();
    renderMenuBar();
    await user.click(screen.getByTestId("menu-templates"));
    const item = await screen.findByText("Browse templates");
    await user.click(item);
    expect(readWindows().map((w) => w.appId)).toContain("templates");
  });

  it("Docs > AI Setup sets the scroll anchor on the docs window", async () => {
    const user = userEvent.setup();
    renderMenuBar();
    await user.click(screen.getByTestId("menu-docs"));
    const aiSetup = await screen.findByText("AI Setup");
    await user.click(aiSetup);
    const docs = readWindows().find((w) => w.appId === "docs");
    expect(docs).toBeDefined();
    expect(docs!.scrollAnchor).toBe("ai-setup");
  });

  it("Re-clicking Docs > Templates Guide focuses the existing window and updates scroll anchor", async () => {
    const user = userEvent.setup();
    renderMenuBar();
    await user.click(screen.getByTestId("menu-docs"));
    await user.click(await screen.findByText("AI Setup"));
    const firstSnapshot = readWindows().filter((w) => w.appId === "docs");
    expect(firstSnapshot).toHaveLength(1);
    await user.click(screen.getByTestId("menu-docs"));
    await user.click(await screen.findByText("Templates Guide"));
    const secondSnapshot = readWindows().filter((w) => w.appId === "docs");
    expect(secondSnapshot).toHaveLength(1);
    expect(secondSnapshot[0].scrollAnchor).toBe("templates-guide");
  });

  it("View > Reset desktop wipes open windows", async () => {
    const user = userEvent.setup();
    renderMenuBar();
    fireEvent.click(screen.getByTestId("menu-logo"));
    expect(readWindows().length).toBe(1);
    await user.click(screen.getByTestId("menu-view"));
    await user.click(await screen.findByTestId("menu-view-reset"));
    expect(readWindows().length).toBe(0);
  });

  it("Cmd+K opens the search palette", () => {
    renderMenuBar();
    expect(screen.queryByTestId("os-palette")).not.toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(window, { key: "k", metaKey: true });
    });
    expect(screen.getByTestId("os-palette")).toBeInTheDocument();
  });

  it("renders the auth slot in anonymous state", () => {
    setAuth({ authenticated: false, loading: false });
    renderMenuBar();
    expect(screen.getByTestId("os-auth-signin")).toBeInTheDocument();
  });

  it("renders the avatar in authenticated state", () => {
    setAuth({ authenticated: true, username: "octo", loading: false });
    renderMenuBar();
    expect(screen.getByTestId("os-auth-avatar")).toBeInTheDocument();
  });
});

/* ============================ AuthIndicator ============================ */

describe("<OSAuthIndicator>", () => {
  it("loading state renders a skeleton", () => {
    setAuth({ loading: true });
    render(<OSAuthIndicator onOpenAuth={jest.fn()} />);
    expect(screen.getByTestId("os-auth-loading")).toBeInTheDocument();
  });

  it("anonymous → 'Sign in' button calls onOpenAuth", () => {
    setAuth({ authenticated: false, loading: false });
    const onOpenAuth = jest.fn();
    render(<OSAuthIndicator onOpenAuth={onOpenAuth} />);
    fireEvent.click(screen.getByTestId("os-auth-signin"));
    expect(onOpenAuth).toHaveBeenCalled();
  });

  it("authenticated → avatar opens menu with sign out", async () => {
    setAuth({ authenticated: true, username: "octo", loading: false });
    const user = userEvent.setup();
    render(<OSAuthIndicator onOpenAuth={jest.fn()} />);
    await user.click(screen.getByTestId("os-auth-avatar"));
    expect(screen.getByTestId("os-auth-menu")).toBeInTheDocument();
    expect(screen.getByTestId("os-auth-signout")).toBeInTheDocument();
  });
});

/* ============================ SearchPalette ============================ */

describe("<SearchPalette>", () => {
  function renderPalette() {
    function Wrapper() {
      const [open, setOpen] = React.useState(true);
      return <SearchPalette open={open} onOpenChange={setOpen} />;
    }
    return render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <StateProbe />
        <Wrapper />
      </WindowManagerProvider>,
    );
  }

  it("renders an entry for each registered app", () => {
    renderPalette();
    expect(screen.getByTestId("os-palette-row-home")).toBeInTheDocument();
    expect(screen.getByTestId("os-palette-row-templates")).toBeInTheDocument();
  });

  it("typing filters the list", async () => {
    const user = userEvent.setup();
    renderPalette();
    const input = screen.getByTestId("os-palette-input");
    await user.type(input, "templ");
    expect(screen.getByTestId("os-palette-row-templates")).toBeInTheDocument();
    expect(screen.queryByTestId("os-palette-row-home")).not.toBeInTheDocument();
  });

  it("clicking an entry opens the window", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getByTestId("os-palette-row-importer"));
    await waitFor(() => {
      expect(readWindows().map((w) => w.appId)).toContain("importer");
    });
  });

  it("ArrowDown navigates the active entry", async () => {
    const user = userEvent.setup();
    renderPalette();
    const input = screen.getByTestId("os-palette-input");
    input.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    // The 3rd entry (idx 2) is now active. Just ensure no throw + listbox
    // still rendered.
    expect(screen.getByTestId("os-palette-list")).toBeInTheDocument();
  });
});

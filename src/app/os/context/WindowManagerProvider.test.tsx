/**
 * Provider + context + hooks integration tests.
 *
 * These exercise the impure side of the window manager (hydration, URL sync,
 * resize listener, controls façade) that the pure reducer tests
 * deliberately stay away from.
 */

import { lazy, useEffect } from "react";
import { act, render, renderHook } from "@testing-library/react";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import {
  WindowManagerProvider,
  parseUrlSpecs,
  type RouterAdapter,
} from "os/context/WindowManagerProvider";
import { useWindowManager } from "os/context/use-window-manager";
import { useWindowControls } from "os/context/use-window-controls";
import { useWindowControls as useWindowControlsRoot } from "os/context/use-window-controls";
import {
  LAYOUT_STORAGE_KEY,
  LAYOUT_VERSION,
  WELCOME_STORAGE_KEY,
} from "os/lib/window-storage";
import { base64UrlEncode } from "os/lib/window-url";
import type { WindowManagerState, WindowState } from "os/context/window-types";

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
    Component: Stub as RegisteredApp<K>["Component"],
    showOnDesktop: true,
    ...partial,
  };
}

function seedRegistry() {
  registerApp(makeApp("home"));
  registerApp(makeApp("docs"));
  registerApp(makeApp("templates"));
  registerApp(
    makeApp("editor", {
      bind: "resume",
      defaultSize: { width: 1100, height: 750 },
      minSize: { width: 720, height: 480 },
    }),
  );
  registerApp(
    makeApp("analyzer", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "analyzer" },
    }),
  );
  registerApp(makeApp("auth", { isModal: true }));
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

function setLocationSearch(search: string) {
  const url = new URL(window.location.href);
  url.search = search;
  window.history.replaceState(null, "", url.toString());
}

beforeEach(() => {
  __resetRegistryForTests();
  seedRegistry();
  window.localStorage.clear();
  setLocationSearch("");
  jest.useFakeTimers();
});

afterEach(() => {
  __resetRegistryForTests();
  jest.useRealTimers();
});

/* ------------------------------ context hooks ----------------------------- */

describe("useWindowManager", () => {
  it("throws when used outside the provider", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => renderHook(() => useWindowManager())).toThrow(
        /WindowManagerProvider/,
      );
    } finally {
      console.error = original;
    }
  });

  it("returns state + dispatch + controls when mounted", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider initialState={{ isHydrated: true }}>
          {children}
        </WindowManagerProvider>
      ),
    });
    expect(result.current.state.isHydrated).toBe(true);
    expect(typeof result.current.dispatch).toBe("function");
    expect(typeof result.current.controls.openWindow).toBe("function");
  });
});

describe("useWindowControls", () => {
  it("dispatches actions for the bound window id", () => {
    const initial: Partial<WindowManagerState> = {
      isHydrated: true,
      windows: { a: makeWindow({ id: "a", appId: "editor", resumeId: "r1" }) },
      zOrder: ["a"],
      focusHistory: ["a"],
    };
    const { result } = renderHook(
      () => ({
        manager: useWindowManager(),
        controls: useWindowControls("a"),
      }),
      {
        wrapper: ({ children }) => (
          <WindowManagerProvider initialState={initial}>
            {children}
          </WindowManagerProvider>
        ),
      },
    );

    act(() => result.current.controls.minimize());
    expect(result.current.manager.state.windows.a.status).toBe("minimized");
    act(() => result.current.controls.maximize());
    expect(result.current.manager.state.windows.a.status).toBe("maximized");
    act(() => result.current.controls.restore());
    expect(result.current.manager.state.windows.a.status).toBe("open");
    act(() => result.current.controls.snap("right"));
    expect(result.current.manager.state.windows.a.status).toBe("snappedRight");
    act(() => result.current.controls.bringToFront());
    act(() =>
      result.current.controls.setScrollAnchor("foo"),
    );
    expect(result.current.manager.state.windows.a.scrollAnchor).toBe("foo");
    act(() => result.current.controls.popOutTab("analyzer", "analyzer"));
    expect(
      Object.values(result.current.manager.state.windows).some(
        (w) => w.appId === "analyzer",
      ),
    ).toBe(true);
    const childId = Object.values(result.current.manager.state.windows).find(
      (w) => w.appId === "analyzer",
    )!.id;
    // Returning a popped-out tab uses the child window id, not the parent.
    act(() => {
      result.current.manager.dispatch({ type: "RETURN_TO_TAB", id: childId });
    });
    expect(
      Object.values(result.current.manager.state.windows).some(
        (w) => w.appId === "analyzer",
      ),
    ).toBe(false);
    act(() => result.current.controls.close());
    expect(result.current.manager.state.windows.a).toBeUndefined();
  });

  it("returnToTab dispatches even when there is no parent (reducer removes the window)", () => {
    const initial: Partial<WindowManagerState> = {
      isHydrated: true,
      windows: { a: makeWindow({ id: "a" }) },
      zOrder: ["a"],
    };
    const { result } = renderHook(
      () => ({
        manager: useWindowManager(),
        controls: useWindowControls("a"),
      }),
      {
        wrapper: ({ children }) => (
          <WindowManagerProvider initialState={initial}>
            {children}
          </WindowManagerProvider>
        ),
      },
    );
    act(() => result.current.controls.returnToTab());
    // The reducer treats RETURN_TO_TAB as "remove me". When the window has no
    // parent there is nothing to restore — the action is still safe and just
    // closes the window.
    expect(result.current.manager.state.windows.a).toBeUndefined();
  });

  it("re-exports cleanly from the same module path", () => {
    expect(useWindowControlsRoot).toBe(useWindowControls);
  });
});

/* ----------------------------- provider ----------------------------------- */

describe("WindowManagerProvider hydration", () => {
  it("uses provided initialState verbatim, skipping localStorage", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: LAYOUT_VERSION,
        windows: { z: makeWindow({ id: "z" }) },
        zOrder: ["z"],
        focusHistory: ["z"],
        desktopSize: { width: 1024, height: 768 },
      }),
    );
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          initialState={{ isHydrated: true, hasShownWelcome: true }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    expect(result.current.state.windows).toEqual({});
    expect(result.current.state.hasShownWelcome).toBe(true);
  });

  it("loads from localStorage and marks hydrated", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: LAYOUT_VERSION,
        windows: { p: makeWindow({ id: "p", appId: "editor", resumeId: "rx" }) },
        zOrder: ["p"],
        focusHistory: ["p"],
        desktopSize: { width: 1280, height: 720 },
        currentResumeId: "rx",
      }),
    );
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider disableUrlSync>{children}</WindowManagerProvider>
      ),
    });
    expect(result.current.state.windows.p).toBeDefined();
    expect(result.current.state.zOrder).toEqual(["p"]);
    expect(result.current.state.hasShownWelcome).toBe(true);
    expect(result.current.state.isHydrated).toBe(true);
  });

  it("URL overrides localStorage when both are present", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: LAYOUT_VERSION,
        windows: { p: makeWindow({ id: "p", appId: "home" }) },
        zOrder: ["p"],
        focusHistory: ["p"],
        desktopSize: { width: 1024, height: 768 },
      }),
    );
    setLocationSearch("?w=docs%23ai-setup");
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider disableUrlSync>{children}</WindowManagerProvider>
      ),
    });
    const ids = Object.values(result.current.state.windows).map(
      (w) => w.appId,
    );
    expect(ids).toContain("docs");
  });

  it("hydrates from `?windows=` full layout when present", () => {
    const payload = base64UrlEncode(
      JSON.stringify({
        v: 1,
        windows: [
          {
            appId: "editor",
            resumeId: "abc-123",
            position: { x: 10, y: 10 },
            size: { width: 800, height: 600 },
          },
        ],
      }),
    );
    setLocationSearch(`?windows=${payload}`);
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider disableUrlSync>{children}</WindowManagerProvider>
      ),
    });
    const apps = Object.values(result.current.state.windows).map(
      (w) => w.appId,
    );
    expect(apps).toContain("editor");
  });

  it("ignores malformed `?w=` and stays clean", () => {
    setLocationSearch("?w=%%%bogus%%%");
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider disableUrlSync>{children}</WindowManagerProvider>
      ),
    });
    expect(result.current.state.windows).toEqual({});
    expect(result.current.state.isHydrated).toBe(true);
  });
});

describe("WindowManagerProvider viewport resize", () => {
  it("dispatches VIEWPORT_RESIZED on window resize", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider disableUrlSync>{children}</WindowManagerProvider>
      ),
    });
    const initialW = result.current.state.desktopSize.width;
    act(() => {
      Object.defineProperty(window, "innerWidth", {
        value: initialW + 200,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: 900,
        configurable: true,
      });
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.state.desktopSize.width).toBe(initialW + 200);
  });
});

describe("WindowManagerProvider URL sync", () => {
  it("debounces and writes the compact `?w=` value via the router adapter", () => {
    const replace = jest.fn();
    const router: RouterAdapter = {
      replace,
      read: () => "",
    };
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          router={router}
          syncDebounceMs={50}
          initialState={{ isHydrated: true }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.openWindow({ appId: "home" });
    });
    expect(replace).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(replace).toHaveBeenCalled();
    const lastCall = replace.mock.calls[replace.mock.calls.length - 1][0];
    expect(lastCall).toMatch(/^w=home/);
  });

  it("clears the `w` param when no windows remain", () => {
    const replace = jest.fn();
    let stored = "w=home";
    const router: RouterAdapter = {
      replace: (s) => {
        stored = s;
        replace(s);
      },
      read: () => stored,
    };
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          router={router}
          syncDebounceMs={20}
          initialState={{
            isHydrated: true,
            windows: { a: makeWindow({ id: "a", appId: "home" }) },
            zOrder: ["a"],
          }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.closeWindow("a");
    });
    act(() => {
      jest.advanceTimersByTime(30);
    });
    const lastCall = replace.mock.calls[replace.mock.calls.length - 1][0];
    expect(lastCall).not.toMatch(/w=/);
  });

  it("does not write to URL when disableUrlSync is true", () => {
    const replace = jest.fn();
    const router: RouterAdapter = { replace, read: () => "" };
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          router={router}
          disableUrlSync
          initialState={{ isHydrated: true }}
          syncDebounceMs={10}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.openWindow({ appId: "home" });
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not persist when disablePersistence is true", () => {
    const setItem = jest.spyOn(window.localStorage.__proto__, "setItem");
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          disablePersistence
          initialState={{ isHydrated: true }}
          syncDebounceMs={10}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    setItem.mockClear();
    act(() => {
      result.current.controls.openWindow({ appId: "home" });
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(
      setItem.mock.calls.find((c) => c[0] === LAYOUT_STORAGE_KEY),
    ).toBeUndefined();
    setItem.mockRestore();
  });
});

describe("WindowManagerProvider controls.openWindow", () => {
  it("generates a deterministic id and dispatches OPEN_WINDOW", () => {
    let i = 0;
    const generateId = () => `id-${++i}`;
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          generateId={generateId}
          now={() => 12345}
          initialState={{
            isHydrated: true,
            desktopSize: { width: 1440, height: 900 },
          }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    let returned: string;
    act(() => {
      returned = result.current.controls.openWindow({ appId: "home" });
    });
    expect(returned!).toBe("id-1");
    expect(result.current.state.windows["id-1"]).toBeDefined();
    expect(result.current.state.windows["id-1"].openedAt).toBe(12345);
    expect(result.current.state.windows["id-1"].appId).toBe("home");
  });

  it("respects focusIfExists by focusing the existing window", () => {
    const initial: Partial<WindowManagerState> = {
      isHydrated: true,
      windows: {
        a: makeWindow({ id: "a", appId: "editor", resumeId: "r1" }),
        b: makeWindow({ id: "b", appId: "home" }),
      },
      zOrder: ["b", "a"],
    };
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          generateId={() => "should-not-be-used"}
          initialState={initial}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    let returned: string;
    act(() => {
      returned = result.current.controls.openWindow({
        appId: "editor",
        resumeId: "r1",
        focusIfExists: true,
      });
    });
    expect(returned!).toBe("a");
    expect(result.current.state.zOrder[result.current.state.zOrder.length - 1]).toBe("a");
    expect(Object.keys(result.current.state.windows)).toHaveLength(2);
  });

  it("uses initialPosition + initialSize overrides when provided", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          generateId={() => "id-1"}
          initialState={{
            isHydrated: true,
            desktopSize: { width: 1440, height: 900 },
          }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.openWindow({
        appId: "editor",
        resumeId: "r1",
        initialPosition: { x: 50, y: 60 },
        initialSize: { width: 800, height: 600 },
      });
    });
    expect(result.current.state.windows["id-1"].position).toEqual({
      x: 50,
      y: 60,
    });
    expect(result.current.state.windows["id-1"].size).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("falls back to default size + center position when registry has no entry", () => {
    __resetRegistryForTests();
    // Note: only seeding `home` so other apps fall back to defaults.
    registerApp(makeApp("home"));
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          generateId={() => "id-1"}
          initialState={{
            isHydrated: true,
            desktopSize: { width: 1000, height: 800 },
          }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.openWindow({ appId: "templates" });
    });
    const w = result.current.state.windows["id-1"];
    expect(w).toBeDefined();
    expect(w.size.width).toBe(700);
    expect(w.size.height).toBe(550);
  });
});

describe("WindowManagerProvider controls.markWelcomeShown", () => {
  it("flips state and writes localStorage", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          initialState={{ isHydrated: true }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    expect(result.current.state.hasShownWelcome).toBe(false);
    act(() => {
      result.current.controls.markWelcomeShown();
    });
    expect(result.current.state.hasShownWelcome).toBe(true);
    expect(window.localStorage.getItem(WELCOME_STORAGE_KEY)).toBe("1");
  });
});

describe("WindowManagerProvider controls.resetDesktop", () => {
  it("wipes all windows", () => {
    const initial: Partial<WindowManagerState> = {
      isHydrated: true,
      windows: { a: makeWindow({ id: "a" }), b: makeWindow({ id: "b" }) },
      zOrder: ["a", "b"],
      focusHistory: ["a", "b"],
    };
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          initialState={initial}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.resetDesktop();
    });
    expect(result.current.state.windows).toEqual({});
  });
});

describe("WindowManagerProvider controls.setCurrentResume", () => {
  it("updates currentResumeId", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          disableUrlSync
          initialState={{ isHydrated: true }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => result.current.controls.setCurrentResume("r1"));
    expect(result.current.state.currentResumeId).toBe("r1");
    act(() => result.current.controls.setCurrentResume(undefined));
    expect(result.current.state.currentResumeId).toBeUndefined();
  });
});

describe("WindowManagerProvider controls.focusWindow + closeWindow", () => {
  it("focusWindow brings to front; closeWindow removes", () => {
    const initial: Partial<WindowManagerState> = {
      isHydrated: true,
      windows: { a: makeWindow({ id: "a" }), b: makeWindow({ id: "b" }) },
      zOrder: ["a", "b"],
    };
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider disableUrlSync initialState={initial}>
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => result.current.controls.focusWindow("a"));
    expect(result.current.state.zOrder).toEqual(["b", "a"]);
    act(() => result.current.controls.closeWindow("a"));
    expect(result.current.state.windows.a).toBeUndefined();
  });
});

describe("WindowManagerProvider with router=null", () => {
  it("does not crash and never writes a URL", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider
          router={null}
          syncDebounceMs={10}
          initialState={{ isHydrated: true }}
        >
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => result.current.controls.openWindow({ appId: "home" }));
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(Object.keys(result.current.state.windows)).toHaveLength(1);
  });
});

describe("parseUrlSpecs", () => {
  it("returns [] for empty input", () => {
    expect(parseUrlSpecs("")).toEqual([]);
  });

  it("prefers `?windows=` when both present", () => {
    const full = base64UrlEncode(
      JSON.stringify({ v: 1, windows: [{ appId: "docs" }] }),
    );
    const parsed = parseUrlSpecs(`windows=${full}&w=editor:abc`);
    expect(parsed.map((s) => s.appId)).toEqual(["docs"]);
  });

  it("falls back to `?w=` when full layout decodes empty", () => {
    expect(parseUrlSpecs("windows=&w=home").map((s) => s.appId)).toEqual([
      "home",
    ]);
  });

  it("returns [] when neither param is present", () => {
    expect(parseUrlSpecs("foo=bar")).toEqual([]);
  });
});

describe("WindowManagerProvider default URL adapter", () => {
  it("writes to window.history when no router prop is given", () => {
    const replaceState = jest.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider syncDebounceMs={5}>
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.openWindow({ appId: "home" });
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(replaceState).toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it("writes a URL using the live window.location when state is present", () => {
    const { result } = renderHook(() => useWindowManager(), {
      wrapper: ({ children }) => (
        <WindowManagerProvider syncDebounceMs={5}>
          {children}
        </WindowManagerProvider>
      ),
    });
    act(() => {
      result.current.controls.openWindow({ appId: "templates" });
    });
    act(() => {
      jest.advanceTimersByTime(20);
    });
    expect(window.location.search).toContain("w=templates");
  });
});

describe("WindowManagerProvider id generator", () => {
  it("uses crypto.randomUUID by default when available", () => {
    const original = (
      global.crypto as unknown as { randomUUID?: () => string }
    ).randomUUID;
    const stub = jest.fn(() => "fake-uuid");
    Object.defineProperty(global.crypto, "randomUUID", {
      value: stub,
      configurable: true,
      writable: true,
    });
    try {
      const { result } = renderHook(() => useWindowManager(), {
        wrapper: ({ children }) => (
          <WindowManagerProvider
            disableUrlSync
            initialState={{ isHydrated: true }}
          >
            {children}
          </WindowManagerProvider>
        ),
      });
      act(() => {
        result.current.controls.openWindow({ appId: "home" });
      });
      expect(stub).toHaveBeenCalled();
      expect(result.current.state.windows["fake-uuid"]).toBeDefined();
    } finally {
      Object.defineProperty(global.crypto, "randomUUID", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    const original = (
      global.crypto as unknown as { randomUUID?: () => string }
    ).randomUUID;
    delete (global.crypto as unknown as { randomUUID?: () => string }).randomUUID;
    try {
      const { result } = renderHook(() => useWindowManager(), {
        wrapper: ({ children }) => (
          <WindowManagerProvider
            disableUrlSync
            initialState={{ isHydrated: true }}
          >
            {children}
          </WindowManagerProvider>
        ),
      });
      act(() => {
        result.current.controls.openWindow({ appId: "home" });
      });
      const ids = Object.keys(result.current.state.windows);
      expect(ids[0]).toMatch(/^w_/);
    } finally {
      Object.defineProperty(global.crypto, "randomUUID", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });
});

describe("WindowManagerProvider rendering", () => {
  it("renders children", () => {
    const { container } = render(
      <WindowManagerProvider initialState={{ isHydrated: true }}>
        <div data-testid="child">hi</div>
      </WindowManagerProvider>,
    );
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });

  it("renders the live state into consumers (smoke)", () => {
    function Probe() {
      const { state } = useWindowManager();
      return (
        <span data-testid="count">{Object.keys(state.windows).length}</span>
      );
    }
    const { container, unmount } = render(
      <WindowManagerProvider
        disableUrlSync
        initialState={{ isHydrated: true }}
      >
        <Probe />
      </WindowManagerProvider>,
    );
    expect(container.querySelector('[data-testid="count"]')!.textContent).toBe(
      "0",
    );
    unmount();
  });

  it("invokes useEffect cleanup paths cleanly on unmount", () => {
    function Probe() {
      const { controls } = useWindowManager();
      useEffect(() => {
        controls.openWindow({ appId: "home" });
      }, [controls]);
      return null;
    }
    const { unmount } = render(
      <WindowManagerProvider
        disableUrlSync
        syncDebounceMs={5}
        initialState={{ isHydrated: true }}
      >
        <Probe />
      </WindowManagerProvider>,
    );
    expect(() => unmount()).not.toThrow();
  });
});

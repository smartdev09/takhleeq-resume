import {
  LAYOUT_STORAGE_KEY,
  WELCOME_STORAGE_KEY,
  LAYOUT_VERSION,
  saveLayout,
  loadLayout,
  clearLayout,
  markWelcomeShown,
  hasShownWelcome,
} from "os/lib/window-storage";
import type {
  WindowManagerState,
  WindowState,
} from "os/context/window-types";

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

function makeState(overrides: Partial<WindowManagerState> = {}): WindowManagerState {
  return {
    windows: overrides.windows ?? {},
    zOrder: overrides.zOrder ?? [],
    focusHistory: overrides.focusHistory ?? [],
    desktopSize: overrides.desktopSize ?? { width: 1440, height: 900 },
    currentResumeId: overrides.currentResumeId,
    hasShownWelcome: overrides.hasShownWelcome ?? false,
    isHydrated: overrides.isHydrated ?? true,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("saveLayout / loadLayout", () => {
  it("round-trips a layout with windows", () => {
    const w = makeWindow({ id: "a", appId: "editor", resumeId: "r1" });
    saveLayout(
      makeState({
        windows: { a: w },
        zOrder: ["a"],
        focusHistory: ["a"],
        currentResumeId: "r1",
      }),
    );
    const loaded = loadLayout();
    expect(loaded).not.toBeNull();
    expect(loaded?.windows?.a).toMatchObject({
      id: "a",
      appId: "editor",
      resumeId: "r1",
    });
    expect(loaded?.zOrder).toEqual(["a"]);
    expect(loaded?.focusHistory).toEqual(["a"]);
    expect(loaded?.currentResumeId).toBe("r1");
  });

  it("returns null when nothing is saved", () => {
    expect(loadLayout()).toBeNull();
  });

  it("returns null when stored JSON is malformed", () => {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, "{not json");
    expect(loadLayout()).toBeNull();
  });

  it("returns null when the version doesn't match", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: LAYOUT_VERSION + 99,
        windows: {},
        zOrder: [],
      }),
    );
    expect(loadLayout()).toBeNull();
  });

  it("returns null when stored payload is the wrong shape", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify("just a string"),
    );
    expect(loadLayout()).toBeNull();
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ v: LAYOUT_VERSION, windows: "no", zOrder: [] }),
    );
    expect(loadLayout()).toBeNull();
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ v: LAYOUT_VERSION, windows: {}, zOrder: "no" }),
    );
    expect(loadLayout()).toBeNull();
  });

  it("drops malformed window entries while keeping good ones", () => {
    const good = makeWindow({ id: "good" });
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: LAYOUT_VERSION,
        windows: {
          good,
          bad: { id: "bad" /* missing rest */ },
        },
        zOrder: ["good", "bad", "missing"],
        focusHistory: ["good", "bad", 42],
        desktopSize: { width: 100, height: 100 },
      }),
    );
    const loaded = loadLayout();
    expect(Object.keys(loaded?.windows ?? {})).toEqual(["good"]);
    expect(loaded?.zOrder).toEqual(["good"]);
    expect(loaded?.focusHistory).toEqual(["good"]);
  });

  it("ignores invalid desktopSize", () => {
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        v: LAYOUT_VERSION,
        windows: {},
        zOrder: [],
        focusHistory: [],
        desktopSize: { width: "wide", height: 100 },
      }),
    );
    const loaded = loadLayout();
    expect(loaded?.desktopSize).toBeUndefined();
  });

  it("survives a setItem that throws (quota / privacy mode)", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("QuotaExceeded");
    };
    expect(() => saveLayout(makeState())).not.toThrow();
    window.localStorage.setItem = original;
  });

  it("survives a getItem that throws", () => {
    const original = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new Error("blocked");
    };
    expect(() => loadLayout()).not.toThrow();
    expect(loadLayout()).toBeNull();
    window.localStorage.getItem = original;
  });
});

describe("clearLayout", () => {
  it("removes the persisted layout", () => {
    saveLayout(
      makeState({
        windows: { a: makeWindow({ id: "a" }) },
        zOrder: ["a"],
      }),
    );
    expect(loadLayout()).not.toBeNull();
    clearLayout();
    expect(loadLayout()).toBeNull();
  });

  it("does not throw when storage is empty", () => {
    expect(() => clearLayout()).not.toThrow();
  });
});

describe("markWelcomeShown / hasShownWelcome", () => {
  it("returns false initially", () => {
    expect(hasShownWelcome()).toBe(false);
  });

  it("flips to true once marked", () => {
    markWelcomeShown();
    expect(hasShownWelcome()).toBe(true);
    expect(window.localStorage.getItem(WELCOME_STORAGE_KEY)).toBe("1");
  });
});

describe("SSR safety", () => {
  it("is a no-op when window is undefined", () => {
    const w = global.window;
    // @ts-expect-error simulate SSR
    delete global.window;
    expect(() => saveLayout(makeState())).not.toThrow();
    expect(loadLayout()).toBeNull();
    expect(hasShownWelcome()).toBe(false);
    expect(() => markWelcomeShown()).not.toThrow();
    expect(() => clearLayout()).not.toThrow();
    global.window = w;
  });
});

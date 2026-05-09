import { lazy } from "react";
import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import {
  initialWindowManagerState,
  windowReducer,
} from "os/context/window-reducer";
import type {
  WindowAction,
  WindowManagerState,
  WindowState,
} from "os/context/window-types";
import { WINDOW_CONSTRAINTS } from "os/context/window-types";

const Stub = lazy(async () => ({ default: () => null }));

function makeApp<K extends AppId>(
  appId: K,
  partial: Partial<RegisteredApp<K>> = {},
): RegisteredApp<K> {
  const base: RegisteredApp<K> = {
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
  return base;
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

function makeState(overrides: Partial<WindowManagerState> = {}): WindowManagerState {
  return { ...initialWindowManagerState, ...overrides };
}

beforeEach(() => {
  __resetRegistryForTests();
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
  registerApp(
    makeApp("coverLetter", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "coverLetter" },
    }),
  );
  registerApp(makeApp("auth", { isModal: true }));
});

afterEach(() => {
  __resetRegistryForTests();
});

describe("windowReducer", () => {
  describe("HYDRATE", () => {
    it("merges payload into state", () => {
      const next = windowReducer(makeState(), {
        type: "HYDRATE",
        payload: { isHydrated: true, hasShownWelcome: true },
      });
      expect(next.isHydrated).toBe(true);
      expect(next.hasShownWelcome).toBe(true);
    });
  });

  describe("VIEWPORT_RESIZED", () => {
    it("updates desktopSize and clamps every window", () => {
      const w = makeWindow({ position: { x: 1300, y: 800 } });
      const state = makeState({
        windows: { w1: w },
        zOrder: ["w1"],
        desktopSize: { width: 1440, height: 900 },
      });
      const next = windowReducer(state, {
        type: "VIEWPORT_RESIZED",
        size: { width: 1024, height: 600 },
      });
      expect(next.desktopSize).toEqual({ width: 1024, height: 600 });
      expect(next.windows.w1.position.x).toBeLessThan(1300);
      expect(next.windows.w1.position.y).toBeLessThan(800);
    });

    it("re-snaps a left-snapped window", () => {
      const w = makeWindow({
        status: "snappedLeft",
        position: { x: 0, y: 0 },
        size: { width: 720, height: 852 },
      });
      const state = makeState({
        windows: { w1: w },
        zOrder: ["w1"],
        desktopSize: { width: 1440, height: 900 },
      });
      const next = windowReducer(state, {
        type: "VIEWPORT_RESIZED",
        size: { width: 1000, height: 800 },
      });
      expect(next.windows.w1.size.width).toBe(500);
    });

    it("re-applies maximize geometry on resize", () => {
      const w = makeWindow({ status: "maximized" });
      const state = makeState({
        windows: { w1: w },
        zOrder: ["w1"],
      });
      const next = windowReducer(state, {
        type: "VIEWPORT_RESIZED",
        size: { width: 1200, height: 800 },
      });
      expect(next.windows.w1.size.width).toBe(1200);
    });
  });

  describe("OPEN_WINDOW", () => {
    it("adds a window to state, focuses it, and pushes focus history", () => {
      const next = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "a" }),
      });
      expect(Object.keys(next.windows)).toEqual(["a"]);
      expect(next.zOrder).toEqual(["a"]);
      expect(next.focusHistory).toEqual(["a"]);
      expect(next.windows.a.zIndex).toBe(1);
    });

    it("updates currentResumeId when opening a resume-bound window", () => {
      const next = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "e", appId: "editor", resumeId: "r1" }),
      });
      expect(next.currentResumeId).toBe("r1");
    });

    it("does NOT update currentResumeId for standalone apps", () => {
      const next = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "h", appId: "home" }),
      });
      expect(next.currentResumeId).toBeUndefined();
    });

    it("rejects new windows beyond WINDOW_CONSTRAINTS.maxOpen", () => {
      let state = makeState();
      for (let i = 0; i < WINDOW_CONSTRAINTS.maxOpen; i += 1) {
        state = windowReducer(state, {
          type: "OPEN_WINDOW",
          window: makeWindow({ id: `w${i}` }),
        });
      }
      const before = Object.keys(state.windows).length;
      const after = windowReducer(state, {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "extra" }),
      });
      expect(Object.keys(after.windows).length).toBe(before);
    });

    it("clamps an out-of-bounds initial position", () => {
      const next = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({
          id: "a",
          position: { x: 99999, y: 99999 },
        }),
      });
      expect(next.windows.a.position.x).toBeLessThan(99999);
      expect(next.windows.a.position.y).toBeLessThan(99999);
    });

    it("dispatching OPEN with a duplicate id brings that window to front", () => {
      let state = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "a" }),
      });
      state = windowReducer(state, {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "b" }),
      });
      const next = windowReducer(state, {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "a" }),
      });
      expect(next.zOrder[next.zOrder.length - 1]).toBe("a");
    });
  });

  describe("CLOSE_WINDOW", () => {
    it("removes the window and updates focus / zOrder", () => {
      let state = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "a" }),
      });
      state = windowReducer(state, {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "b" }),
      });
      const next = windowReducer(state, { type: "CLOSE_WINDOW", id: "b" });
      expect(next.windows.b).toBeUndefined();
      expect(next.zOrder).toEqual(["a"]);
      expect(next.focusHistory).toEqual(["a"]);
    });

    it("orphans children rather than removing them", () => {
      const editor = makeWindow({ id: "e", appId: "editor", resumeId: "r1" });
      const child = makeWindow({
        id: "c",
        appId: "analyzer",
        resumeId: "r1",
        parentId: "e",
      });
      const state = makeState({
        windows: { e: editor, c: child },
        zOrder: ["e", "c"],
      });
      const next = windowReducer(state, { type: "CLOSE_WINDOW", id: "e" });
      expect(next.windows.c).toBeDefined();
      expect(next.windows.c.parentId).toBeUndefined();
    });

    it("recomputes currentResumeId when the active editor closes", () => {
      const editor = makeWindow({
        id: "e",
        appId: "editor",
        resumeId: "r1",
      });
      const editor2 = makeWindow({
        id: "e2",
        appId: "editor",
        resumeId: "r2",
      });
      const state = makeState({
        windows: { e: editor, e2: editor2 },
        zOrder: ["e2", "e"],
        currentResumeId: "r1",
      });
      const next = windowReducer(state, { type: "CLOSE_WINDOW", id: "e" });
      expect(next.currentResumeId).toBe("r2");
    });

    it("clears currentResumeId when no resume window remains", () => {
      const editor = makeWindow({
        id: "e",
        appId: "editor",
        resumeId: "r1",
      });
      const state = makeState({
        windows: { e: editor },
        zOrder: ["e"],
        currentResumeId: "r1",
      });
      const next = windowReducer(state, { type: "CLOSE_WINDOW", id: "e" });
      expect(next.currentResumeId).toBeUndefined();
    });

    it("ignores closing a non-existent id", () => {
      const state = makeState();
      const next = windowReducer(state, { type: "CLOSE_WINDOW", id: "nope" });
      expect(next).toBe(state);
    });
  });

  describe("MOVE_WINDOW", () => {
    it("updates position with clamping", () => {
      const w = makeWindow({ id: "a" });
      const state = makeState({ windows: { a: w }, zOrder: ["a"] });
      const next = windowReducer(state, {
        type: "MOVE_WINDOW",
        id: "a",
        position: { x: -500, y: -500 },
      });
      expect(next.windows.a.position.x).toBeGreaterThanOrEqual(0);
      expect(next.windows.a.position.y).toBeGreaterThanOrEqual(0);
    });

    it("ignores a move on an unknown id", () => {
      const state = makeState();
      const next = windowReducer(state, {
        type: "MOVE_WINDOW",
        id: "ghost",
        position: { x: 0, y: 0 },
      });
      expect(next).toBe(state);
    });
  });

  describe("RESIZE_WINDOW", () => {
    it("enforces minimum size", () => {
      const w = makeWindow({
        id: "a",
        minSize: { width: 400, height: 300 },
      });
      const state = makeState({ windows: { a: w }, zOrder: ["a"] });
      const next = windowReducer(state, {
        type: "RESIZE_WINDOW",
        id: "a",
        size: { width: 100, height: 100 },
      });
      expect(next.windows.a.size).toEqual({ width: 400, height: 300 });
    });

    it("can update position simultaneously", () => {
      const w = makeWindow({ id: "a" });
      const state = makeState({ windows: { a: w }, zOrder: ["a"] });
      const next = windowReducer(state, {
        type: "RESIZE_WINDOW",
        id: "a",
        size: { width: 600, height: 400 },
        position: { x: 50, y: 50 },
      });
      expect(next.windows.a.size).toEqual({ width: 600, height: 400 });
      expect(next.windows.a.position).toEqual({ x: 50, y: 50 });
    });
  });

  describe("BRING_TO_FRONT", () => {
    it("moves the id to the end of zOrder", () => {
      const state = makeState({
        windows: {
          a: makeWindow({ id: "a" }),
          b: makeWindow({ id: "b" }),
          c: makeWindow({ id: "c" }),
        },
        zOrder: ["a", "b", "c"],
        focusHistory: ["a", "b", "c"],
      });
      const next = windowReducer(state, { type: "BRING_TO_FRONT", id: "a" });
      expect(next.zOrder).toEqual(["b", "c", "a"]);
      expect(next.focusHistory[next.focusHistory.length - 1]).toBe("a");
    });

    it("focusing the same window twice does not duplicate history", () => {
      const state = makeState({
        windows: { a: makeWindow({ id: "a" }) },
        zOrder: ["a"],
        focusHistory: ["a"],
      });
      const next = windowReducer(state, { type: "BRING_TO_FRONT", id: "a" });
      expect(next.focusHistory).toEqual(["a"]);
    });

    it("updates currentResumeId when focusing a resume-bound window", () => {
      const editor = makeWindow({
        id: "e",
        appId: "editor",
        resumeId: "r1",
      });
      const home = makeWindow({ id: "h", appId: "home" });
      const state = makeState({
        windows: { e: editor, h: home },
        zOrder: ["e", "h"],
        currentResumeId: undefined,
      });
      const next = windowReducer(state, { type: "BRING_TO_FRONT", id: "e" });
      expect(next.currentResumeId).toBe("r1");
    });

    it("ignores an unknown id", () => {
      const state = makeState();
      const next = windowReducer(state, { type: "BRING_TO_FRONT", id: "nope" });
      expect(next).toBe(state);
    });
  });

  describe("MINIMIZE", () => {
    it("sets status and removes from focused zOrder", () => {
      const state = makeState({
        windows: {
          a: makeWindow({ id: "a" }),
          b: makeWindow({ id: "b" }),
        },
        zOrder: ["a", "b"],
        focusHistory: ["a", "b"],
      });
      const next = windowReducer(state, { type: "MINIMIZE", id: "b" });
      expect(next.windows.b.status).toBe("minimized");
      expect(next.zOrder).toEqual(["a"]);
      expect(next.focusHistory).toEqual(["a"]);
    });

    it("ignores an unknown id", () => {
      const state = makeState();
      const next = windowReducer(state, { type: "MINIMIZE", id: "nope" });
      expect(next).toBe(state);
    });
  });

  describe("MAXIMIZE / RESTORE", () => {
    it("maximize records preStatusGeometry and applies max size", () => {
      const w = makeWindow({
        id: "a",
        position: { x: 200, y: 200 },
        size: { width: 600, height: 400 },
      });
      const state = makeState({
        windows: { a: w },
        zOrder: ["a"],
        desktopSize: { width: 1440, height: 900 },
      });
      const next = windowReducer(state, { type: "MAXIMIZE", id: "a" });
      expect(next.windows.a.status).toBe("maximized");
      expect(next.windows.a.preStatusGeometry).toEqual({
        position: { x: 200, y: 200 },
        size: { width: 600, height: 400 },
      });
      expect(next.windows.a.size.width).toBe(1440);
    });

    it("re-MAXIMIZE on an already-maximized window is a no-op", () => {
      const state = makeState({
        windows: { a: makeWindow({ id: "a", status: "maximized" }) },
        zOrder: ["a"],
      });
      const next = windowReducer(state, { type: "MAXIMIZE", id: "a" });
      expect(next).toBe(state);
    });

    it("restore returns to preStatusGeometry", () => {
      let state = makeState({
        windows: {
          a: makeWindow({
            id: "a",
            position: { x: 200, y: 200 },
            size: { width: 600, height: 400 },
          }),
        },
        zOrder: ["a"],
      });
      state = windowReducer(state, { type: "MAXIMIZE", id: "a" });
      const restored = windowReducer(state, { type: "RESTORE", id: "a" });
      expect(restored.windows.a.status).toBe("open");
      expect(restored.windows.a.position).toEqual({ x: 200, y: 200 });
      expect(restored.windows.a.size).toEqual({ width: 600, height: 400 });
      expect(restored.windows.a.preStatusGeometry).toBeUndefined();
    });

    it("restore on an already-open window is a no-op", () => {
      const state = makeState({
        windows: { a: makeWindow({ id: "a" }) },
        zOrder: ["a"],
      });
      const next = windowReducer(state, { type: "RESTORE", id: "a" });
      expect(next).toBe(state);
    });

    it("restore on a window without preStatusGeometry just clears the status", () => {
      const w = makeWindow({ id: "a", status: "minimized" });
      const state = makeState({
        windows: { a: w },
        zOrder: [],
      });
      const next = windowReducer(state, { type: "RESTORE", id: "a" });
      expect(next.windows.a.status).toBe("open");
    });
  });

  describe("SNAP", () => {
    it("computes left snap geometry and saves preStatusGeometry", () => {
      const w = makeWindow({
        id: "a",
        position: { x: 100, y: 100 },
        size: { width: 700, height: 550 },
      });
      const state = makeState({
        windows: { a: w },
        zOrder: ["a"],
        desktopSize: { width: 1440, height: 900 },
      });
      const next = windowReducer(state, {
        type: "SNAP",
        id: "a",
        side: "left",
      });
      expect(next.windows.a.status).toBe("snappedLeft");
      expect(next.windows.a.position).toEqual({ x: 0, y: 0 });
      expect(next.windows.a.size.width).toBe(720);
      expect(next.windows.a.preStatusGeometry?.position).toEqual({
        x: 100,
        y: 100,
      });
    });

    it("snap-then-restore returns to original geometry", () => {
      let state = makeState({
        windows: {
          a: makeWindow({
            id: "a",
            position: { x: 100, y: 100 },
            size: { width: 700, height: 550 },
          }),
        },
        zOrder: ["a"],
      });
      state = windowReducer(state, { type: "SNAP", id: "a", side: "right" });
      expect(state.windows.a.status).toBe("snappedRight");
      const restored = windowReducer(state, { type: "RESTORE", id: "a" });
      expect(restored.windows.a.status).toBe("open");
      expect(restored.windows.a.position).toEqual({ x: 100, y: 100 });
    });
  });

  describe("POP_OUT_TAB", () => {
    it("snaps parent to left and creates child snapped right", () => {
      const editor = makeWindow({
        id: "e",
        appId: "editor",
        resumeId: "r1",
        position: { x: 100, y: 100 },
        size: { width: 1100, height: 750 },
      });
      const state = makeState({
        windows: { e: editor },
        zOrder: ["e"],
        desktopSize: { width: 1440, height: 900 },
      });
      const next = windowReducer(state, {
        type: "POP_OUT_TAB",
        parentId: "e",
        tabId: "analyzer",
        appId: "analyzer",
      });
      const childId = "e::popout::analyzer";
      expect(next.windows[childId]).toBeDefined();
      expect(next.windows[childId].parentId).toBe("e");
      expect(next.windows[childId].poppedOutFromTab).toBe("analyzer");
      expect(next.windows[childId].resumeId).toBe("r1");
      expect(next.windows[childId].status).toBe("snappedRight");
      expect(next.windows.e.status).toBe("snappedLeft");
      expect(next.windows.e.preStatusGeometry).toEqual({
        position: { x: 100, y: 100 },
        size: { width: 1100, height: 750 },
      });
    });

    it("ignores when parent does not exist", () => {
      const state = makeState();
      const next = windowReducer(state, {
        type: "POP_OUT_TAB",
        parentId: "missing",
        tabId: "analyzer",
        appId: "analyzer",
      });
      expect(next).toBe(state);
    });

    it("respects max-open cap", () => {
      const windows: Record<string, WindowState> = {};
      const zOrder: string[] = [];
      for (let i = 0; i < WINDOW_CONSTRAINTS.maxOpen; i += 1) {
        const id = `w${i}`;
        windows[id] = makeWindow({ id });
        zOrder.push(id);
      }
      windows.e = makeWindow({ id: "e", appId: "editor", resumeId: "r" });
      zOrder[0] = "e";
      const state = makeState({ windows, zOrder });
      const before = Object.keys(state.windows).length;
      const next = windowReducer(state, {
        type: "POP_OUT_TAB",
        parentId: "e",
        tabId: "analyzer",
        appId: "analyzer",
      });
      expect(Object.keys(next.windows).length).toBe(before);
    });

    it("is idempotent if dispatched twice for the same tab", () => {
      const state = makeState({
        windows: {
          e: makeWindow({ id: "e", appId: "editor", resumeId: "r1" }),
        },
        zOrder: ["e"],
      });
      const once = windowReducer(state, {
        type: "POP_OUT_TAB",
        parentId: "e",
        tabId: "analyzer",
        appId: "analyzer",
      });
      const twice = windowReducer(once, {
        type: "POP_OUT_TAB",
        parentId: "e",
        tabId: "analyzer",
        appId: "analyzer",
      });
      expect(twice).toBe(once);
    });
  });

  describe("RETURN_TO_TAB", () => {
    it("removes the popped-out window and restores parent geometry", () => {
      const editor = makeWindow({
        id: "e",
        appId: "editor",
        resumeId: "r1",
        position: { x: 100, y: 100 },
        size: { width: 1100, height: 750 },
      });
      const state = makeState({
        windows: { e: editor },
        zOrder: ["e"],
      });
      const popped = windowReducer(state, {
        type: "POP_OUT_TAB",
        parentId: "e",
        tabId: "analyzer",
        appId: "analyzer",
      });
      const childId = "e::popout::analyzer";
      const returned = windowReducer(popped, {
        type: "RETURN_TO_TAB",
        id: childId,
      });
      expect(returned.windows[childId]).toBeUndefined();
      expect(returned.windows.e.status).toBe("open");
      expect(returned.windows.e.position).toEqual({ x: 100, y: 100 });
      expect(returned.windows.e.size).toEqual({ width: 1100, height: 750 });
    });

    it("returns the state unchanged if the id is not a window", () => {
      const state = makeState();
      const next = windowReducer(state, {
        type: "RETURN_TO_TAB",
        id: "ghost",
      });
      expect(next).toBe(state);
    });

    it("works even if parent has no preStatusGeometry recorded", () => {
      const editor = makeWindow({ id: "e", appId: "editor", resumeId: "r" });
      const child = makeWindow({
        id: "c",
        appId: "analyzer",
        parentId: "e",
        resumeId: "r",
      });
      const state = makeState({
        windows: { e: editor, c: child },
        zOrder: ["e", "c"],
      });
      const next = windowReducer(state, { type: "RETURN_TO_TAB", id: "c" });
      expect(next.windows.c).toBeUndefined();
      expect(next.windows.e).toBeDefined();
    });
  });

  describe("SET_SCROLL_ANCHOR", () => {
    it("sets and clears scrollAnchor", () => {
      const state = makeState({
        windows: { a: makeWindow({ id: "a" }) },
        zOrder: ["a"],
      });
      const set = windowReducer(state, {
        type: "SET_SCROLL_ANCHOR",
        id: "a",
        anchor: "features",
      });
      expect(set.windows.a.scrollAnchor).toBe("features");
      const cleared = windowReducer(set, {
        type: "SET_SCROLL_ANCHOR",
        id: "a",
        anchor: undefined,
      });
      expect(cleared.windows.a.scrollAnchor).toBeUndefined();
    });
  });

  describe("RESTORE_FROM_URL", () => {
    it("creates new windows for specs that have no match", () => {
      const next = windowReducer(makeState(), {
        type: "RESTORE_FROM_URL",
        specs: [
          { appId: "templates" },
          { appId: "editor", resumeId: "abc-123" },
        ],
      });
      expect(next.zOrder).toHaveLength(2);
      const last = next.windows[next.zOrder[next.zOrder.length - 1]];
      expect(last.appId).toBe("editor");
      expect(last.resumeId).toBe("abc-123");
      expect(next.currentResumeId).toBe("abc-123");
    });

    it("re-uses existing windows that match by appId+resumeId", () => {
      const editor = makeWindow({
        id: "existing",
        appId: "editor",
        resumeId: "r1",
        position: { x: 333, y: 222 },
      });
      const state = makeState({
        windows: { existing: editor },
        zOrder: ["existing"],
      });
      const next = windowReducer(state, {
        type: "RESTORE_FROM_URL",
        specs: [{ appId: "editor", resumeId: "r1" }],
      });
      expect(next.zOrder).toEqual(["existing"]);
      expect(next.windows.existing.position).toEqual({ x: 333, y: 222 });
    });

    it("links popped-out children via the registry's popOutOf metadata", () => {
      const next = windowReducer(makeState(), {
        type: "RESTORE_FROM_URL",
        specs: [
          { appId: "editor", resumeId: "abc" },
          { appId: "analyzer", resumeId: "abc" },
        ],
      });
      const editorId = next.zOrder[0];
      const analyzerId = next.zOrder[1];
      expect(next.windows[analyzerId].parentId).toBe(editorId);
      expect(next.windows[analyzerId].poppedOutFromTab).toBe("analyzer");
    });
  });

  describe("RESTORE_FROM_LOCALSTORAGE", () => {
    it("hydrates windows from a saved partial state", () => {
      const w = makeWindow({ id: "a" });
      const next = windowReducer(makeState(), {
        type: "RESTORE_FROM_LOCALSTORAGE",
        state: {
          windows: { a: w },
          zOrder: ["a"],
          focusHistory: ["a"],
          desktopSize: { width: 1024, height: 768 },
        },
      });
      expect(next.windows.a).toBeDefined();
      expect(next.zOrder).toEqual(["a"]);
      expect(next.desktopSize).toEqual({ width: 1024, height: 768 });
    });

    it("filters dangling ids from zOrder and focusHistory", () => {
      const next = windowReducer(makeState(), {
        type: "RESTORE_FROM_LOCALSTORAGE",
        state: {
          windows: { a: makeWindow({ id: "a" }) },
          zOrder: ["a", "ghost"],
          focusHistory: ["a", "ghost"],
        },
      });
      expect(next.zOrder).toEqual(["a"]);
      expect(next.focusHistory).toEqual(["a"]);
    });

    it("handles an empty state payload", () => {
      const next = windowReducer(makeState(), {
        type: "RESTORE_FROM_LOCALSTORAGE",
        state: {},
      });
      expect(next.windows).toEqual({});
      expect(next.zOrder).toEqual([]);
    });
  });

  describe("RESET_DESKTOP", () => {
    it("clears windows, zOrder, focusHistory, currentResumeId", () => {
      const state = makeState({
        windows: {
          a: makeWindow({ id: "a", appId: "editor", resumeId: "r" }),
        },
        zOrder: ["a"],
        focusHistory: ["a"],
        currentResumeId: "r",
        hasShownWelcome: true,
      });
      const next = windowReducer(state, { type: "RESET_DESKTOP" });
      expect(next.windows).toEqual({});
      expect(next.zOrder).toEqual([]);
      expect(next.focusHistory).toEqual([]);
      expect(next.currentResumeId).toBeUndefined();
      expect(next.hasShownWelcome).toBe(true);
    });
  });

  describe("MARK_WELCOME_SHOWN", () => {
    it("flips the flag exactly once", () => {
      const state = makeState();
      const next = windowReducer(state, { type: "MARK_WELCOME_SHOWN" });
      expect(next.hasShownWelcome).toBe(true);
      const again = windowReducer(next, { type: "MARK_WELCOME_SHOWN" });
      expect(again).toBe(next);
    });
  });

  describe("SET_CURRENT_RESUME", () => {
    it("updates and clears currentResumeId", () => {
      const state = makeState();
      const set = windowReducer(state, {
        type: "SET_CURRENT_RESUME",
        resumeId: "r1",
      });
      expect(set.currentResumeId).toBe("r1");
      const same = windowReducer(set, {
        type: "SET_CURRENT_RESUME",
        resumeId: "r1",
      });
      expect(same).toBe(set);
      const cleared = windowReducer(set, {
        type: "SET_CURRENT_RESUME",
        resumeId: undefined,
      });
      expect(cleared.currentResumeId).toBeUndefined();
    });
  });

  describe("focus history edge cases", () => {
    it("removing all windows leaves an empty focus history", () => {
      let state = windowReducer(makeState(), {
        type: "OPEN_WINDOW",
        window: makeWindow({ id: "a" }),
      });
      state = windowReducer(state, { type: "CLOSE_WINDOW", id: "a" });
      expect(state.focusHistory).toEqual([]);
      expect(state.zOrder).toEqual([]);
    });
  });
});

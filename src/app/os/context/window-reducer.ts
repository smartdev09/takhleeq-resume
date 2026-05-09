/**
 * Window-manager reducer.
 *
 * The reducer is **pure**. It never reads the current time, never generates
 * random ids, never touches the DOM, never reads `localStorage`. The
 * provider does the impure work and feeds fully-formed payloads to this
 * function.
 *
 * One small exception: the reducer reads from `getApp` so it can decide
 * whether a window is resume-bound (and therefore should update
 * `currentResumeId`). The registry is constant in production; in tests it is
 * deterministically populated by `registerApp`.
 */

import type { AppId } from "../apps/app-types";
import { getApp } from "../apps/app-registry";
import { pushFocus, removeFromFocus } from "../lib/focus-history";
import {
  TASKBAR_HEIGHT,
  clampToViewport,
  computeMaximize,
  computeSnap,
  enforceMinSize,
} from "../lib/window-geometry";
import type {
  Position,
  Size,
  WindowAction,
  WindowId,
  WindowManagerState,
  WindowSpec,
  WindowState,
} from "./window-types";
import { WINDOW_CONSTRAINTS } from "./window-types";

/** Initial state; the provider replaces `desktopSize` on mount via VIEWPORT_RESIZED. */
export const initialWindowManagerState: WindowManagerState = {
  windows: {},
  zOrder: [],
  focusHistory: [],
  desktopSize: { width: 1440, height: 900 },
  hasShownWelcome: false,
  isHydrated: false,
};

/* --------------------------------- helpers -------------------------------- */

function isResumeBound(appId: AppId): boolean {
  return getApp(appId)?.bind === "resume";
}

/**
 * Walk z-order top-down looking for the most-recent resume-bound window's
 * `resumeId`, or `undefined` if there is no such window. Used after closing
 * or focusing to keep `currentResumeId` accurate.
 */
function deriveCurrentResume(
  windows: Record<WindowId, WindowState>,
  zOrder: ReadonlyArray<WindowId>,
): string | undefined {
  for (let i = zOrder.length - 1; i >= 0; i -= 1) {
    const w = windows[zOrder[i]];
    if (!w) continue;
    if (isResumeBound(w.appId) && w.resumeId) return w.resumeId;
  }
  return undefined;
}

/**
 * Renumber the `zIndex` field of every window so it tracks `zOrder`. Lets
 * AppWindow components style themselves with a constant CSS variable while
 * still allowing the dock / chrome to render above any window.
 */
function applyZIndexes(
  windows: Record<WindowId, WindowState>,
  zOrder: ReadonlyArray<WindowId>,
): Record<WindowId, WindowState> {
  const out: Record<WindowId, WindowState> = { ...windows };
  zOrder.forEach((id, idx) => {
    const w = out[id];
    if (!w) return;
    out[id] = { ...w, zIndex: idx + 1 };
  });
  return out;
}

/**
 * For a single window, return clamped/snapped geometry given a (possibly
 * new) desktop size. Used by VIEWPORT_RESIZED.
 */
function recomputeGeometry(
  w: WindowState,
  desktop: Size,
): WindowState {
  if (w.status === "maximized") {
    const m = computeMaximize(desktop);
    return { ...w, position: m.position, size: m.size };
  }
  if (w.status === "snappedLeft" || w.status === "snappedRight") {
    const side = w.status === "snappedLeft" ? "left" : "right";
    const s = computeSnap(side, desktop);
    return { ...w, position: s.position, size: s.size };
  }
  return {
    ...w,
    position: clampToViewport(w.position, w.size, desktop),
  };
}

function setWindow(
  state: WindowManagerState,
  id: WindowId,
  updater: (w: WindowState) => WindowState,
): WindowManagerState {
  const w = state.windows[id];
  if (!w) return state;
  const updated = updater(w);
  if (updated === w) return state;
  return {
    ...state,
    windows: { ...state.windows, [id]: updated },
  };
}

/**
 * Move an id to the end of zOrder (focus position). Returns the original
 * order untouched if `id` is already on top or not present.
 */
function moveToTop(
  zOrder: ReadonlyArray<WindowId>,
  id: WindowId,
): WindowId[] {
  if (!zOrder.includes(id)) return zOrder.slice();
  if (zOrder[zOrder.length - 1] === id) return zOrder.slice();
  return [...zOrder.filter((x) => x !== id), id];
}

/* ----------------------- spec → WindowState reconstruction ----------------------- */

const FALLBACK_DEFAULT_SIZE: Size = { width: 700, height: 550 };
const FALLBACK_MIN_SIZE: Size = { width: 320, height: 200 };

/**
 * Build a `WindowState` from a `WindowSpec` using registry defaults for any
 * field the spec does not provide. Used by `RESTORE_FROM_URL` when an
 * incoming spec has no matching existing window.
 */
function specToWindow(
  spec: WindowSpec,
  desktop: Size,
  index: number,
  openedAt: number,
): WindowState {
  const app = getApp(spec.appId);
  const defaultSize = app?.defaultSize ?? FALLBACK_DEFAULT_SIZE;
  const minSize = app?.minSize ?? FALLBACK_MIN_SIZE;
  const size: Size = enforceMinSize(spec.size ?? defaultSize, minSize);
  const position: Position =
    spec.position ?? {
      x: Math.max(
        WINDOW_CONSTRAINTS.viewportPaddingPx,
        Math.floor((desktop.width - size.width) / 2),
      ),
      y: Math.max(
        WINDOW_CONSTRAINTS.viewportPaddingPx,
        Math.floor((desktop.height - size.height) / 2),
      ),
    };
  const id = `url-${spec.appId}-${spec.resumeId ?? "no-resume"}-${index}`;
  const title = app?.title
    ? app.title(
        // Best-effort: registries may rely on more props than appId+resumeId,
        // but "" / {} is the safest fallback for hydration. Title is
        // re-derived at render time anyway via the registry.
        ({ resumeId: spec.resumeId } as unknown) as never,
      )
    : (spec.appId as string);
  return {
    id,
    appId: spec.appId,
    appProps: app
      ? ({ resumeId: spec.resumeId } as unknown as WindowState["appProps"])
      : ({} as WindowState["appProps"]),
    resumeId: spec.resumeId,
    position: clampToViewport(position, size, desktop),
    size,
    minSize,
    zIndex: index + 1,
    status: "open",
    scrollAnchor: spec.scrollAnchor,
    isModal: app?.isModal ?? false,
    openedAt: openedAt + index,
    title,
  };
}

function findExistingMatch(
  windows: Record<WindowId, WindowState>,
  spec: WindowSpec,
): WindowState | undefined {
  for (const w of Object.values(windows)) {
    if (w.appId !== spec.appId) continue;
    if ((w.resumeId ?? undefined) !== (spec.resumeId ?? undefined)) continue;
    return w;
  }
  return undefined;
}

/**
 * Walk specs and, using the registry's `popOutOf` metadata, link adjacent
 * child specs back to a parent that was already created in this batch. This
 * faithfully restores the `editor:abc/analyzer` URL form's parent linkage
 * even though `WindowSpec` itself doesn't carry it.
 */
function linkPoppedOutSpecs(
  windowsList: WindowState[],
): WindowState[] {
  const out: WindowState[] = [];
  let lastParent: WindowState | undefined;
  for (const w of windowsList) {
    const app = getApp(w.appId);
    if (
      app?.popOutOf &&
      lastParent &&
      lastParent.appId === app.popOutOf.parentAppId &&
      (w.resumeId ?? undefined) === (lastParent.resumeId ?? undefined)
    ) {
      out.push({
        ...w,
        parentId: lastParent.id,
        poppedOutFromTab: app.popOutOf.tabId,
      });
    } else {
      out.push(w);
      lastParent = w;
    }
  }
  return out;
}

/* --------------------------------- reducer -------------------------------- */

export function windowReducer(
  state: WindowManagerState,
  action: WindowAction,
): WindowManagerState {
  switch (action.type) {
    case "HYDRATE": {
      return { ...state, ...action.payload };
    }

    case "VIEWPORT_RESIZED": {
      const desktop = action.size;
      const newWindows: Record<WindowId, WindowState> = {};
      for (const [id, w] of Object.entries(state.windows)) {
        newWindows[id] = recomputeGeometry(w, desktop);
      }
      return { ...state, desktopSize: desktop, windows: newWindows };
    }

    case "OPEN_WINDOW": {
      if (Object.keys(state.windows).length >= WINDOW_CONSTRAINTS.maxOpen) {
        return state;
      }
      const incoming = action.window;
      if (state.windows[incoming.id]) {
        // Idempotent on duplicate id — bring to front instead.
        return windowReducer(state, {
          type: "BRING_TO_FRONT",
          id: incoming.id,
        });
      }
      const clamped: WindowState = {
        ...incoming,
        position: clampToViewport(
          incoming.position,
          incoming.size,
          state.desktopSize,
        ),
      };
      const windows = { ...state.windows, [clamped.id]: clamped };
      const zOrder = [...state.zOrder, clamped.id];
      const focusHistory = pushFocus(state.focusHistory, clamped.id);
      const sized = applyZIndexes(windows, zOrder);
      let currentResumeId = state.currentResumeId;
      if (isResumeBound(clamped.appId) && clamped.resumeId) {
        currentResumeId = clamped.resumeId;
      }
      return {
        ...state,
        windows: sized,
        zOrder,
        focusHistory,
        currentResumeId,
      };
    }

    case "CLOSE_WINDOW": {
      const w = state.windows[action.id];
      if (!w) return state;
      // Orphan children (clear their parentId so they remain open).
      const cleaned: Record<WindowId, WindowState> = {};
      for (const [id, win] of Object.entries(state.windows)) {
        if (id === action.id) continue;
        if (win.parentId === action.id) {
          cleaned[id] = { ...win, parentId: undefined };
        } else {
          cleaned[id] = win;
        }
      }
      const zOrder = state.zOrder.filter((id) => id !== action.id);
      const focusHistory = removeFromFocus(state.focusHistory, action.id);
      const windows = applyZIndexes(cleaned, zOrder);
      const currentResumeId = deriveCurrentResume(windows, zOrder);
      return {
        ...state,
        windows,
        zOrder,
        focusHistory,
        currentResumeId,
      };
    }

    case "MOVE_WINDOW": {
      return setWindow(state, action.id, (w) => ({
        ...w,
        position: clampToViewport(action.position, w.size, state.desktopSize),
      }));
    }

    case "RESIZE_WINDOW": {
      return setWindow(state, action.id, (w) => {
        const size = enforceMinSize(action.size, w.minSize);
        const position = clampToViewport(
          action.position ?? w.position,
          size,
          state.desktopSize,
        );
        return { ...w, size, position };
      });
    }

    case "BRING_TO_FRONT": {
      if (!state.windows[action.id]) return state;
      const zOrder = moveToTop(state.zOrder, action.id);
      const focusHistory = pushFocus(state.focusHistory, action.id);
      const windows = applyZIndexes(state.windows, zOrder);
      const focused = windows[action.id];
      let currentResumeId = state.currentResumeId;
      if (isResumeBound(focused.appId) && focused.resumeId) {
        currentResumeId = focused.resumeId;
      }
      return {
        ...state,
        windows,
        zOrder,
        focusHistory,
        currentResumeId,
      };
    }

    case "MINIMIZE": {
      const w = state.windows[action.id];
      if (!w) return state;
      const updated: WindowState = { ...w, status: "minimized" };
      const windows = { ...state.windows, [action.id]: updated };
      // Drop from zOrder front: minimized windows are not "focused" anymore
      const zOrder = state.zOrder.filter((id) => id !== action.id);
      const focusHistory = removeFromFocus(state.focusHistory, action.id);
      const sized = applyZIndexes(windows, [...zOrder, action.id]);
      const currentResumeId = deriveCurrentResume(sized, zOrder);
      return {
        ...state,
        windows: sized,
        zOrder,
        focusHistory,
        currentResumeId,
      };
    }

    case "MAXIMIZE": {
      return setWindow(state, action.id, (w) => {
        if (w.status === "maximized") return w;
        const max = computeMaximize(state.desktopSize);
        return {
          ...w,
          status: "maximized",
          preStatusGeometry: w.preStatusGeometry ?? {
            position: w.position,
            size: w.size,
          },
          position: max.position,
          size: max.size,
        };
      });
    }

    case "RESTORE": {
      return setWindow(state, action.id, (w) => {
        if (w.status === "open") return w;
        const restored = w.preStatusGeometry;
        return {
          ...w,
          status: "open",
          position: restored
            ? clampToViewport(restored.position, restored.size, state.desktopSize)
            : w.position,
          size: restored
            ? enforceMinSize(restored.size, w.minSize)
            : w.size,
          preStatusGeometry: undefined,
        };
      });
    }

    case "SNAP": {
      return setWindow(state, action.id, (w) => {
        const snap = computeSnap(action.side, state.desktopSize);
        const status = action.side === "left" ? "snappedLeft" : "snappedRight";
        return {
          ...w,
          status,
          preStatusGeometry: w.preStatusGeometry ?? {
            position: w.position,
            size: w.size,
          },
          position: snap.position,
          size: snap.size,
        };
      });
    }

    case "POP_OUT_TAB": {
      const parent = state.windows[action.parentId];
      if (!parent) return state;
      if (Object.keys(state.windows).length >= WINDOW_CONSTRAINTS.maxOpen) {
        return state;
      }
      // Deterministic id derived from the parent + tab. This keeps the
      // reducer pure and makes pop-out idempotent in the rare case the
      // action gets re-dispatched.
      const childId = `${action.parentId}::popout::${action.tabId}`;
      if (state.windows[childId]) return state;

      const childApp = getApp(action.appId);
      const childMinSize = childApp?.minSize ?? FALLBACK_MIN_SIZE;
      const leftSnap = computeSnap("left", state.desktopSize);
      const rightSnap = computeSnap("right", state.desktopSize);

      const updatedParent: WindowState = {
        ...parent,
        status: "snappedLeft",
        preStatusGeometry: parent.preStatusGeometry ?? {
          position: parent.position,
          size: parent.size,
        },
        position: leftSnap.position,
        size: leftSnap.size,
      };

      const child: WindowState = {
        id: childId,
        appId: action.appId,
        appProps: ({ resumeId: parent.resumeId } as unknown) as WindowState["appProps"],
        resumeId: parent.resumeId,
        parentId: parent.id,
        poppedOutFromTab: action.tabId,
        position: rightSnap.position,
        size: enforceMinSize(rightSnap.size, childMinSize),
        minSize: childMinSize,
        zIndex: 0,
        status: "snappedRight",
        isModal: childApp?.isModal ?? false,
        openedAt: parent.openedAt + 1,
        title: childApp?.title
          ? childApp.title(
              ({ resumeId: parent.resumeId } as unknown) as never,
            )
          : (action.appId as string),
      };

      const windows = {
        ...state.windows,
        [parent.id]: updatedParent,
        [childId]: child,
      };
      const zOrder = [...state.zOrder, childId];
      const focusHistory = pushFocus(state.focusHistory, childId);
      return {
        ...state,
        windows: applyZIndexes(windows, zOrder),
        zOrder,
        focusHistory,
      };
    }

    case "RETURN_TO_TAB": {
      const child = state.windows[action.id];
      if (!child) return state;
      const parent = child.parentId ? state.windows[child.parentId] : undefined;
      const cleaned: Record<WindowId, WindowState> = {};
      for (const [id, w] of Object.entries(state.windows)) {
        if (id === action.id) continue;
        cleaned[id] = w;
      }
      // Restore parent's pre-pop-out geometry if we have it.
      if (parent && parent.preStatusGeometry) {
        cleaned[parent.id] = {
          ...parent,
          status: "open",
          position: clampToViewport(
            parent.preStatusGeometry.position,
            parent.preStatusGeometry.size,
            state.desktopSize,
          ),
          size: enforceMinSize(
            parent.preStatusGeometry.size,
            parent.minSize,
          ),
          preStatusGeometry: undefined,
        };
      }
      const zOrder = state.zOrder.filter((id) => id !== action.id);
      const focusHistory = removeFromFocus(state.focusHistory, action.id);
      const windows = applyZIndexes(cleaned, zOrder);
      const currentResumeId = deriveCurrentResume(windows, zOrder);
      return {
        ...state,
        windows,
        zOrder,
        focusHistory,
        currentResumeId,
      };
    }

    case "SET_SCROLL_ANCHOR": {
      return setWindow(state, action.id, (w) => ({
        ...w,
        scrollAnchor: action.anchor,
      }));
    }

    case "RESTORE_FROM_URL": {
      const desktop = state.desktopSize;
      const matched: WindowState[] = [];
      const usedIds = new Set<WindowId>();
      action.specs.forEach((spec, idx) => {
        const existing = findExistingMatch(state.windows, spec);
        if (existing && !usedIds.has(existing.id)) {
          usedIds.add(existing.id);
          // Apply spec overrides (scroll anchor, geometry from full layout)
          const merged: WindowState = {
            ...existing,
            scrollAnchor: spec.scrollAnchor ?? existing.scrollAnchor,
            position: spec.position
              ? clampToViewport(spec.position, existing.size, desktop)
              : existing.position,
            size: spec.size
              ? enforceMinSize(spec.size, existing.minSize)
              : existing.size,
            status: "open",
          };
          matched.push(merged);
        } else {
          const created = specToWindow(spec, desktop, idx, 0);
          matched.push(created);
        }
      });
      const linked = linkPoppedOutSpecs(matched);
      const windowsRecord: Record<WindowId, WindowState> = {};
      for (const w of linked) windowsRecord[w.id] = w;
      const zOrder = linked.map((w) => w.id);
      const sized = applyZIndexes(windowsRecord, zOrder);
      const currentResumeId = deriveCurrentResume(sized, zOrder);
      return {
        ...state,
        windows: sized,
        zOrder,
        focusHistory: pushFocus(state.focusHistory, zOrder[zOrder.length - 1] ?? ""),
        currentResumeId,
      };
    }

    case "RESTORE_FROM_LOCALSTORAGE": {
      const incoming = action.state ?? {};
      const windows = incoming.windows ?? {};
      const zOrder = (incoming.zOrder ?? []).filter((id) => windows[id]);
      const focusHistory = (incoming.focusHistory ?? []).filter(
        (id) => windows[id],
      );
      const sized = applyZIndexes(windows, zOrder);
      const currentResumeId =
        incoming.currentResumeId ?? deriveCurrentResume(sized, zOrder);
      return {
        ...state,
        ...incoming,
        windows: sized,
        zOrder,
        focusHistory,
        currentResumeId,
      };
    }

    case "RESET_DESKTOP": {
      return {
        ...state,
        windows: {},
        zOrder: [],
        focusHistory: [],
        currentResumeId: undefined,
      };
    }

    case "MARK_WELCOME_SHOWN": {
      if (state.hasShownWelcome) return state;
      return { ...state, hasShownWelcome: true };
    }

    case "SET_CURRENT_RESUME": {
      if (state.currentResumeId === action.resumeId) return state;
      return { ...state, currentResumeId: action.resumeId };
    }

    default: {
      // Exhaustiveness check — TypeScript will complain if a new action type
      // is added but not handled.
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

/** Re-export the taskbar constant so the provider can use the same number. */
export { TASKBAR_HEIGHT };

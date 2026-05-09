/**
 * Layout persistence on top of `localStorage`.
 *
 * Stores the slimmest possible snapshot of `WindowManagerState` — enough to
 * restore the user's last session, but not so much that schema changes break
 * the world. The reader is defensively typed so a corrupted blob simply
 * returns `null` and the OS boots clean.
 *
 * Every entry point is SSR-safe: the `window` global is checked before any
 * `localStorage` access so importing this module on the server is a no-op.
 */

import type {
  WindowManagerState,
  WindowState,
} from "../context/window-types";

export const LAYOUT_STORAGE_KEY = "os.layout";
export const WELCOME_STORAGE_KEY = "os.welcomeShown";

/** Bumped when the persisted shape changes; older payloads get discarded. */
export const LAYOUT_VERSION = 1;

interface PersistedLayout {
  v: number;
  windows: Record<string, WindowState>;
  zOrder: string[];
  focusHistory: string[];
  desktopSize: { width: number; height: number };
  currentResumeId?: string;
}

/**
 * True when running in a browser context and `localStorage` is reachable.
 * `try/catch` guards against privacy modes that throw on access.
 */
function hasStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function safeGetItem(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist the current window-manager state. Quota and serialization errors
 * are swallowed — losing the last layout is acceptable; crashing the OS is
 * not.
 */
export function saveLayout(state: WindowManagerState): void {
  if (!hasStorage()) return;
  try {
    const payload: PersistedLayout = {
      v: LAYOUT_VERSION,
      windows: state.windows,
      zOrder: state.zOrder,
      focusHistory: state.focusHistory,
      desktopSize: state.desktopSize,
      currentResumeId: state.currentResumeId,
    };
    safeSetItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

/**
 * Load the last persisted layout, or `null` if absent / corrupt / from a
 * different schema version.
 */
export function loadLayout(): Partial<WindowManagerState> | null {
  const raw = safeGetItem(LAYOUT_STORAGE_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Partial<PersistedLayout>;
  if (p.v !== LAYOUT_VERSION) return null;
  if (!p.windows || typeof p.windows !== "object") return null;
  if (!Array.isArray(p.zOrder)) return null;

  // Validate window entries shallowly. If a single entry is bad we drop it
  // rather than the entire payload — the OS still boots usefully with what
  // can be recovered.
  const windows: Record<string, WindowState> = {};
  for (const [id, value] of Object.entries(p.windows)) {
    if (isWindowState(value)) windows[id] = value;
  }
  const validIds = new Set(Object.keys(windows));
  const zOrder = (p.zOrder ?? []).filter(
    (id): id is string => typeof id === "string" && validIds.has(id),
  );
  const focusHistory = Array.isArray(p.focusHistory)
    ? p.focusHistory.filter(
        (id): id is string => typeof id === "string" && validIds.has(id),
      )
    : [];
  const desktopSize =
    p.desktopSize &&
    typeof p.desktopSize.width === "number" &&
    typeof p.desktopSize.height === "number"
      ? p.desktopSize
      : undefined;

  return {
    windows,
    zOrder,
    focusHistory,
    desktopSize,
    currentResumeId:
      typeof p.currentResumeId === "string" ? p.currentResumeId : undefined,
  };
}

function isWindowState(value: unknown): value is WindowState {
  if (!value || typeof value !== "object") return false;
  const w = value as Partial<WindowState>;
  return (
    typeof w.id === "string" &&
    typeof w.appId === "string" &&
    !!w.position &&
    typeof w.position.x === "number" &&
    typeof w.position.y === "number" &&
    !!w.size &&
    typeof w.size.width === "number" &&
    typeof w.size.height === "number" &&
    !!w.minSize &&
    typeof w.minSize.width === "number" &&
    typeof w.minSize.height === "number" &&
    typeof w.zIndex === "number" &&
    typeof w.status === "string" &&
    typeof w.openedAt === "number" &&
    typeof w.title === "string"
  );
}

/** Remove the persisted layout (used by "Reset windows" panic button). */
export function clearLayout(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export function markWelcomeShown(): void {
  safeSetItem(WELCOME_STORAGE_KEY, "1");
}

export function hasShownWelcome(): boolean {
  return safeGetItem(WELCOME_STORAGE_KEY) === "1";
}

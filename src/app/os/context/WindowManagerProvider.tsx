/**
 * WindowManagerProvider — owns the `useReducer` instance and the side
 * effects that the pure reducer cannot perform: hydrating from
 * `localStorage` and the URL on mount, listening to `window.resize`,
 * and writing window-state changes back to the URL + storage on a
 * 200ms debounce.
 *
 * Hydration order (matters for tests):
 *   1. localStorage layout (last session)
 *   2. URL `?w=...` / `?windows=...` (override layer; short-lived shares
 *      take priority over the user's saved layout)
 *   3. Mark `isHydrated = true` so the URL writer starts emitting
 *
 * Tests can bypass the live `next/navigation` integration by passing
 * `initialState` (skips localStorage reads) and `disableUrlSync` (skips
 * router.replace calls). The default render path uses the live router.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import type { AppId, AppPropsMap } from "../apps/app-types";
import { getApp } from "../apps/app-registry";
import { getInitialPosition } from "../lib/window-geometry";
import {
  hasShownWelcome as readWelcome,
  loadLayout,
  markWelcomeShown as writeWelcome,
  saveLayout,
} from "../lib/window-storage";
import {
  deserializeFullLayout,
  deserializeWindowsCompact,
  serializeWindows,
} from "../lib/window-url";
import {
  WindowManagerContext,
  type WindowManagerContextValue,
  type WindowManagerControls,
} from "./WindowManagerContext";
import { initialWindowManagerState, windowReducer } from "./window-reducer";
import type {
  OpenWindowOptions,
  Position,
  Size,
  WindowAction,
  WindowId,
  WindowManagerState,
  WindowState,
} from "./window-types";

/**
 * Optional injected adapters so tests don't need to spin up the entire Next
 * router. Production code path uses `next/navigation` defaults.
 */
export interface RouterAdapter {
  /** Replace the URL search portion (e.g. `?w=editor:abc`). */
  replace: (search: string) => void;
  /** Read the current URL search string (without the leading `?`). */
  read: () => string;
}

export interface WindowManagerProviderProps {
  children: ReactNode;
  /**
   * If provided, becomes the entire initial state — no localStorage or URL
   * hydration runs. Tests use this to render against a known shape.
   */
  initialState?: Partial<WindowManagerState>;
  /** Skip writing the URL on every state change. Default: false. */
  disableUrlSync?: boolean;
  /** Skip writing localStorage on every state change. Default: false. */
  disablePersistence?: boolean;
  /**
   * Override the URL adapter (defaults to a `next/navigation` integration).
   * Pass `null` to disable URL syncing entirely.
   */
  router?: RouterAdapter | null;
  /** Override the debounce delay; default 200ms. Tests pass 0. */
  syncDebounceMs?: number;
  /** Override `Date.now()` — tests inject a deterministic clock. */
  now?: () => number;
  /** Override id generator — tests inject deterministic ids. */
  generateId?: () => string;
}

const DEFAULT_DEBOUNCE_MS = 200;

function defaultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for very old jsdom: not cryptographically strong; only used
  // when the test environment cannot provide crypto.randomUUID.
  return `w_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

/**
 * Default URL adapter: writes via `history.replaceState` so the URL stays in
 * sync with state without forcing a Next.js router transition (which would
 * tear down the OS root). The OSRoot may swap in a `next/navigation`-aware
 * adapter via the `router` prop if it wants Next-side state to propagate.
 */
function buildDefaultRouterAdapter(): RouterAdapter | null {
  if (typeof window === "undefined") return null;
  return {
    replace: (search: string) => {
      const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", url);
    },
    read: () => window.location.search.replace(/^\?/, ""),
  };
}

/**
 * Build a fresh top-level state from a partial — fills in unset fields with
 * the reducer's `initialWindowManagerState` defaults.
 */
function mergeInitialState(
  partial: Partial<WindowManagerState> | undefined,
): WindowManagerState {
  return { ...initialWindowManagerState, ...(partial ?? {}) };
}

export function WindowManagerProvider({
  children,
  initialState,
  disableUrlSync = false,
  disablePersistence = false,
  router,
  syncDebounceMs = DEFAULT_DEBOUNCE_MS,
  now = Date.now,
  generateId = defaultId,
}: WindowManagerProviderProps) {
  const [state, dispatch] = useReducer(
    windowReducer,
    initialState,
    mergeInitialState,
  );

  // Stable refs so callbacks don't re-create on every render.
  const stateRef = useRef(state);
  stateRef.current = state;

  const routerRef = useRef<RouterAdapter | null | undefined>(router);
  if (router !== undefined) routerRef.current = router;

  const isHydratingRef = useRef(true);

  /* ------------------------- Side-effect: hydration ------------------------ */

  useEffect(() => {
    if (initialState) {
      // Caller provided a fully-formed initial state — we honour it as-is.
      isHydratingRef.current = false;
      dispatch({ type: "HYDRATE", payload: { isHydrated: true } });
      return;
    }

    // 1) Set viewport size from the live window before any other dispatch
    if (typeof window !== "undefined") {
      dispatch({
        type: "VIEWPORT_RESIZED",
        size: { width: window.innerWidth, height: window.innerHeight },
      });
    }

    // 2) Replay localStorage
    const persisted = loadLayout();
    if (persisted) {
      dispatch({ type: "RESTORE_FROM_LOCALSTORAGE", state: persisted });
    }

    // 3) Replay URL (overrides localStorage)
    const adapter =
      router === undefined ? buildDefaultRouterAdapter() : router ?? null;
    routerRef.current = adapter;
    const search =
      adapter?.read() ??
      (typeof window === "undefined"
        ? ""
        : window.location.search.replace(/^\?/, ""));
    const specs = parseUrlSpecs(search);
    if (specs.length > 0) {
      dispatch({ type: "RESTORE_FROM_URL", specs });
    }

    // 4) Apply welcome flag
    const welcome = readWelcome();
    dispatch({
      type: "HYDRATE",
      payload: { hasShownWelcome: welcome, isHydrated: true },
    });
    isHydratingRef.current = false;
    // We deliberately only run hydration once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------------- Side-effect: viewport size ---------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => {
      dispatch({
        type: "VIEWPORT_RESIZED",
        size: { width: window.innerWidth, height: window.innerHeight },
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ------------- Side-effect: debounced sync to URL + storage -------------- */

  useEffect(() => {
    if (isHydratingRef.current || !state.isHydrated) return;
    const timer = setTimeout(() => {
      if (!disablePersistence) {
        saveLayout(state);
      }
      if (!disableUrlSync && routerRef.current) {
        const compact = serializeWindows(state);
        const params = new URLSearchParams(routerRef.current.read());
        if (compact) {
          params.set("w", compact);
        } else {
          params.delete("w");
        }
        // Always strip the heavyweight share blob once the user makes any
        // change — its only purpose was the initial deep-link import.
        params.delete("windows");
        routerRef.current.replace(params.toString());
      }
    }, syncDebounceMs);
    return () => clearTimeout(timer);
  }, [state, disablePersistence, disableUrlSync, syncDebounceMs]);

  /* ----------------------------- Controls façade --------------------------- */

  const openWindow = useCallback(
    <K extends AppId>(
      options: OpenWindowOptions<AppPropsMap[K]> & { appId: K },
    ): WindowId => {
      const current = stateRef.current;
      const app = getApp(options.appId);

      // focusIfExists: short-circuit with BRING_TO_FRONT.
      if (options.focusIfExists) {
        for (const w of Object.values(current.windows)) {
          if (
            w.appId === options.appId &&
            (w.resumeId ?? undefined) === (options.resumeId ?? undefined)
          ) {
            dispatch({ type: "BRING_TO_FRONT", id: w.id });
            return w.id;
          }
        }
      }

      const size: Size =
        options.initialSize ?? app?.defaultSize ?? { width: 700, height: 550 };
      const minSize: Size = app?.minSize ?? { width: 320, height: 200 };
      const sameAppOpen = Object.values(current.windows).filter(
        (w) => w.appId === options.appId,
      ).length;
      const position: Position =
        options.initialPosition ??
        getInitialPosition(
          app?.defaultPosition ?? "center",
          {
            desktop: current.desktopSize,
            sameAppOpen,
            existing: Object.values(current.windows).map((w) => ({
              position: w.position,
              size: w.size,
            })),
          },
          size,
        );

      const id = generateId();
      const titleProps =
        options.appProps ??
        ({ resumeId: options.resumeId } as unknown as AppPropsMap[K]);
      const title = app?.title
        ? app.title(titleProps as never)
        : (options.appId as string);

      const windowState: WindowState = {
        id,
        appId: options.appId,
        appProps:
          (options.appProps as unknown) ??
          ({ resumeId: options.resumeId } as unknown),
        resumeId: options.resumeId,
        parentId: options.parentId,
        poppedOutFromTab: options.poppedOutFromTab,
        position,
        size,
        minSize,
        zIndex: 0,
        status: "open",
        scrollAnchor: options.scrollAnchor,
        isModal: app?.isModal ?? false,
        openedAt: now(),
        title,
      };
      dispatch({ type: "OPEN_WINDOW", window: windowState });
      return id;
    },
    [generateId, now],
  );

  const closeWindow = useCallback(
    (id: WindowId) => dispatch({ type: "CLOSE_WINDOW", id }),
    [],
  );

  const focusWindow = useCallback(
    (id: WindowId) => dispatch({ type: "BRING_TO_FRONT", id }),
    [],
  );

  const resetDesktop = useCallback(
    () => dispatch({ type: "RESET_DESKTOP" }),
    [],
  );

  const markWelcomeShown = useCallback(() => {
    writeWelcome();
    dispatch({ type: "MARK_WELCOME_SHOWN" });
  }, []);

  const setCurrentResume = useCallback(
    (resumeId: string | undefined) =>
      dispatch({ type: "SET_CURRENT_RESUME", resumeId }),
    [],
  );

  const controls = useMemo<WindowManagerControls>(
    () => ({
      openWindow,
      closeWindow,
      focusWindow,
      resetDesktop,
      markWelcomeShown,
      setCurrentResume,
    }),
    [
      openWindow,
      closeWindow,
      focusWindow,
      resetDesktop,
      markWelcomeShown,
      setCurrentResume,
    ],
  );

  const value = useMemo<WindowManagerContextValue>(
    () => ({ state, dispatch, controls }),
    [state, controls],
  );

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
}

/* ---------------------------- helper internals ---------------------------- */

/**
 * Parse the `?w=` and `?windows=` parameters from a URL search string into
 * window specs. Empty / malformed input returns `[]` (the deserializers do
 * the safe thing).
 */
export function parseUrlSpecs(search: string): ReturnType<
  typeof deserializeWindowsCompact
> {
  if (!search) return [];
  const params = new URLSearchParams(search);
  const full = params.get("windows");
  if (full) {
    const parsed = deserializeFullLayout(full);
    if (parsed.length > 0) return parsed;
  }
  const compact = params.get("w");
  if (compact) return deserializeWindowsCompact(compact);
  return [];
}

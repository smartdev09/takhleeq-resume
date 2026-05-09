/**
 * The React context that the WindowManagerProvider populates and that
 * `useWindowManager` / `useWindowControls` read.
 *
 * The shape is intentionally narrow:
 *  - `state`   — the current `WindowManagerState`
 *  - `dispatch`— the raw reducer dispatcher (escape hatch for advanced cases)
 *  - `controls`— a memoised manager façade that handles the impure parts of
 *                opening / closing / focusing windows so callers don't have
 *                to mint UUIDs or compute initial geometry themselves.
 *
 * Keeping `controls` here (and not as a separate provider) means desktop
 * chrome modules can stay decoupled from the reducer's action shape.
 */

"use client";

import { createContext } from "react";
import type { Dispatch } from "react";

import type { AppId, AppPropsMap } from "../apps/app-types";
import type {
  OpenWindowOptions,
  WindowAction,
  WindowId,
  WindowManagerState,
} from "./window-types";

/**
 * Top-level façade that desktop chrome (top menu bar, dock, desktop icons)
 * uses to open / focus / close windows without learning the reducer's
 * action shape.
 */
export interface WindowManagerControls {
  /** Open a window for `appId`. Returns the new window id. */
  openWindow: <K extends AppId>(
    options: OpenWindowOptions<AppPropsMap[K]> & { appId: K },
  ) => WindowId;
  /** Close the window with this id, if any. */
  closeWindow: (id: WindowId) => void;
  /** Bring this window to the front of `zOrder`. */
  focusWindow: (id: WindowId) => void;
  /** Wipe every open window — the panic button. */
  resetDesktop: () => void;
  /** Mark the first-visit `home.md` welcome flow as shown (state + storage). */
  markWelcomeShown: () => void;
  /** Override the focused resume id (used by the cover letter / analyzer
   *  pickers when no editor window is currently focused). */
  setCurrentResume: (resumeId: string | undefined) => void;
}

export interface WindowManagerContextValue {
  state: WindowManagerState;
  dispatch: Dispatch<WindowAction>;
  controls: WindowManagerControls;
}

/**
 * Context default is `null` so the consumer hooks can throw a useful error
 * when called outside the provider — silently rendering with empty state
 * would mask integration bugs.
 */
export const WindowManagerContext =
  createContext<WindowManagerContextValue | null>(null);

WindowManagerContext.displayName = "WindowManagerContext";

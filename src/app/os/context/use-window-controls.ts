/**
 * Per-window controls hook.
 *
 * Apps and the AppWindow chrome both need to call close / minimize / etc on
 * a specific window without learning the reducer's action vocabulary. This
 * hook returns a stable `WindowControls` object bound to a single window id.
 *
 * The returned controls are memoised on `[dispatch, windowId]`, so passing
 * them through `React.memo` boundaries does not cause render churn.
 */

"use client";

import { useMemo } from "react";

import type { AppId } from "../apps/app-types";
import { useWindowManager } from "./use-window-manager";
import type { WindowControls, WindowId } from "./window-types";

export function useWindowControls(windowId: WindowId): WindowControls {
  const { dispatch } = useWindowManager();
  return useMemo<WindowControls>(
    () => ({
      close: () => dispatch({ type: "CLOSE_WINDOW", id: windowId }),
      minimize: () => dispatch({ type: "MINIMIZE", id: windowId }),
      maximize: () => dispatch({ type: "MAXIMIZE", id: windowId }),
      restore: () => dispatch({ type: "RESTORE", id: windowId }),
      bringToFront: () => dispatch({ type: "BRING_TO_FRONT", id: windowId }),
      snap: (side: "left" | "right") =>
        dispatch({ type: "SNAP", id: windowId, side }),
      setScrollAnchor: (anchor: string | undefined) =>
        dispatch({ type: "SET_SCROLL_ANCHOR", id: windowId, anchor }),
      popOutTab: (tabId: string, appId: AppId) =>
        dispatch({
          type: "POP_OUT_TAB",
          parentId: windowId,
          tabId,
          appId,
        }),
      returnToTab: () => dispatch({ type: "RETURN_TO_TAB", id: windowId }),
    }),
    [dispatch, windowId],
  );
}

/**
 * `<WindowsLayer>` — renders one `<AppWindow>` per entry in `state.windows`,
 * ordered by `state.zOrder` so the focused window is the last child in the
 * DOM (matches its painted z-index).
 *
 * For each window:
 *  - resolves the registered app via `getApp(appId)` and renders the lazy
 *    body inside the window's children slot, wrapped in `<Suspense>` so a
 *    Phase 3 lazy-loaded module shows the small fallback while it streams.
 *  - computes `isFocused` (window is at the top of `zOrder`) and `isInert`
 *    (any modal sibling is open AND this window isn't the modal itself).
 *  - wires the window-controls callbacks back to dispatch / `controls`.
 *
 * Inert siblings get the HTML `inert` attribute via `<AppWindow>`'s prop
 * surface — see `AppWindow.tsx`. The modal-z boost lives there too.
 */

"use client";

import * as React from "react";
import { Suspense, useCallback, useMemo } from "react";

import { getApp } from "./apps/app-registry";
import type { AppComponentProps, AppId } from "./apps/app-types";
import { AppWindow } from "./Window/AppWindow";
import { useWindowManager } from "./context/use-window-manager";
import type {
  Position,
  Size,
  WindowId,
  WindowState,
} from "./context/window-types";

export function WindowsLayer() {
  const { state, dispatch, controls } = useWindowManager();

  /* ---------------- per-window callback wiring ---------------- */

  const handleMove = useCallback(
    (id: WindowId, position: Position) =>
      dispatch({ type: "MOVE_WINDOW", id, position }),
    [dispatch],
  );
  const handleResize = useCallback(
    (id: WindowId, size: Size, position?: Position) =>
      dispatch({ type: "RESIZE_WINDOW", id, size, position }),
    [dispatch],
  );
  const handleFocus = useCallback(
    (id: WindowId) => controls.focusWindow(id),
    [controls],
  );
  const handleClose = useCallback(
    (id: WindowId) => controls.closeWindow(id),
    [controls],
  );
  const handleMinimize = useCallback(
    (id: WindowId) => dispatch({ type: "MINIMIZE", id }),
    [dispatch],
  );
  const handleMaximize = useCallback(
    (id: WindowId) => dispatch({ type: "MAXIMIZE", id }),
    [dispatch],
  );
  const handleRestore = useCallback(
    (id: WindowId) => dispatch({ type: "RESTORE", id }),
    [dispatch],
  );
  const handleSnap = useCallback(
    (id: WindowId, side: "left" | "right") =>
      dispatch({ type: "SNAP", id, side }),
    [dispatch],
  );

  /* ----------------- ordered window list --------------------- */

  const orderedWindows = useMemo(() => {
    const out: WindowState[] = [];
    for (const id of state.zOrder) {
      const w = state.windows[id];
      if (w) out.push(w);
    }
    return out;
  }, [state.windows, state.zOrder]);

  // Modal sibling lookup: inert all NON-modal windows when ANY modal sibling
  // is open. The modal stays interactive.
  const hasModalSibling = useMemo(
    () => orderedWindows.some((w) => w.isModal),
    [orderedWindows],
  );

  const focusedId = state.zOrder[state.zOrder.length - 1];

  // On mobile, only render the focused window full-screen. The dock acts as
  // the window switcher (chips for the rest are still interactive). Other
  // windows stay in state; we just don't paint them.
  const isMobile = state.desktopSize.width > 0 && state.desktopSize.width <= 768;
  const visibleWindows = isMobile
    ? orderedWindows.filter((w) => w.id === focusedId)
    : orderedWindows;

  return (
    <div
      data-testid="os-windows-layer"
      role="presentation"
      // The layer fills the desktop area between the menu bar and dock and
      // sits BELOW interactive chrome (menu bar / dock are z-1000+) but
      // ABOVE the wallpaper / icons (z-0). pointer-events:none so wallpaper
      // clicks pass through; individual windows opt back in.
      className="pointer-events-none absolute"
      style={{
        top: "var(--os-menu-bar-height)",
        bottom: "var(--os-dock-height)",
        left: 0,
        right: 0,
      }}
    >
      <div className="pointer-events-none relative h-full w-full">
        {visibleWindows.map((w) => {
          const app = getApp(w.appId);
          const isFocused = w.id === focusedId;
          const isInert = hasModalSibling && !w.isModal;
          // On mobile, override geometry to fill ~90% viewport (centered).
          const mobileWindow: WindowState = isMobile
            ? {
                ...w,
                position: {
                  x: Math.round(state.desktopSize.width * 0.05),
                  y: 12,
                },
                size: {
                  width: Math.round(state.desktopSize.width * 0.9),
                  height: Math.max(
                    320,
                    state.desktopSize.height -
                      // 36px menu + 56px dock + 24px padding
                      36 -
                      56 -
                      24,
                  ),
                },
                status: w.status === "minimized" ? "minimized" : "open",
              }
            : w;
          // Re-enable pointer events on the actual window chrome.
          return (
            <div
              key={w.id}
              className="pointer-events-auto"
              data-testid={`window-host-${w.id}`}
            >
              <AppWindow
                window={mobileWindow}
                desktopSize={state.desktopSize}
                isFocused={isFocused}
                isInert={isInert}
                onMove={handleMove}
                onResize={handleResize}
                onFocus={handleFocus}
                onClose={handleClose}
                onMinimize={handleMinimize}
                onMaximize={handleMaximize}
                onRestore={handleRestore}
                onSnap={handleSnap}
              >
                <AppBody window={w} appId={w.appId} app={app} />
              </AppWindow>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */

interface AppBodyProps<K extends AppId = AppId> {
  window: WindowState;
  appId: K;
  app: ReturnType<typeof getApp> | undefined;
}

/**
 * Mounts the registered app's lazy component inside an explicit Suspense
 * boundary. If no app is registered (Phase 0 boot before
 * `registerAllPlaceholderApps()` ran, or a typo'd appId) we render a small
 * inline notice rather than crash the whole layer.
 */
function AppBody({ window: w, appId, app }: AppBodyProps) {
  if (!app) {
    return (
      <div
        data-testid="window-missing-app"
        className="flex h-full w-full items-center justify-center bg-os-window p-4 text-sm text-os-ink-muted"
      >
        No app registered for <code className="ml-1">{appId}</code>.
      </div>
    );
  }
  // The registry's `Component` type narrows per-AppId. Because `appId` here
  // is the union `AppId`, TS can't pick a single overload — we cast to a
  // permissive component type for the JSX. Per-app type safety is enforced
  // at registration time via `RegisteredApp<K>`.
  const Component = app.Component as unknown as React.ComponentType<
    AppComponentProps<AppId>
  >;
  return (
    <Suspense
      fallback={
        <div
          data-testid="window-loading"
          className="flex h-full w-full items-center justify-center bg-os-window text-xs text-os-ink-muted"
        >
          Loading…
        </div>
      }
    >
      <Component
        windowId={w.id}
        appProps={w.appProps as AppComponentProps<AppId>["appProps"]}
        resumeId={w.resumeId}
      />
    </Suspense>
  );
}

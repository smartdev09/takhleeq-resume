/**
 * `<Dock>` — the always-rendered bottom bar (plan §4.5).
 *
 * Mission brief: render even when there are no windows open so the user has
 * a stable surface that confirms the OS is alive ("no windows open" state),
 * rather than disappearing the dock.
 *
 * Layout:
 *  - Left zone: one `<WindowChip>` per open window, in z-order (oldest →
 *    newest left → right reads naturally).
 *  - Right zone: the `<ActiveResumeIndicator>` (which itself shows the sync
 *    indicator). Auth lives in the top menu bar.
 *
 * Per the mission brief the dock is `position: fixed; bottom: 0`. Height is
 * driven by the `--os-dock-height` CSS variable.
 */

"use client";

import { useCallback, useMemo } from "react";
import { cn } from "lib/utils";

import { getApp } from "../apps/app-registry";
import type { AppId, RegisteredApp } from "../apps/app-types";
import { useWindowManager } from "../context/use-window-manager";
import { ActiveResumeIndicator } from "./ActiveResumeIndicator";
import { WindowChip } from "./WindowChip";

export function Dock() {
  const { state, controls, dispatch } = useWindowManager();

  // Render windows in zOrder (oldest first → newest last). zOrder excludes
  // minimized windows from its tail; we splice minimized windows back in at
  // the end of the dock list so the user can always reach them.
  const orderedIds = useMemo(() => {
    const visible = state.zOrder.slice();
    const minimized = Object.keys(state.windows).filter(
      (id) => state.windows[id].status === "minimized",
    );
    return [...visible, ...minimized];
  }, [state.windows, state.zOrder]);

  const focusedId = state.zOrder[state.zOrder.length - 1];

  const handleFocus = useCallback(
    (id: string) => controls.focusWindow(id),
    [controls],
  );
  const handleClose = useCallback(
    (id: string) => controls.closeWindow(id),
    [controls],
  );
  const handleMinimize = useCallback(
    (id: string) => dispatch({ type: "MINIMIZE", id }),
    [dispatch],
  );
  const handleRestore = useCallback(
    (id: string) => dispatch({ type: "RESTORE", id }),
    [dispatch],
  );

  return (
    <footer
      data-testid="os-dock"
      role="contentinfo"
      aria-label="Window dock"
      className={cn(
        "fixed inset-x-0 bottom-0 z-[1000] flex items-center justify-between gap-3 border-t border-os-window-border px-3 backdrop-blur",
        "bg-os-dock",
      )}
      style={{ height: "var(--os-dock-height)" }}
    >
      <div
        data-testid="os-dock-chips"
        className="flex flex-1 items-center gap-2 overflow-x-auto"
      >
        {orderedIds.length === 0 ? (
          <span
            data-testid="os-dock-empty"
            className="text-xs text-os-ink-muted"
          >
            No windows open — click an icon to launch.
          </span>
        ) : (
          orderedIds.map((id) => {
            const w = state.windows[id];
            if (!w) return null;
            const app = getApp(w.appId) as RegisteredApp<AppId> | undefined;
            return (
              <WindowChip
                key={id}
                window={w}
                app={app}
                isFocused={id === focusedId}
                onFocus={handleFocus}
                onClose={handleClose}
                onMinimize={handleMinimize}
                onRestore={handleRestore}
              />
            );
          })
        )}
      </div>
      <ActiveResumeIndicator />
    </footer>
  );
}

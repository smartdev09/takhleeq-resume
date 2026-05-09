/**
 * `<Desktop>` — the wallpaper + ambient art + icon grid surface that fills
 * the viewport between the top menu bar and the bottom dock.
 *
 * The viewport listener for `VIEWPORT_RESIZED` lives in
 * `WindowManagerProvider`, so this component does NOT add another resize
 * handler — that would double-fire reducer dispatches.
 *
 * Layout responsibilities:
 *  - establish the absolute-positioning context for icons + windows.
 *  - reserve space for the top menu bar and bottom dock so icons / windows
 *    don't overlap them. The `<WindowsLayer>` is rendered as a sibling
 *    inside `<OSRoot>` so it can sit on top of the desktop area without
 *    intercepting wallpaper / icon clicks.
 */

"use client";

import { type ReactNode } from "react";

import { AmbientArt } from "./AmbientArt";
import { DesktopIconGrid } from "./DesktopIconGrid";
import { Wallpaper } from "./Wallpaper";

export interface DesktopProps {
  /**
   * Children render in the top-level positioning context (z-index above
   * wallpaper but below windows). Used by `<OSRoot>` to inject the
   * `<WindowsLayer>` and any boot toasts.
   */
  children?: ReactNode;
}

export function Desktop({ children }: DesktopProps) {
  return (
    <div
      data-testid="os-desktop"
      role="presentation"
      className="absolute inset-0 overflow-hidden"
      style={{
        paddingTop: "var(--os-menu-bar-height)",
        paddingBottom: "var(--os-dock-height)",
      }}
    >
      <Wallpaper />
      <AmbientArt />
      {/* Inset container reserves the desktop region (between menu bar + dock). */}
      <div
        data-testid="os-desktop-surface"
        className="absolute"
        style={{
          top: "var(--os-menu-bar-height)",
          bottom: "var(--os-dock-height)",
          left: 0,
          right: 0,
        }}
      >
        <DesktopIconGrid />
        {children}
      </div>
    </div>
  );
}

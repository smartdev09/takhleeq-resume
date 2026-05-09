/**
 * `<OSRoot>` — the entry point of the OS shell.
 *
 * Mounts (top-down):
 *   <WindowManagerProvider>
 *     <Desktop />          // wallpaper + ambient art + icon grid
 *     <TopMenuBar />       // 36px fixed top
 *     <Dock />             // 56px fixed bottom
 *     <WindowsLayer />     // every open window, in z-order
 *   </WindowManagerProvider>
 *
 * Registry bootstrap is synchronous in `./apps/bootstrap-os-registry.ts`
 * (placeholders first, then real apps). Do not add a second
 * `registerAllPlaceholderApps()` call here — it would overwrite the real
 * `registerApp` entries and bring back `PlaceholderApp` bodies.
 *
 * Tooltip provider: each chrome subcomponent provides its own
 * `Tooltip.Provider` because nesting Radix tooltip providers is harmless and
 * lets us keep ownership scoped. (No global provider here.)
 */

"use client";

import { useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";

import { store } from "lib/redux/store";
import "./apps/bootstrap-os-registry";
import { WindowManagerProvider } from "./context/WindowManagerProvider";
import { Desktop } from "./Desktop/Desktop";
import { Dock } from "./Dock/Dock";
import { TopMenuBar } from "./TopMenuBar/TopMenuBar";
import { WindowsLayer } from "./WindowsLayer";

export function OSRoot() {
  // Apply the warm wallpaper background to the html/body so the desktop
  // overflow paints correctly even on bounce-scroll. We restore on unmount
  // so navigating away doesn't leave the page tinted.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousBg = document.body.style.background;
    document.body.style.background = "var(--os-wallpaper-base)";
    return () => {
      document.body.style.background = previousBg;
    };
  }, []);

  return (
    <ReduxProvider store={store}>
      <WindowManagerProvider>
        <div
          data-testid="os-root"
          className="relative h-screen w-screen overflow-hidden bg-os-wallpaper text-os-ink"
        >
          <Desktop />
          <TopMenuBar />
          <Dock />
          <WindowsLayer />
        </div>
      </WindowManagerProvider>
    </ReduxProvider>
  );
}

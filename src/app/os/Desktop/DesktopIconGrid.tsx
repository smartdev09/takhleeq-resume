/**
 * `<DesktopIconGrid>` — reads the app registry, splits desktop-eligible apps
 * by `desktopColumn`, and lays them out absolutely on the desktop area.
 *
 * Layout (plan §4.4 + §7):
 *  - Desktop ≥ 768px: two columns hugging left and right edges, each a
 *    vertical stack with consistent spacing.
 *  - Mobile (≤ 768px): both columns flatten into a single 2-column grid that
 *    scrolls vertically. The plan calls for 2 columns specifically so this is
 *    `grid-cols-2` rather than the 1-col stacking the small viewport size
 *    might naturally suggest.
 *
 * The grid is wrapped by `<Desktop>` which sets up the `relative` positioning
 * context. Each `<DesktopIcon>` calls `controls.openWindow` via its `onOpen`
 * callback — the grid is the only place that knows about the manager.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

import { listDesktopApps } from "../apps/app-registry";
import type { AppId, RegisteredApp } from "../apps/app-types";
import { useWindowManager } from "../context/use-window-manager";
import { DesktopIcon } from "./DesktopIcon";

interface ColumnApps {
  left: RegisteredApp<AppId>[];
  right: RegisteredApp<AppId>[];
}

function partition(apps: ReadonlyArray<RegisteredApp<AppId>>): ColumnApps {
  const left: RegisteredApp<AppId>[] = [];
  const right: RegisteredApp<AppId>[] = [];
  for (const a of apps) {
    if (a.desktopColumn === "right") right.push(a);
    else left.push(a);
  }
  return { left, right };
}

export function DesktopIconGrid() {
  const { state, controls } = useWindowManager();
  const [apps, setApps] = useState<ReadonlyArray<RegisteredApp<AppId>>>(() =>
    listDesktopApps(),
  );

  // The registry is populated synchronously on first import in production;
  // in tests it can change between renders, so we re-read once after mount
  // to pick up any seedRegistry() that ran after the initial render.
  useEffect(() => {
    setApps(listDesktopApps());
  }, []);

  const { left, right } = partition(apps);
  const isFirstVisit = !state.hasShownWelcome;

  const handleOpen = useCallback(
    (appId: AppId) => {
      controls.openWindow({ appId, focusIfExists: true });
    },
    [controls],
  );

  const handleFirstActivation = useCallback(() => {
    if (!state.hasShownWelcome) controls.markWelcomeShown();
  }, [controls, state.hasShownWelcome]);

  return (
    <Tooltip.Provider delayDuration={400}>
      {/* Mobile / narrow: single 2-col grid below the menu bar. */}
      <div
        data-testid="desktop-icon-grid-mobile"
        className="absolute inset-x-2 top-2 grid grid-cols-2 gap-3 overflow-y-auto pb-24 md:hidden"
        style={{
          // Account for the menu bar height; the grid itself starts below it.
          maxHeight: "calc(100vh - var(--os-menu-bar-height) - var(--os-dock-height))",
        }}
      >
        {[...left, ...right].map((app) => (
          <div key={app.appId} className="flex justify-center">
            <DesktopIcon
              app={app}
              isFirstVisit={isFirstVisit}
              onOpen={handleOpen}
              onFirstActivation={handleFirstActivation}
            />
          </div>
        ))}
      </div>

      {/* Desktop / wide: two anchored columns hugging the edges. */}
      <div
        data-testid="desktop-icon-grid-left"
        className="absolute left-3 top-3 hidden flex-col gap-3 md:flex"
      >
        {left.map((app) => (
          <DesktopIcon
            key={app.appId}
            app={app}
            isFirstVisit={isFirstVisit}
            onOpen={handleOpen}
            onFirstActivation={handleFirstActivation}
          />
        ))}
      </div>
      <div
        data-testid="desktop-icon-grid-right"
        className="absolute right-3 top-3 hidden flex-col gap-3 md:flex"
      >
        {right.map((app) => (
          <DesktopIcon
            key={app.appId}
            app={app}
            isFirstVisit={isFirstVisit}
            onOpen={handleOpen}
            onFirstActivation={handleFirstActivation}
          />
        ))}
      </div>
    </Tooltip.Provider>
  );
}

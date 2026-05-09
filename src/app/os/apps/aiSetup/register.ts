/**
 * Registers the real `aiSetup` app, overriding the placeholder shipped in
 * Phase 0/2. Phase 4's master `register-real-apps.ts` should import this
 * barrel.
 */

"use client";

import { lazy } from "react";
import { CpuChipIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"aiSetup">({
  appId: "aiSetup",
  title: (_props: AppPropsMap["aiSetup"]) => "AI Setup",
  icon: CpuChipIcon,
  desktopLabel: "AI Setup",
  defaultSize: { width: 640, height: 600 },
  minSize: { width: 460, height: 420 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 4,
  Component: lazy(() => import("./AiSetupApp")),
});

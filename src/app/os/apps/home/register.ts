/**
 * Registers the real `home` app, overriding the placeholder shipped in
 * Phase 0/2. Importing this module has the side effect of swapping the
 * registered component — Phase 4's master `register-real-apps.ts` should
 * import this barrel alongside the other content-app registers.
 */

import { lazy } from "react";
import { HomeIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

const SCROLL_ANCHORS = [
  { id: "hero", label: "Hero" },
  { id: "features", label: "Features" },
  { id: "steps", label: "Steps" },
  { id: "faq", label: "FAQ" },
] as const;

registerApp<"home">({
  appId: "home",
  title: (_props: AppPropsMap["home"]) => "home.md — Takhleeq",
  icon: HomeIcon,
  desktopLabel: "home.md",
  defaultSize: { width: 900, height: 620 },
  minSize: { width: 480, height: 380 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "left",
  desktopOrder: 0,
  scrollAnchors: SCROLL_ANCHORS,
  Component: lazy(() => import("./HomeApp")),
});

/**
 * Registers the real `help` app, overriding the placeholder. Phase 4 imports
 * this module from the central `register-real-apps.ts` barrel.
 */

import { lazy } from "react";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

const SCROLL_ANCHORS = [
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "faq", label: "FAQ" },
] as const;

registerApp<"help">({
  appId: "help",
  title: (_props: AppPropsMap["help"]) => "Help & Shortcuts",
  icon: AcademicCapIcon,
  desktopLabel: "Help",
  defaultSize: { width: 760, height: 600 },
  minSize: { width: 480, height: 360 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 5,
  scrollAnchors: SCROLL_ANCHORS,
  Component: lazy(() => import("./HelpApp")),
});

/**
 * Registers the real `docs` app, overriding the placeholder. Phase 4 imports
 * this module from the central `register-real-apps.ts` barrel.
 */

import { lazy } from "react";
import { BookOpenIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

const SCROLL_ANCHORS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "ai-setup", label: "AI Setup" },
  { id: "templates-guide", label: "Templates Guide" },
  { id: "shortcuts", label: "Shortcuts" },
] as const;

registerApp<"docs">({
  appId: "docs",
  title: (_props: AppPropsMap["docs"]) => "Docs — OpenResume",
  icon: BookOpenIcon,
  desktopLabel: "Docs",
  defaultSize: { width: 900, height: 620 },
  minSize: { width: 480, height: 360 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: false,
  scrollAnchors: SCROLL_ANCHORS,
  Component: lazy(() => import("./DocsApp")),
});

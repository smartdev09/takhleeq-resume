/**
 * Registers the real `community` app, overriding the placeholder. Phase 4
 * imports this module from the central `register-real-apps.ts` barrel.
 */

import { lazy } from "react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"community">({
  appId: "community",
  title: (_props: AppPropsMap["community"]) => "Community — Takhleeq",
  icon: ChatBubbleLeftRightIcon,
  desktopLabel: "Community",
  defaultSize: { width: 760, height: 600 },
  minSize: { width: 480, height: 380 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: false,
  Component: lazy(() => import("./CommunityApp")),
});

/**
 * Registers the real `trash` app, overriding the placeholder.
 */

import { lazy } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"trash">({
  appId: "trash",
  title: (_props: AppPropsMap["trash"]) => "Trash",
  icon: TrashIcon,
  desktopLabel: "Trash",
  defaultSize: { width: 520, height: 440 },
  minSize: { width: 360, height: 280 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "left",
  desktopOrder: 3,
  Component: lazy(() => import("./TrashApp")),
});

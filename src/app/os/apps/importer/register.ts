/**
 * Module-side-effect registration for the Importer app.
 */

import { lazy } from "react";
import { ArrowDownOnSquareIcon } from "@heroicons/react/24/outline";

import { registerApp } from "../app-registry";

registerApp<"importer">({
  appId: "importer",
  title: () => "Import Resume",
  icon: ArrowDownOnSquareIcon,
  desktopLabel: "Import Resume",
  defaultSize: { width: 640, height: 520 },
  minSize: { width: 420, height: 360 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 0,
  Component: lazy(() => import("./ImporterApp")),
});

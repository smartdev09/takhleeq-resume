/**
 * Module-side-effect registration for the My Resumes folder app.
 *
 * Importing this file (via `register-real-apps.ts`) registers the real
 * `myResumes` component, overwriting the placeholder entry seeded by
 * `register-placeholders.ts`.
 */

import { lazy } from "react";
import { FolderIcon } from "@heroicons/react/24/outline";

import { registerApp } from "../app-registry";

registerApp<"myResumes">({
  appId: "myResumes",
  title: () => "My Resumes",
  icon: FolderIcon,
  desktopLabel: "My Resumes",
  defaultSize: { width: 880, height: 620 },
  minSize: { width: 480, height: 360 },
  defaultPosition: "center",
  bind: "standalone",
  showOnDesktop: true,
  desktopColumn: "left",
  desktopOrder: 1,
  Component: lazy(() => import("./MyResumesApp")),
});

/**
 * Registers the real `jobMatcher` app, overriding the placeholder shipped
 * in Phase 0/2. `popOutOf` declares the parent editor + tab id so URL
 * deserialisation can re-establish the parent/child relationship.
 *
 * Job Matcher is also launchable standalone from the desktop (plan §5.7) so
 * `showOnDesktop` is true; the in-app picker prompts for a target resume
 * when none is supplied.
 */

import { lazy } from "react";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"jobMatcher">({
  appId: "jobMatcher",
  title: (_props: AppPropsMap["jobMatcher"], resumeName) =>
    resumeName ? `Job Matcher — ${resumeName}` : "Job Matcher",
  icon: ArrowsRightLeftIcon,
  desktopLabel: "Job Matcher",
  defaultSize: { width: 880, height: 680 },
  minSize: { width: 560, height: 460 },
  defaultPosition: "center",
  bind: "resume",
  popOutOf: { parentAppId: "editor", tabId: "jobMatcher" },
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 3,
  Component: lazy(() => import("./JobMatcherApp")),
});

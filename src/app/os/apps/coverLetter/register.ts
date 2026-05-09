/**
 * Registers the real `coverLetter` app, overriding the placeholder shipped
 * in Phase 0/2. `popOutOf` declares the parent editor + tab id so URL
 * deserialisation can re-establish the parent/child relationship.
 *
 * Cover letters require a resume to make sense (plan §5.6) so this app is
 * intentionally NOT shown on the desktop — it is only launchable from the
 * editor's Cover Letter tab pop-out icon.
 */

import { lazy } from "react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"coverLetter">({
  appId: "coverLetter",
  title: (_props: AppPropsMap["coverLetter"], resumeName) =>
    resumeName ? `Cover Letter — ${resumeName}` : "Cover Letter",
  icon: EnvelopeIcon,
  desktopLabel: "Cover Letter",
  defaultSize: { width: 760, height: 640 },
  minSize: { width: 480, height: 420 },
  defaultPosition: "center",
  bind: "resume",
  popOutOf: { parentAppId: "editor", tabId: "coverLetter" },
  showOnDesktop: false,
  Component: lazy(() => import("./CoverLetterApp")),
});

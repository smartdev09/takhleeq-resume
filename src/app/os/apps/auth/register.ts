/**
 * Registers the real `auth` app, overriding the placeholder shipped in
 * Phase 0/2. Importing this module has the side effect of swapping the
 * registered component — Phase 4's master `register-real-apps.ts` should
 * import this barrel.
 *
 * Modality: registered with `isModal: true` so download-triggered opens
 * inert sibling windows. The body renders a "Close anytime" link when
 * `appProps.trigger !== 'download'` so the proactive case stays escapable.
 * See `AuthApp.tsx` for the trade-off note.
 */

"use client";

import { lazy } from "react";
import { StarIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"auth">({
  appId: "auth",
  title: (_props: AppPropsMap["auth"]) => "Sign in & Star",
  icon: StarIcon,
  desktopLabel: "Star on GitHub",
  defaultSize: { width: 540, height: 520 },
  minSize: { width: 380, height: 360 },
  defaultPosition: "center",
  bind: "standalone",
  isModal: true,
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 6,
  Component: lazy(() => import("./AuthApp")),
});

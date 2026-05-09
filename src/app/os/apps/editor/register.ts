/**
 * Registers the real `editor` app, overriding the placeholder shipped in
 * Phase 0/2. Phase 4's master `register-real-apps.ts` should import this
 * module alongside the other tool-suite registers (analyzer, coverLetter,
 * jobMatcher).
 *
 * Title resolves to "<resume name> — Resume Editor" when the resume name is
 * known (passed in by the WindowsLayer at render time); otherwise just
 * "Resume Editor". The window manager passes the live `state.windows[id]`
 * fields into the title function, so renames reflow the title bar without
 * a remount.
 */

import { lazy } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"editor">({
  appId: "editor",
  title: (_props: AppPropsMap["editor"], resumeName) =>
    resumeName ? `${resumeName} — Resume Editor` : "Resume Editor",
  icon: PencilSquareIcon,
  desktopLabel: "Editor",
  defaultSize: { width: 1100, height: 750 },
  minSize: { width: 720, height: 480 },
  defaultPosition: "center",
  bind: "resume",
  showOnDesktop: false,
  Component: lazy(() => import("./EditorApp")),
});

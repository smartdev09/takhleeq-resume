/**
 * Registers the real `analyzer` app, overriding the placeholder shipped in
 * Phase 0/2. The analyzer is both a popped-out variant of the editor's
 * Analyzer tab and a standalone desktop app — `popOutOf` declares the
 * editor linkage so URL deserialisation can re-establish the parent/child
 * relationship.
 */

import { lazy } from "react";
import { PuzzlePieceIcon } from "@heroicons/react/24/outline";

import { registerApp } from "os/apps/app-registry";
import type { AppPropsMap } from "os/apps/app-types";

registerApp<"analyzer">({
  appId: "analyzer",
  title: (_props: AppPropsMap["analyzer"], resumeName) =>
    resumeName ? `Analyzer — ${resumeName}` : "AI Analyzer",
  icon: PuzzlePieceIcon,
  desktopLabel: "AI Analyzer",
  defaultSize: { width: 760, height: 620 },
  minSize: { width: 480, height: 420 },
  defaultPosition: "center",
  bind: "resume",
  popOutOf: { parentAppId: "editor", tabId: "analyzer" },
  showOnDesktop: true,
  desktopColumn: "right",
  desktopOrder: 2,
  Component: lazy(() => import("./AnalyzerApp")),
});

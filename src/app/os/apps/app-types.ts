/**
 * App registry contract.
 *
 * Each "app" on the desktop (home, editor, analyzer, ...) is a function module
 * that registers its metadata and component here. The desktop, top menu bar,
 * dock, and URL serializer all read from APP_REGISTRY — there are no scattered
 * string literals for app identifiers anywhere else.
 */

import type { ComponentType, LazyExoticComponent } from "react";
import type { Position, Size, WindowId } from "../context/window-types";

export type AppId =
  | "home"
  | "editor"
  | "analyzer"
  | "jobMatcher"
  | "coverLetter"
  | "templates"
  | "myResumes"
  | "parser"
  | "importer"
  | "docs"
  | "help"
  | "auth"
  | "community"
  | "aiSetup"
  | "searchPalette"
  | "trash";

/**
 * Per-app props map. Adding an app means adding an entry here AND a
 * corresponding entry in APP_REGISTRY — TypeScript enforces the link.
 */
export interface AppPropsMap {
  home: { initialAnchor?: string };
  editor: { resumeId: string };
  analyzer: { resumeId?: string };
  jobMatcher: { resumeId?: string; initialJobDescription?: string };
  coverLetter: { resumeId: string };
  templates: { categoryId?: string; templateId?: string };
  myResumes: Record<string, never>;
  parser: Record<string, never>;
  importer: Record<string, never>;
  docs: { initialAnchor?: string };
  help: { initialAnchor?: string };
  auth: { trigger?: "download" | "proactive"; returnAction?: string };
  community: Record<string, never>;
  aiSetup: Record<string, never>;
  searchPalette: Record<string, never>;
  trash: Record<string, never>;
}

export interface PositionContext {
  desktop: Size;
  /** Number of currently open windows of this app — for cascade offsets. */
  sameAppOpen: number;
  /** Existing windows so the position function can avoid overlap if it wants. */
  existing: ReadonlyArray<{ position: Position; size: Size }>;
}

export type DefaultPosition =
  | "center"
  | "topCenter"
  | ((ctx: PositionContext) => Position);

/** What the registry knows about each app. */
export interface RegisteredApp<TPropsKey extends AppId = AppId> {
  appId: TPropsKey;
  /** Human title used in title bar / dock chip. */
  title: (props: AppPropsMap[TPropsKey], resumeName?: string) => string;
  /** Icon shown on the desktop. Heroicon or custom component. */
  icon: ComponentType<{ className?: string }>;
  /** Shorter label shown beneath the desktop icon. */
  desktopLabel: string;
  defaultSize: Size;
  minSize: Size;
  defaultPosition: DefaultPosition;
  /** Modal-typed windows block sibling interaction. */
  isModal?: boolean;
  /** Whether this app needs a resume to make sense. */
  bind: "resume" | "standalone";
  /** For popped-out tool apps: which parent app + tab they came from. */
  popOutOf?: { parentAppId: AppId; tabId: string };
  /** Anchors inside the window body for scroll-to-section behavior. */
  scrollAnchors?: ReadonlyArray<{ id: string; label: string }>;
  /** Lazy-loaded component. */
  Component: LazyExoticComponent<ComponentType<AppComponentProps<TPropsKey>>>;
  /**
   * Whether this app should appear as a desktop icon (vs. only being
   * launchable from menus or programmatically).
   */
  showOnDesktop: boolean;
  /**
   * Visual layout column when shown on the desktop.
   */
  desktopColumn?: "left" | "right";
  /** Sort weight within its column (lower = higher up). */
  desktopOrder?: number;
}

export interface AppComponentProps<TKey extends AppId = AppId> {
  windowId: WindowId;
  appProps: AppPropsMap[TKey];
  resumeId?: string;
}

/** Type-safe registry lookup. Phase 3 populates the actual component refs. */
export type AppRegistry = {
  [K in AppId]: RegisteredApp<K>;
};

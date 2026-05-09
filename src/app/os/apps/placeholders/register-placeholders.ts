/**
 * Registers a placeholder entry for every `AppId` so the desktop, top menu
 * bar, and dock can call `controls.openWindow(appId)` end-to-end during
 * Phase 2 — before any real app component exists.
 *
 * Phase 3 simply calls `registerApp` again for the same id with the real
 * component; the registry warns on duplicates in dev but the new entry
 * wins. This keeps the boot path identical between Phase 2 and Phase 3
 * and means no chrome code needs to change when apps come online.
 *
 * The registration is performed in a side-effect-free function (not at
 * module import) so tests can reset and re-seed the registry between
 * The production boot path is `bootstrap-os-registry.ts` (placeholders, then
 * this barrel via `require`). Tests may import `register-real-apps` alone
 * when they skip placeholders.
 */

import { createElement, lazy, type ComponentType } from "react";

import {
  AcademicCapIcon,
  ArrowDownOnSquareIcon,
  ArrowsRightLeftIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  FolderIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import type { AppComponentProps, AppId, RegisteredApp } from "../app-types";
import { registerApp } from "../app-registry";

interface PlaceholderMeta {
  label: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  bind: "resume" | "standalone";
  showOnDesktop: boolean;
  desktopColumn?: "left" | "right";
  desktopOrder?: number;
  isModal?: boolean;
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  scrollAnchors?: ReadonlyArray<{ id: string; label: string }>;
  popOutOf?: { parentAppId: AppId; tabId: string };
}

/**
 * Per-app metadata. Keep labels short — they go beneath desktop icons and
 * inside dock chips, both of which truncate aggressively.
 */
const META: Record<AppId, PlaceholderMeta> = {
  home: {
    label: "home.md",
    title: "home.md — Takhleeq",
    icon: HomeIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "left",
    desktopOrder: 0,
    defaultSize: { width: 900, height: 600 },
    scrollAnchors: [
      { id: "hero", label: "Hero" },
      { id: "features", label: "Features" },
      { id: "steps", label: "Steps" },
      { id: "faq", label: "FAQ" },
    ],
  },
  myResumes: {
    label: "My Resumes",
    title: "My Resumes",
    icon: FolderIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "left",
    desktopOrder: 1,
    defaultSize: { width: 800, height: 600 },
  },
  templates: {
    label: "Templates",
    title: "Templates",
    icon: DocumentDuplicateIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "left",
    desktopOrder: 2,
    defaultSize: { width: 900, height: 620 },
  },
  trash: {
    label: "Trash",
    title: "Trash",
    icon: TrashIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "left",
    desktopOrder: 3,
  },
  importer: {
    label: "Import Resume",
    title: "Import Resume",
    icon: ArrowDownOnSquareIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 0,
  },
  parser: {
    label: "Resume Parser",
    title: "Resume Parser",
    icon: CodeBracketSquareIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 1,
  },
  analyzer: {
    label: "AI Analyzer",
    title: "AI Analyzer",
    icon: PuzzlePieceIcon,
    bind: "resume",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 2,
    popOutOf: { parentAppId: "editor", tabId: "analyzer" },
  },
  jobMatcher: {
    label: "Job Matcher",
    title: "Job Matcher",
    icon: ArrowsRightLeftIcon,
    bind: "resume",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 3,
    popOutOf: { parentAppId: "editor", tabId: "jobMatcher" },
  },
  aiSetup: {
    label: "AI Setup",
    title: "AI Setup",
    icon: CpuChipIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 4,
  },
  help: {
    label: "Help",
    title: "Help & Shortcuts",
    icon: AcademicCapIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 5,
    scrollAnchors: [
      { id: "shortcuts", label: "Keyboard shortcuts" },
      { id: "faq", label: "FAQ" },
    ],
  },
  auth: {
    label: "Star on GitHub",
    title: "Sign in & Star",
    icon: StarIcon,
    bind: "standalone",
    showOnDesktop: true,
    desktopColumn: "right",
    desktopOrder: 6,
    isModal: false,
    defaultSize: { width: 480, height: 420 },
  },
  editor: {
    label: "Editor",
    title: "Resume Editor",
    icon: PencilSquareIcon,
    bind: "resume",
    showOnDesktop: false,
    defaultSize: { width: 1100, height: 750 },
    minSize: { width: 720, height: 480 },
  },
  coverLetter: {
    label: "Cover Letter",
    title: "Cover Letter",
    icon: EnvelopeIcon,
    bind: "resume",
    showOnDesktop: false,
    popOutOf: { parentAppId: "editor", tabId: "coverLetter" },
  },
  docs: {
    label: "Docs",
    title: "Docs",
    icon: BookOpenIcon,
    bind: "standalone",
    showOnDesktop: false,
    defaultSize: { width: 900, height: 620 },
    scrollAnchors: [
      { id: "getting-started", label: "Getting Started" },
      { id: "ai-setup", label: "AI Setup" },
      { id: "templates-guide", label: "Templates Guide" },
      { id: "shortcuts", label: "Shortcuts" },
    ],
  },
  community: {
    label: "Community",
    title: "Community",
    icon: ChatBubbleLeftRightIcon,
    bind: "standalone",
    showOnDesktop: false,
  },
  searchPalette: {
    label: "Search",
    title: "Search",
    icon: MagnifyingGlassIcon,
    bind: "standalone",
    showOnDesktop: false,
    defaultSize: { width: 560, height: 360 },
  },
};

const ALL_APP_IDS: ReadonlyArray<AppId> = Object.keys(META) as AppId[];

/**
 * Build a per-app lazy component that injects the friendly label + scroll
 * anchors into the generic `PlaceholderApp` body. Each `AppId` gets its own
 * lazy boundary so React's `Suspense` boundary at the WindowsLayer treats
 * each app as a separate code split — same shape Phase 3 will produce.
 */
function buildLazyForApp<K extends AppId>(
  appId: K,
  m: PlaceholderMeta,
): RegisteredApp<K>["Component"] {
  const lazyComponent = lazy(async () => {
    const mod = await import("./PlaceholderApp");
    const Inner = mod.default;
    function PlaceholderForApp(props: AppComponentProps<K>) {
      return createElement(Inner, {
        ...props,
        anchors: m.scrollAnchors,
        label: m.title,
      });
    }
    PlaceholderForApp.displayName = `Placeholder(${appId})`;
    return { default: PlaceholderForApp };
  });
  return lazyComponent as RegisteredApp<K>["Component"];
}

/**
 * Idempotent: safe to call from both `OSRoot.tsx` (production) and tests.
 * The underlying `registerApp` warns once per duplicate in dev mode but
 * accepts the new entry; this means Phase 3 components naturally override
 * the placeholder when they import their app module.
 */
export function registerAllPlaceholderApps(): void {
  for (const appId of ALL_APP_IDS) {
    const m = META[appId];
    const titleFn: RegisteredApp<typeof appId>["title"] = (
      _props,
      resumeName,
    ) => (resumeName ? `${m.title} — ${resumeName}` : m.title);
    registerApp({
      appId,
      title: titleFn,
      icon: m.icon,
      desktopLabel: m.label,
      defaultSize: m.defaultSize ?? { width: 700, height: 550 },
      minSize: m.minSize ?? { width: 360, height: 240 },
      defaultPosition: "center",
      bind: m.bind,
      isModal: m.isModal,
      popOutOf: m.popOutOf,
      scrollAnchors: m.scrollAnchors,
      showOnDesktop: m.showOnDesktop,
      desktopColumn: m.desktopColumn,
      desktopOrder: m.desktopOrder,
      Component: buildLazyForApp(appId, m),
    });
  }
}

/**
 * Helper used by the SearchPalette / TopMenuBar to enumerate the launchable
 * apps in a deterministic order (desktop-visible apps first by their column +
 * order, then everything else).
 */
export function listAllPlaceholderIds(): ReadonlyArray<AppId> {
  return ALL_APP_IDS;
}

// Defensive type guard so TypeScript catches an `AppId` enum that grows
// without a corresponding `META` entry.
type _ExhaustiveCheck = AppId extends keyof typeof META ? true : never;
const _exhaustive: _ExhaustiveCheck = true;
void _exhaustive;

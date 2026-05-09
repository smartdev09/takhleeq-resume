/**
 * `<TopMenuBar>` — the always-visible 36px chrome at the top of the OS
 * (plan §4.2). Built on `@radix-ui/react-menubar` so keyboard nav, ARIA
 * roles, and focus trapping are handled (plan §17).
 *
 * Item behavior — every entry calls `controls.openWindow(...)` (or sets a
 * scroll anchor on an existing window). NOTHING navigates the page.
 *
 * Right side:
 *  - `Star us — free` orange CTA → opens `auth` window (proactive variant).
 *  - Search icon → opens command palette (also bound to Cmd/Ctrl-K).
 *  - Notifications bell → no-op stub for Phase 2; Phase 3 wires the panel.
 *  - `<OSAuthIndicator>` slot for the avatar / sign-in button.
 *
 * The menu bar itself uses `position: fixed; top: 0; height: 36px` per the
 * mission brief. `z-index: 1000` keeps it above windows but below modals
 * (which boost by `MODAL_Z_BOOST = 100_000`).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import {
  BellIcon,
  MagnifyingGlassIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

import type { AppId } from "../apps/app-types";
import { useWindowManager } from "../context/use-window-manager";
import { OSAuthIndicator } from "./AuthIndicator";
import { SearchPalette } from "./SearchPalette";

interface MenuChoice {
  label: string;
  /** appId to open. */
  appId: AppId;
  /** Optional in-window scroll anchor. */
  anchor?: string;
}

interface MenuGroup {
  label: string;
  testId?: string;
  /** Items in this dropdown. Subset of menus use a single trigger w/ no items. */
  items?: MenuChoice[];
}

const MENUS: MenuGroup[] = [
  {
    label: "File",
    testId: "menu-file",
    items: [
      { label: "New Resume", appId: "editor" },
      { label: "Open My Resumes", appId: "myResumes" },
      { label: "Import Resume", appId: "importer" },
    ],
  },
  {
    label: "Editor",
    testId: "menu-editor",
    items: [{ label: "Open editor", appId: "editor" }],
  },
  {
    label: "Templates",
    testId: "menu-templates",
    items: [{ label: "Browse templates", appId: "templates" }],
  },
  {
    label: "Tools",
    testId: "menu-tools",
    items: [
      { label: "AI Analyzer", appId: "analyzer" },
      { label: "Job Matcher", appId: "jobMatcher" },
      { label: "Resume Parser", appId: "parser" },
      { label: "Importer", appId: "importer" },
    ],
  },
  {
    label: "Docs",
    testId: "menu-docs",
    items: [
      { label: "Getting Started", appId: "docs", anchor: "getting-started" },
      { label: "AI Setup", appId: "docs", anchor: "ai-setup" },
      { label: "Templates Guide", appId: "docs", anchor: "templates-guide" },
      { label: "Shortcuts", appId: "docs", anchor: "shortcuts" },
    ],
  },
  {
    label: "Community",
    testId: "menu-community",
    items: [{ label: "Open community", appId: "community" }],
  },
  {
    label: "More",
    testId: "menu-more",
    items: [
      { label: "Keyboard shortcuts", appId: "help", anchor: "shortcuts" },
      { label: "Changelog", appId: "docs", anchor: "templates-guide" },
      { label: "Privacy", appId: "docs", anchor: "ai-setup" },
      { label: "License", appId: "docs", anchor: "getting-started" },
    ],
  },
  {
    label: "View",
    testId: "menu-view",
    // Reset desktop is handled inline below since it's not an openWindow.
  },
];

export function TopMenuBar() {
  const { state, dispatch, controls } = useWindowManager();
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* ----------------------- open / focus / scroll ----------------------- */

  const openOrFocus = useCallback(
    (choice: MenuChoice) => {
      // If a window for this app already exists, focus it AND set the scroll
      // anchor (plan §4.3). Otherwise open a new window with the anchor.
      const existing = Object.values(state.windows).find(
        (w) => w.appId === choice.appId && !w.parentId,
      );
      if (existing) {
        if (existing.status === "minimized") {
          dispatch({ type: "RESTORE", id: existing.id });
        }
        controls.focusWindow(existing.id);
        if (choice.anchor) {
          dispatch({
            type: "SET_SCROLL_ANCHOR",
            id: existing.id,
            anchor: choice.anchor,
          });
        }
        return;
      }
      controls.openWindow({
        appId: choice.appId,
        scrollAnchor: choice.anchor,
        focusIfExists: true,
      });
    },
    [controls, dispatch, state.windows],
  );

  /* ---------------------------- shortcuts ----------------------------- */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ------------------------------ render ----------------------------- */

  return (
    <>
      <header
        data-testid="os-menu-bar"
        role="banner"
        className={cn(
          "fixed left-0 right-0 top-0 z-[1000] flex items-center justify-between gap-2 border-b border-os-window-border px-2 backdrop-blur",
          "bg-os-menu",
        )}
        style={{ height: "var(--os-menu-bar-height)" }}
      >
        {/* Left side: logo + Radix menubar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="menu-logo"
            onClick={() => openOrFocus({ label: "home", appId: "home" })}
            aria-label="OpenResume — home"
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-os-ink",
              "hover:bg-os-titlebar focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
            )}
          >
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 rounded-sm bg-brand"
            />
            OpenResume
          </button>
          <Menubar.Root className="flex items-center gap-0.5">
            {MENUS.map((menu) => (
              <Menubar.Menu key={menu.label}>
                <Menubar.Trigger
                  data-testid={menu.testId}
                  className={cn(
                    "rounded px-2 py-1 text-sm font-medium text-os-ink",
                    "data-[state=open]:bg-os-titlebar hover:bg-os-titlebar",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
                  )}
                >
                  {menu.label}
                </Menubar.Trigger>
                <Menubar.Portal>
                  <Menubar.Content
                    align="start"
                    sideOffset={4}
                    className="z-[1100] min-w-[200px] rounded-md border border-os-window-border bg-os-window p-1 text-sm shadow-os-window"
                  >
                    {menu.label === "View" ? (
                      <>
                        <MenuItem
                          testId="menu-view-reset"
                          onSelect={() => controls.resetDesktop()}
                        >
                          Reset desktop
                        </MenuItem>
                      </>
                    ) : (
                      menu.items?.map((item) => (
                        <MenuItem
                          key={item.label}
                          testId={`menu-item-${menu.label.toLowerCase()}-${slug(item.label)}`}
                          onSelect={() => openOrFocus(item)}
                        >
                          {item.label}
                          {item.anchor && (
                            <span className="ml-2 text-[10px] uppercase text-os-ink-muted">
                              #{item.anchor}
                            </span>
                          )}
                        </MenuItem>
                      ))
                    )}
                  </Menubar.Content>
                </Menubar.Portal>
              </Menubar.Menu>
            ))}
          </Menubar.Root>
        </div>

        {/* Right side: CTA + search + bell + auth */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="menu-star-cta"
            onClick={() =>
              controls.openWindow({
                appId: "auth",
                appProps: { trigger: "proactive" },
                focusIfExists: true,
              })
            }
            className={cn(
              "flex items-center gap-1.5 rounded-md bg-os-accent px-3 py-1 text-xs font-semibold text-white shadow-sm",
              "hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
            )}
            aria-label="Star us on GitHub — free"
          >
            <StarIcon className="h-3.5 w-3.5" />
            Star us — free
          </button>
          <IconButton
            label="Open search palette"
            testId="menu-search"
            onClick={() => setPaletteOpen(true)}
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Notifications"
            testId="menu-bell"
            onClick={() => {
              /* Phase 2 stub — Phase 3 wires the panel. */
            }}
          >
            <BellIcon className="h-4 w-4" />
          </IconButton>
          <OSAuthIndicator
            onOpenAuth={() =>
              controls.openWindow({
                appId: "auth",
                appProps: { trigger: "proactive" },
                focusIfExists: true,
              })
            }
          />
        </div>
      </header>

      <SearchPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

/* --------------------------- internal pieces --------------------------- */

interface MenuItemProps {
  children: React.ReactNode;
  onSelect: () => void;
  testId?: string;
}

function MenuItem({ children, onSelect, testId }: MenuItemProps) {
  return (
    <Menubar.Item
      data-testid={testId}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm text-os-ink outline-none",
        "data-[highlighted]:bg-brand/10 data-[highlighted]:text-brand",
      )}
    >
      {children}
    </Menubar.Item>
  );
}

interface IconButtonProps {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}

function IconButton({ children, label, onClick, testId }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-os-ink",
        "hover:bg-os-titlebar focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
      )}
    >
      {children}
    </button>
  );
}

function slug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

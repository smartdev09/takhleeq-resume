/**
 * `<SearchPalette>` — Cmd/Ctrl+K spotlight palette (plan §6).
 *
 * Stub implementation per Phase 2 brief: lists every registered app and lets
 * the user open one. Phase 3+ will extend with "open resume <name>" entries
 * pulled from `lib/storage/resume-store.ts`. The structure below leaves
 * obvious extension points for that work.
 *
 * Uses `@radix-ui/react-dialog` for the modal so we get a focus trap, ESC
 * handling, and inert siblings out of the box.
 */

"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

import { listRegisteredApps } from "../apps/app-registry";
import { useWindowManager } from "../context/use-window-manager";
import type { AppId } from "../apps/app-types";

export interface SearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Entry {
  kind: "app";
  appId: AppId;
  label: string;
  hint: string;
}

export function SearchPalette({ open, onOpenChange }: SearchPaletteProps) {
  const { controls } = useWindowManager();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    const apps = listRegisteredApps();
    return apps.map((a) => ({
      kind: "app" as const,
      appId: a.appId,
      label: a.desktopLabel,
      hint: a.title({} as never) ?? a.desktopLabel,
    }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.appId.toLowerCase().includes(q) ||
        e.hint.toLowerCase().includes(q),
    );
  }, [entries, query]);

  // Keep the active index in range when filter results change.
  useEffect(() => {
    setActiveIndex((idx) => Math.min(idx, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Reset query on close so reopening starts fresh.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const activate = useCallback(
    (entry: Entry) => {
      controls.openWindow({ appId: entry.appId, focusIfExists: true });
      onOpenChange(false);
    },
    [controls, onOpenChange],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const target = filtered[activeIndex];
      if (target) activate(target);
    },
    [activate, activeIndex, filtered],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    },
    [filtered.length],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="os-palette-overlay"
          className="fixed inset-0 z-[2000] bg-black/30"
        />
        <Dialog.Content
          data-testid="os-palette"
          aria-label="Open an app or resume"
          className="fixed left-1/2 top-24 z-[2001] w-[min(560px,92vw)] -translate-x-1/2 overflow-hidden rounded-lg border border-os-window-border bg-os-window shadow-os-window"
        >
          <form onSubmit={handleSubmit}>
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <Dialog.Description className="sr-only">
              Type to filter apps and resumes; arrow keys to navigate; Enter to
              open.
            </Dialog.Description>
            <div className="flex items-center gap-2 border-b border-os-window-border px-3">
              <MagnifyingGlassIcon className="h-4 w-4 text-os-ink-muted" />
              <input
                data-testid="os-palette-input"
                autoFocus
                aria-autocomplete="list"
                aria-controls="os-palette-list"
                aria-activedescendant={
                  filtered[activeIndex]
                    ? `os-palette-row-${filtered[activeIndex].appId}`
                    : undefined
                }
                type="search"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search apps and resumes…"
                className="h-10 w-full bg-transparent text-sm text-os-ink outline-none placeholder:text-os-ink-muted"
              />
            </div>
            <ul
              id="os-palette-list"
              role="listbox"
              data-testid="os-palette-list"
              className="max-h-72 overflow-y-auto py-1 text-sm"
            >
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-os-ink-muted">No matches.</li>
              )}
              {filtered.map((entry, idx) => (
                <li
                  key={`${entry.kind}-${entry.appId}`}
                  id={`os-palette-row-${entry.appId}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  data-testid={`os-palette-row-${entry.appId}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    "cursor-pointer px-3 py-2",
                    idx === activeIndex
                      ? "bg-brand/10 text-brand"
                      : "text-os-ink hover:bg-os-titlebar",
                  )}
                  onClick={() => activate(entry)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{entry.label}</span>
                    <span className="text-[11px] uppercase text-os-ink-muted">
                      {entry.kind}
                    </span>
                  </div>
                  <div className="text-xs text-os-ink-muted">{entry.hint}</div>
                </li>
              ))}
            </ul>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * `<ActiveResumeIndicator>` — bottom-right of the dock (plan §4.5).
 *
 * Shows the currently focused resume's name and a chevron dropdown listing
 * every saved resume; selecting one calls `controls.openWindow({ appId:
 * 'editor', resumeId, focusIfExists: true })`.
 *
 * The resume catalog is fetched lazily from `lib/storage/resume-store.ts`
 * (IndexedDB) on first open and refetched on subsequent opens to capture
 * any new resume the user just created.
 *
 * Right side of the chip cluster also renders a small "Saved / Saving…"
 * sync indicator. Auth is handled by the top menu bar, NOT here (mission
 * brief explicitly says so).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

import { useWindowManager } from "../context/use-window-manager";
import {
  listResumes,
  type ResumeRecord,
} from "lib/storage/resume-store";

interface DropdownState {
  open: boolean;
  loading: boolean;
  resumes: ResumeRecord[];
}

const INITIAL_DROPDOWN: DropdownState = {
  open: false,
  loading: false,
  resumes: [],
};

export function ActiveResumeIndicator() {
  const { state, controls } = useWindowManager();
  const [dropdown, setDropdown] = useState<DropdownState>(INITIAL_DROPDOWN);

  const refresh = useCallback(async () => {
    setDropdown((d) => ({ ...d, loading: true }));
    try {
      const all = await listResumes();
      setDropdown((d) => ({ ...d, loading: false, resumes: all }));
    } catch {
      setDropdown((d) => ({ ...d, loading: false, resumes: [] }));
    }
  }, []);

  useEffect(() => {
    if (dropdown.open) void refresh();
  }, [dropdown.open, refresh]);

  // Close on outside click.
  useEffect(() => {
    if (!dropdown.open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-os-active-resume]")) {
        setDropdown((d) => ({ ...d, open: false }));
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdown.open]);

  const activeResume = dropdown.resumes.find(
    (r) => r.id === state.currentResumeId,
  );
  const activeName =
    activeResume?.name ??
    (state.currentResumeId
      ? `Resume ${state.currentResumeId.slice(0, 6)}`
      : "No resume open");

  const handleSelect = useCallback(
    (resumeId: string) => {
      controls.openWindow({
        appId: "editor",
        resumeId,
        appProps: { resumeId },
        focusIfExists: true,
      });
      setDropdown((d) => ({ ...d, open: false }));
    },
    [controls],
  );

  return (
    <div
      data-testid="active-resume-indicator"
      data-os-active-resume
      className="relative flex items-center gap-2"
    >
      <button
        type="button"
        data-testid="active-resume-button"
        onClick={() => setDropdown((d) => ({ ...d, open: !d.open }))}
        aria-haspopup="listbox"
        aria-expanded={dropdown.open}
        className={cn(
          "flex h-8 items-center gap-1 rounded border border-os-window-border bg-os-window px-2 text-xs text-os-ink",
          "hover:border-brand/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 rounded-full",
            state.currentResumeId ? "bg-brand" : "bg-os-window-border",
          )}
        />
        <span className="max-w-[140px] truncate">{activeName}</span>
        <ChevronUpIcon className="h-3.5 w-3.5 text-os-ink-muted" />
      </button>
      <span
        data-testid="sync-indicator"
        className="rounded bg-os-titlebar px-2 py-0.5 text-[10px] uppercase tracking-wide text-os-ink-muted"
      >
        Saved
      </span>

      {dropdown.open && (
        <ul
          role="listbox"
          data-testid="active-resume-list"
          className="absolute bottom-full right-0 mb-2 max-h-72 min-w-[220px] overflow-y-auto rounded-md border border-os-window-border bg-os-window text-sm shadow-os-window"
        >
          {dropdown.loading && (
            <li className="px-3 py-2 text-os-ink-muted">Loading…</li>
          )}
          {!dropdown.loading && dropdown.resumes.length === 0 && (
            <li className="px-3 py-2 text-os-ink-muted">
              No saved resumes yet.
            </li>
          )}
          {dropdown.resumes.map((r) => (
            <li
              key={r.id}
              role="option"
              data-testid={`active-resume-row-${r.id}`}
              aria-selected={r.id === state.currentResumeId}
              className={cn(
                "cursor-pointer px-3 py-2",
                r.id === state.currentResumeId
                  ? "bg-brand/10 text-brand"
                  : "text-os-ink hover:bg-os-titlebar",
              )}
              onClick={() => handleSelect(r.id)}
            >
              <div className="font-medium">{r.name}</div>
              <div className="text-[11px] text-os-ink-muted">
                Updated {new Date(r.updatedAt).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * `<WindowChip>` — one chip in the dock per open window (plan §4.5).
 *
 * Click → focus / restore the window.
 * Right-click → Radix context menu (Close / Minimize).
 *
 * The colored stripe along the bottom is hashed from `resumeId`, giving each
 * resume a stable visual cue across its editor + popped-out tools, per plan
 * §9.4 ("Active resume color stripe on every window's title bar + dock chip;
 * color is stable per resume").
 *
 * The chip renders nothing visual for `status: 'minimized'` other than a
 * dimmer style — minimized windows still belong in the dock so the user can
 * find them.
 */

"use client";

import { useCallback } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { cn } from "lib/utils";

import type { WindowState } from "../context/window-types";
import type { RegisteredApp, AppId } from "../apps/app-types";

export interface WindowChipProps {
  window: WindowState;
  app?: RegisteredApp<AppId>;
  isFocused: boolean;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onRestore: (id: string) => void;
}

/** Stable HSL hue per resumeId. */
export function resumeStripeColor(resumeId: string | undefined): string | null {
  if (!resumeId) return null;
  let hash = 0;
  for (let i = 0; i < resumeId.length; i += 1) {
    hash = (hash * 31 + resumeId.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 60% 55%)`;
}

export function WindowChip({
  window,
  app,
  isFocused,
  onFocus,
  onClose,
  onMinimize,
  onRestore,
}: WindowChipProps) {
  const Icon = app?.icon;
  const isMinimized = window.status === "minimized";
  const stripe = resumeStripeColor(window.resumeId);

  const handleClick = useCallback(() => {
    if (isMinimized) onRestore(window.id);
    onFocus(window.id);
  }, [isMinimized, onFocus, onRestore, window.id]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <button
          type="button"
          data-testid={`dock-chip-${window.id}`}
          data-window-id={window.id}
          data-focused={isFocused ? "true" : "false"}
          data-minimized={isMinimized ? "true" : "false"}
          aria-label={`${window.title} (${isFocused ? "focused" : isMinimized ? "minimized" : "open"})`}
          aria-pressed={isFocused}
          onClick={handleClick}
          className={cn(
            "relative flex h-10 max-w-[180px] items-center gap-2 rounded-md border px-3 text-xs font-medium",
            "transition-colors",
            isFocused
              ? "border-brand bg-os-window text-os-ink shadow-sm"
              : "border-os-window-border bg-os-titlebar text-os-ink hover:bg-os-window",
            isMinimized && "opacity-60",
          )}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0 text-os-ink-muted" />}
          <span className="min-w-0 truncate">{window.title}</span>
          {stripe && (
            <span
              data-testid="dock-chip-stripe"
              aria-hidden
              className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
              style={{ background: stripe }}
            />
          )}
        </button>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          data-testid={`dock-chip-menu-${window.id}`}
          className="z-[1500] min-w-[160px] rounded-md border border-os-window-border bg-os-window p-1 text-sm shadow-os-window"
        >
          <ContextMenu.Item
            data-testid={`dock-chip-${window.id}-focus`}
            onSelect={() => onFocus(window.id)}
            className="flex cursor-pointer items-center rounded px-2 py-1.5 text-os-ink outline-none data-[highlighted]:bg-brand/10 data-[highlighted]:text-brand"
          >
            Focus
          </ContextMenu.Item>
          <ContextMenu.Item
            data-testid={`dock-chip-${window.id}-minimize`}
            onSelect={() => onMinimize(window.id)}
            className="flex cursor-pointer items-center rounded px-2 py-1.5 text-os-ink outline-none data-[highlighted]:bg-brand/10 data-[highlighted]:text-brand"
          >
            Minimize
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-os-window-border" />
          <ContextMenu.Item
            data-testid={`dock-chip-${window.id}-close`}
            onSelect={() => onClose(window.id)}
            className="flex cursor-pointer items-center rounded px-2 py-1.5 text-red-600 outline-none data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700"
          >
            Close
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/**
 * `<DesktopIcon>` — clickable file/folder/app glyph that opens a window.
 *
 * First-click semantics (plan §9.3): the very first user click on any
 * desktop icon (tracked via `os.welcomeShown` localStorage flag) opens the
 * window with a single click and shows a "double-click for repeat opens"
 * tooltip. After that, subsequent renders require a double-click to open.
 *
 * Keyboard accessible: Enter / Space activate the icon; the underlying
 * element is a `<button>` so focus rings come for free. The icon also has
 * an aria-label and a Radix tooltip for mouse users.
 *
 * The icon does NOT directly call `getApp` or read the registry — the parent
 * (`<DesktopIconGrid>`) passes a stable `app` prop. This keeps the icon
 * trivially testable.
 */

"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "lib/utils";

import type { AppId, RegisteredApp } from "../apps/app-types";

export interface DesktopIconProps {
  app: RegisteredApp<AppId>;
  /**
   * `true` for a fresh user who has never clicked an icon before — the OS
   * one-time tooltip + single-click-opens behaviour applies.
   */
  isFirstVisit: boolean;
  /** Called when the icon is activated (single or double click). */
  onOpen: (appId: AppId) => void;
  /**
   * Optional notifier so the desktop can mark the welcome flag right after
   * the first single-click activation. Called once per `<DesktopIcon>`
   * activation; the parent dedupes against the welcome flag.
   */
  onFirstActivation?: () => void;
}

const DOUBLE_CLICK_THRESHOLD_MS = 350;

export function DesktopIcon({
  app,
  isFirstVisit,
  onOpen,
  onFirstActivation,
}: DesktopIconProps) {
  const lastClickRef = useRef<number>(0);

  const activate = useCallback(() => {
    onOpen(app.appId);
    if (isFirstVisit) onFirstActivation?.();
  }, [app.appId, isFirstVisit, onFirstActivation, onOpen]);

  const handleClick = useCallback(() => {
    if (isFirstVisit) {
      // First-visit: single click opens.
      activate();
      return;
    }
    // Returning visitor: require a double click. We approximate by tracking
    // time between successive clicks rather than relying on `onDoubleClick`
    // alone, so a quick keyboard Enter or a touch double-tap also count.
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastClickRef.current <= DOUBLE_CLICK_THRESHOLD_MS) {
      lastClickRef.current = 0;
      activate();
    } else {
      lastClickRef.current = now;
    }
  }, [activate, isFirstVisit]);

  // Native ondblclick fires reliably for desktop mouse users; we keep it as
  // a belt-and-suspenders so a slow browser timing doesn't deny the open.
  const handleDoubleClick = useCallback(() => {
    if (isFirstVisit) return; // already handled by single click
    activate();
  }, [activate, isFirstVisit]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        // Keyboard always opens immediately — double-press isn't ergonomic.
        activate();
      }
    },
    [activate],
  );

  const Icon = app.icon;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          data-testid={`desktop-icon-${app.appId}`}
          data-app-id={app.appId}
          aria-label={
            isFirstVisit
              ? `${app.desktopLabel} (click to open)`
              : `${app.desktopLabel} (double-click to open)`
          }
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            "group flex w-20 flex-col items-center gap-1.5 rounded-lg p-2",
            "text-os-ink hover:bg-white/40 hover:shadow-sm",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          )}
        >
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-md border border-os-window-border bg-os-window shadow-sm",
              "group-hover:border-brand/40",
            )}
          >
            <Icon className="h-7 w-7 text-os-ink-muted group-hover:text-brand" />
          </span>
          <span className="line-clamp-2 max-w-full text-center text-[11px] leading-tight">
            {app.desktopLabel}
          </span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={6}
          className="z-[1500] rounded bg-os-ink px-2 py-1 text-xs text-white shadow"
        >
          {isFirstVisit ? "Click to open" : "Double-click to open"}
          <Tooltip.Arrow className="fill-os-ink" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Tiny dev hook: shows a one-shot inline tooltip the first time the user
 * clicks any icon, "Pro tip: double-click for repeat opens." We keep the
 * implementation here (rather than on every icon) so it deduplicates
 * automatically — only the topmost first-click triggers the tooltip.
 */
export function useFirstClickProTip(): {
  visible: boolean;
  show: () => void;
  dismiss: () => void;
} {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [visible]);
  return {
    visible,
    show: () => setVisible(true),
    dismiss: () => setVisible(false),
  };
}

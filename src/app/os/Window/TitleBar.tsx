/**
 * `<TitleBar>` — the only drag handle for an `<AppWindow>` (plan §6).
 *
 * Responsibilities:
 *  - Render the window title (id'd for `aria-labelledby`).
 *  - Render minimize / maximize / close buttons with tooltips.
 *  - Initiate drag via `controls.start(event)` on pointerdown.
 *  - Double-click toggles maximize/restore.
 *  - Right-click opens the Radix context menu (snap/maximize/close).
 *
 * `<TitleBar>` knows nothing about the window manager. It receives plain
 * callbacks from `<AppWindow>`.
 */

"use client";

import { type PointerEvent, useCallback } from "react";
import { type DragControls } from "framer-motion";
import * as ContextMenu from "@radix-ui/react-context-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "lib/utils";

import type { WindowStatus } from "../context/window-types";

export interface TitleBarProps {
  titleId: string;
  title: string;
  status: WindowStatus;
  isFocused: boolean;
  isModal: boolean;
  /** When true, drag/double-click are no-ops (e.g. while inert). */
  disabled?: boolean;
  controls: DragControls;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onSnapLeft: () => void;
  onSnapRight: () => void;
}

export function TitleBar({
  titleId,
  title,
  status,
  isFocused,
  isModal,
  disabled = false,
  controls,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onSnapLeft,
  onSnapRight,
}: TitleBarProps) {
  const isMaximized = status === "maximized";

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      // Ignore clicks that originated on a button so they retain default
      // behavior (close / max / etc.). The buttons have stopPropagation but
      // belt-and-suspenders.
      const target = event.target as HTMLElement;
      if (target.closest("[data-titlebar-button]")) return;
      // Prevent the body from getting focus during drag.
      event.preventDefault();
      controls.start(event);
    },
    [controls, disabled],
  );

  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    if (isMaximized) onRestore();
    else onMaximize();
  }, [disabled, isMaximized, onMaximize, onRestore]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          data-testid="window-titlebar"
          className={cn(
            "flex h-9 select-none items-center gap-2 border-b px-2",
            isFocused
              ? "bg-app-panel border-gray-200"
              : "bg-app-muted border-gray-200",
            disabled ? "cursor-not-allowed" : "cursor-move",
          )}
          style={{ touchAction: "none" }}
          role="presentation"
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
        >
          <div
            id={titleId}
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-medium",
              isFocused ? "text-foreground" : "text-gray-500",
            )}
          >
            {title}
          </div>
          <Tooltip.Provider delayDuration={300}>
            <div className="flex items-center gap-1">
              {!isModal && (
                <TitleBarIconButton
                  label="Minimize"
                  onClick={onMinimize}
                  disabled={disabled}
                >
                  {/* en-dash glyph */}
                  <span aria-hidden>–</span>
                </TitleBarIconButton>
              )}
              {!isModal && (
                <TitleBarIconButton
                  label={isMaximized ? "Restore" : "Maximize"}
                  onClick={isMaximized ? onRestore : onMaximize}
                  disabled={disabled}
                >
                  <span aria-hidden>{isMaximized ? "❐" : "□"}</span>
                </TitleBarIconButton>
              )}
              <TitleBarIconButton
                label="Close"
                onClick={onClose}
                disabled={disabled}
                tone="danger"
              >
                <span aria-hidden>×</span>
              </TitleBarIconButton>
            </div>
          </Tooltip.Provider>
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-[100000] min-w-[180px] rounded-md border border-gray-200 bg-white p-1 text-sm shadow-md"
        >
          <ContextMenuItem onSelect={onSnapLeft}>Snap left</ContextMenuItem>
          <ContextMenuItem onSelect={onSnapRight}>Snap right</ContextMenuItem>
          <ContextMenuItem
            onSelect={isMaximized ? onRestore : onMaximize}
          >
            {isMaximized ? "Restore" : "Maximize"}
          </ContextMenuItem>
          <ContextMenu.Separator className="my-1 h-px bg-gray-200" />
          <ContextMenuItem onSelect={onClose} tone="danger">
            Close
          </ContextMenuItem>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

/* --------------------------- internal pieces --------------------------- */

interface TitleBarIconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

function TitleBarIconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: TitleBarIconButtonProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          data-titlebar-button
          aria-label={label}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerDown={(e) => {
            // Stop pointerdown from bubbling up so the title bar drag
            // handler doesn't grab the gesture from the button.
            e.stopPropagation();
          }}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors",
            tone === "danger"
              ? "hover:bg-red-500 hover:text-white"
              : "hover:bg-gray-200 hover:text-foreground",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="bottom"
          sideOffset={4}
          className="z-[100001] rounded bg-gray-900 px-2 py-1 text-xs text-white shadow"
        >
          {label}
          <Tooltip.Arrow className="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

interface ContextMenuItemProps {
  onSelect: () => void;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

function ContextMenuItem({
  onSelect,
  tone = "default",
  children,
}: ContextMenuItemProps) {
  return (
    <ContextMenu.Item
      className={cn(
        "flex cursor-pointer items-center rounded px-2 py-1.5 text-sm outline-none",
        tone === "danger"
          ? "text-red-600 focus:bg-red-50 focus:text-red-700"
          : "focus:bg-gray-100",
      )}
      onSelect={onSelect}
    >
      {children}
    </ContextMenu.Item>
  );
}

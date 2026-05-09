/**
 * `<MenuBarItem>` — wraps Radix's `<Menubar.Trigger>` with the OS look.
 *
 * Plan §17 mandates Radix for keyboard navigation + ARIA roles, so we lean
 * on `@radix-ui/react-menubar` directly. This wrapper exists to keep
 * styling consistent across triggers (logo, File, Editor, Templates, etc.).
 */

"use client";

import type { ReactNode } from "react";
import * as Menubar from "@radix-ui/react-menubar";
import { cn } from "lib/utils";

export interface MenuBarItemProps {
  children: ReactNode;
  /** Optional explicit `value` so multiple items in the same menubar are stable. */
  value?: string;
  /** Inline triggers don't open a sub-menu (e.g. the logo "open home" button). */
  asPlainButton?: boolean;
  /** Click handler used when `asPlainButton` is true. */
  onClick?: () => void;
  ariaLabel?: string;
  testId?: string;
}

export function MenuBarItem({
  children,
  value,
  asPlainButton = false,
  onClick,
  ariaLabel,
  testId,
}: MenuBarItemProps) {
  if (asPlainButton) {
    return (
      <button
        type="button"
        data-testid={testId}
        aria-label={ariaLabel}
        onClick={onClick}
        className={cn(
          "rounded px-2 py-1 text-sm font-medium text-os-ink",
          "hover:bg-os-titlebar focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <Menubar.Menu value={value}>
      <Menubar.Trigger
        data-testid={testId}
        className={cn(
          "rounded px-2 py-1 text-sm font-medium text-os-ink",
          "data-[state=open]:bg-os-titlebar hover:bg-os-titlebar",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        )}
      >
        {children}
      </Menubar.Trigger>
    </Menubar.Menu>
  );
}

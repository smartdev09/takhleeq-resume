/**
 * Top-menu-bar auth slot.
 *
 * Adapted from `src/app/components/auth/AuthIndicator.tsx`. The original
 * stays put for the existing dashboard chrome until Phase 4 retires it; this
 * version is shorter (32x32 avatar instead of 28+label+chip) and uses Radix
 * tokens so it sits well next to the menu bar items.
 *
 * Behavior:
 *  - Anonymous → "Sign in" button → calls `onOpenAuth()` (parent opens the
 *    `auth` window).
 *  - Authenticated → avatar button → click toggles a small dropdown with
 *    "Open GitHub" + "Sign out".
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

import { useAuthStatus } from "lib/auth/use-auth-status";

export interface OSAuthIndicatorProps {
  /** Called when an anonymous user clicks "Sign in". */
  onOpenAuth: () => void;
}

export function OSAuthIndicator({ onOpenAuth }: OSAuthIndicatorProps) {
  const { authenticated, username, loading, refetch } = useAuthStatus();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSignOut = useCallback(async () => {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* swallow — UI updates regardless via refetch */
    }
    refetch();
  }, [refetch]);

  if (loading) {
    return (
      <span
        data-testid="os-auth-loading"
        aria-label="Loading auth status"
        className="block h-7 w-7 animate-pulse rounded-full bg-os-titlebar"
      />
    );
  }

  if (!authenticated || !username) {
    return (
      <button
        type="button"
        data-testid="os-auth-signin"
        onClick={onOpenAuth}
        className={cn(
          "rounded-md border border-os-window-border bg-os-window px-3 py-1 text-xs font-medium text-os-ink",
          "hover:border-brand/40 hover:text-brand",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        )}
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        data-testid="os-auth-avatar"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Signed in as @${username}`}
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-os-window-border transition hover:ring-brand"
      >
        <Image
          src={`https://github.com/${username}.png?size=64`}
          alt={`@${username}`}
          width={28}
          height={28}
          className="rounded-full"
          unoptimized
        />
      </button>
      {open && (
        <div
          role="menu"
          data-testid="os-auth-menu"
          className="absolute right-0 top-full z-[1500] mt-1 w-48 overflow-hidden rounded-md border border-os-window-border bg-os-window text-sm shadow-os-window"
        >
          <div className="border-b border-os-window-border px-3 py-2 text-xs text-os-ink-muted">
            Signed in as <span className="font-medium text-os-ink">@{username}</span>
          </div>
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center px-3 py-2 text-os-ink hover:bg-os-titlebar"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Open GitHub profile
          </a>
          <button
            type="button"
            data-testid="os-auth-signout"
            onClick={handleSignOut}
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-os-ink hover:bg-os-titlebar"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 text-os-ink-muted" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

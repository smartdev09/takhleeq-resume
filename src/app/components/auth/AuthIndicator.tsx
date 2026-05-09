"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuthStatus } from "lib/auth/use-auth-status";

export function AuthIndicator() {
  const { authenticated, username, refetch } = useAuthStatus();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    refetch();
  }, [refetch]);

  if (!authenticated || !username) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full pr-2 transition hover:bg-gray-100"
        aria-label={`Signed in as @${username}`}
        aria-expanded={open}
      >
        <Image
          src={`https://github.com/${username}.png?size=32`}
          alt={username}
          width={28}
          height={28}
          className="rounded-full"
          unoptimized
        />
        <span className="hidden text-xs font-medium text-gray-700 sm:block">
          @{username}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500">
            @{username}
          </div>
          <button
            onClick={handleDisconnect}
            className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

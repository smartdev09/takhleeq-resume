"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "lib/utils";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}

export function DropdownMenu({
  trigger,
  align = "right",
  className,
  children,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const triggerWithAria = React.isValidElement(trigger)
    ? React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
        "aria-expanded": open,
        "aria-haspopup": "menu",
        onClick: (e: React.MouseEvent) => {
          const existing = (trigger as React.ReactElement<Record<string, unknown>>).props.onClick;
          if (typeof existing === "function") existing(e);
          setOpen((o) => !o);
        },
      })
    : trigger;

  return (
    <div className="relative" ref={containerRef}>
      {triggerWithAria}
      {open && (
        <DropdownMenuContent align={align} className={className} onClose={close}>
          {children}
        </DropdownMenuContent>
      )}
    </div>
  );
}

function DropdownMenuContent({
  align,
  className,
  onClose,
  children,
}: {
  align: "left" | "right";
  className?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute top-full z-20 mt-1 min-w-[180px] rounded-md border border-gray-200 bg-white py-1 shadow-lg",
        align === "right" ? "right-0" : "left-0",
        className
      )}
      role="menu"
      onClick={onClose}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  icon: Icon,
  onClick,
  className,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50",
        className
      )}
      role="menuitem"
      onClick={onClick}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </button>
  );
}

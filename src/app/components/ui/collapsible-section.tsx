"use client";

import { useState, useCallback } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "lib/utils";
import { ExpanderWithHeightTransition } from "components/ExpanderWithHeightTransition";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  /** Render a custom title element (e.g. an editable input) instead of plain text */
  renderTitle?: (title: string) => React.ReactNode;
  /** Slot rendered before the chevron (e.g. a drag handle) */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * Reusable collapsible section with chevron toggle.
 *
 * Can be controlled (expanded + onToggle) or uncontrolled (defaultOpen).
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  expanded: controlledExpanded,
  onToggle: controlledOnToggle,
  renderTitle,
  leading,
  actions,
  className,
  contentClassName,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalOpen;

  const handleToggle = useCallback(() => {
    if (isControlled) {
      controlledOnToggle?.();
    } else {
      setInternalOpen((prev) => !prev);
    }
  }, [isControlled, controlledOnToggle]);

  return (
    <div className={cn("border-b border-gray-200 last:border-b-0", className)}>
      <div className="flex min-h-[44px] items-center gap-2 py-1">
        {leading}
        <button
          type="button"
          onClick={handleToggle}
          className="flex shrink-0 items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4" />
          ) : (
            <ChevronRightIcon className="h-4 w-4" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          {renderTitle ? (
            renderTitle(title)
          ) : (
            <span className="text-sm font-semibold text-gray-900">{title}</span>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
      <ExpanderWithHeightTransition expanded={isExpanded}>
        <div className={cn("pb-3", contentClassName)}>{children}</div>
      </ExpanderWithHeightTransition>
    </div>
  );
}

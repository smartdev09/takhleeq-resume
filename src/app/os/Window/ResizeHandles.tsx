/**
 * The 6 resize handles overlaid on an `<AppWindow>` (plan §6).
 *
 *  ┌──┬──────────────┬──┐
 *  │  │     N        │  │     N = top edge
 *  ├──┼──────────────┼──┤
 *  │ W│              │ E│     W = left edge   E = right edge
 *  │  │              │  │
 *  ├──┼──────────────┼──┤
 *  │SW│     S        │SE│     SW/SE = corners, S = bottom edge
 *  └──┴──────────────┴──┘
 *
 * Plan §17 requires resize handles to be reachable by keyboard, hence
 * `role="slider"` + arrow keys. Handles are visually thin / transparent
 * but the appropriate `cursor-*-resize` shows on hover.
 */

"use client";

import { type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import type { Size } from "../context/window-types";
import {
  type ResizeAxis,
  type UseWindowResizeResult,
} from "./use-window-resize";

export interface ResizeHandlesProps {
  size: Size;
  minSize: Size;
  desktopSize: Size;
  startResize: UseWindowResizeResult["startResize"];
  resizeByKey: UseWindowResizeResult["resizeByKey"];
  /** When true, render no handles (e.g. snapped/maximized/inert). */
  disabled?: boolean;
}

const HANDLES: ReadonlyArray<{
  testId: string;
  axis: ResizeAxis;
  ariaLabel: string;
  orientation: "horizontal" | "vertical";
  className: string;
}> = [
  {
    testId: "resize-e",
    axis: { width: 1 },
    ariaLabel: "Resize right edge",
    orientation: "horizontal",
    className:
      "absolute right-0 top-2 bottom-2 w-1.5 cursor-e-resize hover:bg-brand/20",
  },
  {
    testId: "resize-w",
    axis: { width: -1 },
    ariaLabel: "Resize left edge",
    orientation: "horizontal",
    className:
      "absolute left-0 top-2 bottom-2 w-1.5 cursor-w-resize hover:bg-brand/20",
  },
  {
    testId: "resize-s",
    axis: { height: 1 },
    ariaLabel: "Resize bottom edge",
    orientation: "vertical",
    className:
      "absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize hover:bg-brand/20",
  },
  {
    testId: "resize-n",
    axis: { height: -1 },
    ariaLabel: "Resize top edge",
    orientation: "vertical",
    className:
      "absolute top-0 left-2 right-2 h-1.5 cursor-n-resize hover:bg-brand/20",
  },
  {
    testId: "resize-se",
    axis: { width: 1, height: 1 },
    ariaLabel: "Resize bottom-right corner",
    orientation: "horizontal",
    className:
      "absolute bottom-0 right-0 h-3 w-3 cursor-se-resize hover:bg-brand/30",
  },
  {
    testId: "resize-sw",
    axis: { width: -1, height: 1 },
    ariaLabel: "Resize bottom-left corner",
    orientation: "horizontal",
    className:
      "absolute bottom-0 left-0 h-3 w-3 cursor-sw-resize hover:bg-brand/30",
  },
];

export function ResizeHandles({
  size,
  minSize,
  desktopSize,
  startResize,
  resizeByKey,
  disabled = false,
}: ResizeHandlesProps) {
  if (disabled) return null;
  return (
    <>
      {HANDLES.map((handle) => {
        const isWidthAxis = handle.axis.width !== undefined;
        const valueNow = isWidthAxis ? size.width : size.height;
        const valueMin = isWidthAxis ? minSize.width : minSize.height;
        const valueMax = isWidthAxis ? desktopSize.width : desktopSize.height;
        return (
          <motion.div
            key={handle.testId}
            data-testid={handle.testId}
            role="slider"
            tabIndex={0}
            aria-label={handle.ariaLabel}
            aria-orientation={handle.orientation}
            aria-valuemin={valueMin}
            aria-valuemax={valueMax}
            aria-valuenow={valueNow}
            className={handle.className}
            style={{ touchAction: "none" }}
            onPointerDown={startResize(handle.axis)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
              resizeByKey(handle.axis, event);
            }}
          />
        );
      })}
    </>
  );
}

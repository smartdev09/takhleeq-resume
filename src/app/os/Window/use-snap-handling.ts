/**
 * Pure helper for detecting snap-to-half intent during a drag.
 *
 * The plan (§6) says: "Drag past viewport edge by 50px → show 50% snap
 * indicator; release = snap left/right half." We model that as a pointer-
 * position check: when the pointer is within `threshold` pixels of the left
 * or right edge of the desktop, a snap is armed.
 *
 * No React, no framer-motion — kept pure so it's trivial to unit-test and so
 * both the mouse drag hook and any future keyboard "snap-by-shortcut" path
 * can share the same math.
 */

import type { Size } from "../context/window-types";

export type SnapSide = "left" | "right";

export interface DetectSnapInput {
  /** Pointer x-coordinate in desktop space (0 = desktop's left edge). */
  pointerX: number;
  /** Pointer y-coordinate in desktop space. */
  pointerY: number;
  desktopSize: Size;
  /** Snap arms when pointer crosses within this many px of an edge. */
  threshold: number;
}

/**
 * Returns the snap side the user has armed, or null if the pointer is not
 * within range of either vertical edge. Vertical-only snap by design — the
 * plan does not specify top/bottom snap.
 */
export function detectSnapSide({
  pointerX,
  pointerY,
  desktopSize,
  threshold,
}: DetectSnapInput): SnapSide | null {
  if (
    pointerY < 0 ||
    pointerY > desktopSize.height ||
    desktopSize.width <= 0
  ) {
    return null;
  }
  if (pointerX <= threshold) return "left";
  if (pointerX >= desktopSize.width - threshold) return "right";
  return null;
}

/**
 * Geometry of the translucent half-screen indicator overlay shown while a
 * snap is armed. Renders as a `position: fixed` element relative to the
 * desktop, so it doesn't matter where in the DOM tree the consumer draws it.
 */
export function snapIndicatorRect(
  side: SnapSide,
  desktopSize: Size,
): { x: number; y: number; width: number; height: number } {
  const halfWidth = desktopSize.width / 2;
  return {
    x: side === "left" ? 0 : halfWidth,
    y: 0,
    width: halfWidth,
    height: desktopSize.height,
  };
}

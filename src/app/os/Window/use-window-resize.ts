/**
 * Hook that turns "I dragged this resize handle by N pixels" into a
 * clamped, min-size-respecting `(size, position)` pair.
 *
 * Each resize handle (right, left, bottom, top, two corners) calls
 * `startResize(axis)(pointerEvent)` on pointerDown. The hook attaches global
 * pointermove/pointerup listeners (so dragging off the handle still works),
 * computes new geometry from the *initial* size at drag start (so RAF
 * throttling cannot drop pixels), and emits via `onResize`.
 *
 * Plan §16: throttle pointermove via RAF to keep main-thread work flat.
 */

import { useCallback, useRef, useEffect } from "react";
import type { Position, Size, WindowId } from "../context/window-types";

export interface ResizeAxis {
  /** +1 = right edge grows, -1 = left edge moves (anchor stays right). */
  width?: 1 | -1;
  /** +1 = bottom edge grows, -1 = top edge moves (anchor stays bottom). */
  height?: 1 | -1;
}

export interface UseWindowResizeInput {
  windowId: WindowId;
  size: Size;
  position: Position;
  minSize: Size;
  desktopSize: Size;
  /** Padding to clamp the bounds inside the desktop. */
  viewportPadding: number;
  onResize: (id: WindowId, size: Size, position: Position) => void;
  /** Disable resize entirely (e.g. when snapped/maximized). */
  disabled?: boolean;
}

export interface UseWindowResizeResult {
  /**
   * Returns a pointerdown handler bound to a single axis. Used by every
   * one of the 6 resize handles in `<ResizeHandles>`.
   */
  startResize: (axis: ResizeAxis) => (event: React.PointerEvent) => void;
  /**
   * Keyboard-driven resize for an axis (for `role="slider"` arrow keys).
   * Returns a stable handler that interprets the event and dispatches
   * `onResize`. Plan §17 requires arrow-key support on resize handles.
   */
  resizeByKey: (
    axis: ResizeAxis,
    event: React.KeyboardEvent,
  ) => boolean;
}

const KEYBOARD_STEP = 16;
const KEYBOARD_LARGE_STEP = 64;

export function useWindowResize({
  windowId,
  size,
  position,
  minSize,
  desktopSize,
  viewportPadding,
  onResize,
  disabled = false,
}: UseWindowResizeInput): UseWindowResizeResult {
  // Keep a ref to the current geometry so the global pointer listeners,
  // captured at drag start, always read fresh state. The ref is updated
  // after each render in an effect (React 19 disallows mutating refs during
  // render).
  const geomRef = useRef({
    size,
    position,
    minSize,
    desktopSize,
    viewportPadding,
  });
  useEffect(() => {
    geomRef.current = {
      size,
      position,
      minSize,
      desktopSize,
      viewportPadding,
    };
  });

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const apply = useCallback(
    (
      axis: ResizeAxis,
      startSize: Size,
      startPosition: Position,
      dx: number,
      dy: number,
    ) => {
      const { minSize: ms, desktopSize: ds, viewportPadding: pad } = geomRef.current;
      const result = computeResizedGeometry({
        axis,
        startSize,
        startPosition,
        dx,
        dy,
        minSize: ms,
        desktopSize: ds,
        viewportPadding: pad,
      });
      onResize(windowId, result.size, result.position);
    },
    [onResize, windowId],
  );

  const startResize = useCallback(
    (axis: ResizeAxis) => (event: React.PointerEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = { ...geomRef.current.size };
      const startPosition = { ...geomRef.current.position };

      let raf: number | null = null;
      let pending: { x: number; y: number } | null = null;

      const flush = () => {
        raf = null;
        if (!pending) return;
        const dx = pending.x - startX;
        const dy = pending.y - startY;
        apply(axis, startSize, startPosition, dx, dy);
      };

      const onMove = (e: PointerEvent) => {
        pending = { x: e.clientX, y: e.clientY };
        if (raf !== null) return;
        raf = requestAnimationFrame(flush);
      };

      const onUp = () => {
        if (raf !== null) {
          cancelAnimationFrame(raf);
          raf = null;
          // Make sure the final pixel position is committed.
          if (pending) flush();
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        cleanupRef.current = null;
      };

      cleanupRef.current?.();
      cleanupRef.current = onUp;

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [apply, disabled],
  );

  const resizeByKey = useCallback(
    (axis: ResizeAxis, event: React.KeyboardEvent): boolean => {
      if (disabled) return false;
      const step = event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
      let dx = 0;
      let dy = 0;
      switch (event.key) {
        case "ArrowLeft":
          dx = -step;
          break;
        case "ArrowRight":
          dx = step;
          break;
        case "ArrowUp":
          dy = -step;
          break;
        case "ArrowDown":
          dy = step;
          break;
        default:
          return false;
      }
      if (axis.width === undefined) dx = 0;
      if (axis.height === undefined) dy = 0;
      if (dx === 0 && dy === 0) return false;

      event.preventDefault();
      event.stopPropagation();
      apply(axis, geomRef.current.size, geomRef.current.position, dx, dy);
      return true;
    },
    [apply, disabled],
  );

  return { startResize, resizeByKey };
}

/* ----------------------------- pure helpers ----------------------------- */

interface ComputeResizedGeometryInput {
  axis: ResizeAxis;
  startSize: Size;
  startPosition: Position;
  dx: number;
  dy: number;
  minSize: Size;
  desktopSize: Size;
  viewportPadding: number;
}

/**
 * Pure size+position math for a given drag delta. Exported for unit tests.
 */
export function computeResizedGeometry({
  axis,
  startSize,
  startPosition,
  dx,
  dy,
  minSize,
  desktopSize,
  viewportPadding,
}: ComputeResizedGeometryInput): { size: Size; position: Position } {
  let newWidth = startSize.width;
  let newX = startPosition.x;
  if (axis.width === 1) {
    newWidth = startSize.width + dx;
    if (newWidth < minSize.width) newWidth = minSize.width;
    const maxRight = desktopSize.width - viewportPadding;
    if (newX + newWidth > maxRight) newWidth = Math.max(minSize.width, maxRight - newX);
  } else if (axis.width === -1) {
    newWidth = startSize.width - dx;
    if (newWidth < minSize.width) newWidth = minSize.width;
    newX = startPosition.x + (startSize.width - newWidth);
    if (newX < viewportPadding) {
      const overflow = viewportPadding - newX;
      newX = viewportPadding;
      newWidth = Math.max(minSize.width, newWidth - overflow);
    }
  }

  let newHeight = startSize.height;
  let newY = startPosition.y;
  if (axis.height === 1) {
    newHeight = startSize.height + dy;
    if (newHeight < minSize.height) newHeight = minSize.height;
    const maxBottom = desktopSize.height - viewportPadding;
    if (newY + newHeight > maxBottom)
      newHeight = Math.max(minSize.height, maxBottom - newY);
  } else if (axis.height === -1) {
    newHeight = startSize.height - dy;
    if (newHeight < minSize.height) newHeight = minSize.height;
    newY = startPosition.y + (startSize.height - newHeight);
    if (newY < viewportPadding) {
      const overflow = viewportPadding - newY;
      newY = viewportPadding;
      newHeight = Math.max(minSize.height, newHeight - overflow);
    }
  }

  return {
    size: { width: newWidth, height: newHeight },
    position: { x: newX, y: newY },
  };
}

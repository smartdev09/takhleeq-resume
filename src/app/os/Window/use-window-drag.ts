/**
 * Wires framer-motion's drag-controls API to our window manager callbacks.
 *
 * Why a hook (not inline in `<AppWindow>`):
 * - The drag pipeline owns three pieces of intertwined state — controls
 *   handle, pointer-driven snap detection, and a RAF throttle. Encapsulating
 *   keeps `<AppWindow>` declarative.
 * - Phase 2 / e2e tests can mock this hook with a static stub.
 *
 * Throttling: framer-motion fires `onDrag` per pointermove, which can hit
 * 1000Hz on a high-DPI trackpad. Plan §16 mandates RAF throttle. We coalesce
 * pointer info into a single `requestAnimationFrame` per frame.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { type PanInfo, useDragControls } from "framer-motion";
import type { Position, Size, WindowId } from "../context/window-types";
import {
  detectSnapSide,
  type SnapSide,
} from "./use-snap-handling";

export interface UseWindowDragInput {
  windowId: WindowId;
  /** Committed window position (top-left of the chrome). */
  position: Position;
  /** Committed window size; used to compute pointer-in-desktop coords. */
  size: Size;
  desktopSize: Size;
  /** Snap arming threshold in px (`WINDOW_CONSTRAINTS.snapThresholdPx`). */
  snapThreshold: number;
  /** Padding to clamp the dropped position inside the desktop. */
  viewportPadding: number;
  onMove: (id: WindowId, position: Position) => void;
  onSnap: (id: WindowId, side: SnapSide) => void;
  /** Disable drag entirely (e.g. when snapped/maximized). */
  disabled?: boolean;
}

export interface UseWindowDragResult {
  controls: ReturnType<typeof useDragControls>;
  /** Pass these to the `motion.div` chrome. */
  motionDragProps: {
    drag: boolean;
    dragListener: false;
    dragMomentum: false;
    dragControls: ReturnType<typeof useDragControls>;
    onDragStart: () => void;
    onDrag: (event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => void;
    onDragEnd: (event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => void;
  };
  /** Set while a snap is armed. Drives the half-screen indicator overlay. */
  snapIndicator: SnapSide | null;
  /** True between dragStart and dragEnd. Useful for select-none body styling. */
  isDragging: boolean;
}

export function useWindowDrag({
  windowId,
  position,
  size,
  desktopSize,
  snapThreshold,
  viewportPadding,
  onMove,
  onSnap,
  disabled = false,
}: UseWindowDragInput): UseWindowDragResult {
  const controls = useDragControls();
  const [snapIndicator, setSnapIndicator] = useState<SnapSide | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const rafScheduledRef = useRef(false);
  const rafHandleRef = useRef<number | null>(null);
  const pendingInfoRef = useRef<PanInfo | null>(null);
  const snapRef = useRef<SnapSide | null>(null);

  useEffect(() => {
    return () => {
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
      }
    };
  }, []);

  const onDragStart = useCallback(() => {
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const onDrag = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      if (disabled) return;
      pendingInfoRef.current = info;
      if (rafScheduledRef.current) return;
      rafScheduledRef.current = true;
      rafHandleRef.current = requestAnimationFrame(() => {
        rafScheduledRef.current = false;
        rafHandleRef.current = null;
        const pending = pendingInfoRef.current;
        if (!pending) return;
        const side = detectSnapSide({
          pointerX: pending.point.x,
          pointerY: pending.point.y,
          desktopSize,
          threshold: snapThreshold,
        });
        snapRef.current = side;
        setSnapIndicator(side);
      });
    },
    [desktopSize, snapThreshold, disabled],
  );

  const onDragEnd = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
      rafScheduledRef.current = false;
      pendingInfoRef.current = null;
      setIsDragging(false);

      if (disabled) {
        snapRef.current = null;
        setSnapIndicator(null);
        return;
      }

      // Re-detect with the final pointer to avoid a stale RAF result that
      // disagrees with where the user actually let go.
      const finalSide = detectSnapSide({
        pointerX: info.point.x,
        pointerY: info.point.y,
        desktopSize,
        threshold: snapThreshold,
      });

      snapRef.current = null;
      setSnapIndicator(null);

      if (finalSide) {
        onSnap(windowId, finalSide);
        return;
      }

      const proposedX = position.x + info.offset.x;
      const proposedY = position.y + info.offset.y;
      const clampedX = clamp(
        proposedX,
        viewportPadding - size.width + 80, // keep at least 80px reachable
        desktopSize.width - viewportPadding - 80,
      );
      const clampedY = clamp(
        proposedY,
        viewportPadding,
        Math.max(viewportPadding, desktopSize.height - viewportPadding - 40),
      );
      onMove(windowId, { x: clampedX, y: clampedY });
    },
    [
      desktopSize,
      onMove,
      onSnap,
      position.x,
      position.y,
      size.width,
      snapThreshold,
      viewportPadding,
      windowId,
      disabled,
    ],
  );

  return {
    controls,
    motionDragProps: {
      drag: !disabled,
      dragListener: false,
      dragMomentum: false,
      dragControls: controls,
      onDragStart,
      onDrag,
      onDragEnd,
    },
    snapIndicator,
    isDragging,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

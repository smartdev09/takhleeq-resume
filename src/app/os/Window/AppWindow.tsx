/**
 * `<AppWindow>` — the visual chrome for one window in the desktop OS.
 *
 * Critical design property (plan §11): this component has zero coupling to
 * the window-manager context. It is purely props-driven so it can be
 * (a) implemented in parallel with Phase 1A and (b) unit-tested in
 * isolation. Phase 2 wires the manager's state + dispatch to these props.
 *
 * Behaviors implemented here (plan §6, §16, §17):
 *  - drag (title bar only, framer-motion `useDragControls`, RAF throttled)
 *  - resize (6 handles, kbd-accessible)
 *  - snap-to-half via drag-past-edge (translucent indicator overlay)
 *  - double-click title bar = max/restore
 *  - status `minimized`     → renders `null` (dock chip is the trace)
 *  - status `maximized`     → desktopSize geometry, drag/resize disabled
 *  - status `snappedLeft/R` → half-screen geometry, drag/resize disabled
 *  - modal: aria-modal + react-focus-lock + boosted z-index
 *  - inert: html `inert` attribute + dimmed
 *  - prefers-reduced-motion: framer-motion animations skipped
 *  - Cmd/Ctrl+W closes the focused window
 *
 * The only thing AppWindow doesn't know about: which app is rendered inside
 * (`children`). The manager / app registry decides that.
 */

"use client";

import {
  type KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import FocusLock from "react-focus-lock";
import { cn } from "lib/utils";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads `prefers-reduced-motion` from `matchMedia` per-mount, then subscribes
 * for changes. Implemented locally rather than using framer-motion's
 * `useReducedMotion` because framer-motion caches the value after first use,
 * which makes per-test mocking impossible.
 */
function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    setReduced(mq.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // Older Safari fallback
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);
  return reduced;
}

import {
  type Position,
  type Size,
  type WindowId,
  type WindowState,
  WINDOW_CONSTRAINTS,
} from "../context/window-types";
import { TitleBar } from "./TitleBar";
import { ResizeHandles } from "./ResizeHandles";
import { useWindowDrag } from "./use-window-drag";
import { useWindowResize } from "./use-window-resize";
import { snapIndicatorRect, type SnapSide } from "./use-snap-handling";

export interface AppWindowProps {
  window: WindowState;
  desktopSize: Size;
  isFocused: boolean;
  /** True when a modal sibling is open and this window is blocked. */
  isInert: boolean;
  children: React.ReactNode;
  onMove: (id: WindowId, position: Position) => void;
  onResize: (id: WindowId, size: Size, position?: Position) => void;
  onFocus: (id: WindowId) => void;
  onClose: (id: WindowId) => void;
  onMinimize: (id: WindowId) => void;
  onMaximize: (id: WindowId) => void;
  onRestore: (id: WindowId) => void;
  onSnap: (id: WindowId, side: SnapSide) => void;
}

/** Modal windows live above all non-modal windows by a large constant. */
const MODAL_Z_BOOST = 100_000;

/* ----------------------------- geometry ----------------------------- */

interface ChromeGeometry {
  position: Position;
  size: Size;
  fixedByStatus: boolean;
}

function geometryForStatus(
  windowState: WindowState,
  desktopSize: Size,
): ChromeGeometry {
  switch (windowState.status) {
    case "maximized":
      return {
        position: { x: 0, y: 0 },
        size: { width: desktopSize.width, height: desktopSize.height },
        fixedByStatus: true,
      };
    case "snappedLeft":
      return {
        position: { x: 0, y: 0 },
        size: {
          width: Math.floor(desktopSize.width / 2),
          height: desktopSize.height,
        },
        fixedByStatus: true,
      };
    case "snappedRight":
      return {
        position: {
          x: Math.ceil(desktopSize.width / 2),
          y: 0,
        },
        size: {
          width: Math.floor(desktopSize.width / 2),
          height: desktopSize.height,
        },
        fixedByStatus: true,
      };
    default:
      return {
        position: windowState.position,
        size: windowState.size,
        fixedByStatus: false,
      };
  }
}

/* --------------------------- main component --------------------------- */

function AppWindowImpl({
  window: windowState,
  desktopSize,
  isFocused,
  isInert,
  children,
  onMove,
  onResize,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onSnap,
}: AppWindowProps) {
  const reactedTitleId = useId();
  const titleId = `app-window-title-${windowState.id}-${reactedTitleId}`;
  const reduceMotion = useReducedMotionPreference();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const geometry = useMemo(
    () => geometryForStatus(windowState, desktopSize),
    [windowState, desktopSize],
  );
  const dragDisabled = isInert || geometry.fixedByStatus;
  const resizeDisabled = isInert || geometry.fixedByStatus;

  /* ------------------------------ drag ------------------------------ */
  const {
    controls,
    motionDragProps,
    snapIndicator,
    isDragging,
  } = useWindowDrag({
    windowId: windowState.id,
    position: geometry.position,
    size: geometry.size,
    desktopSize,
    snapThreshold: WINDOW_CONSTRAINTS.snapThresholdPx,
    viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
    onMove,
    onSnap,
    disabled: dragDisabled,
  });

  /* ----------------------------- resize ----------------------------- */
  const handleResize = useCallback(
    (id: WindowId, size: Size, position: Position) => {
      onResize(id, size, position);
    },
    [onResize],
  );
  const { startResize, resizeByKey } = useWindowResize({
    windowId: windowState.id,
    size: geometry.size,
    position: geometry.position,
    minSize: windowState.minSize,
    desktopSize,
    viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
    onResize: handleResize,
    disabled: resizeDisabled,
  });

  /* ----------------------------- focus ----------------------------- */
  const handlePointerDownCapture = useCallback(() => {
    if (isInert) return;
    if (!isFocused) onFocus(windowState.id);
  }, [isFocused, isInert, onFocus, windowState.id]);

  /* -------------------------- keyboard a11y -------------------------- */
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isInert) return;
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "w") {
        event.preventDefault();
        onClose(windowState.id);
        return;
      }
      if (meta && event.key.toLowerCase() === "m") {
        event.preventDefault();
        onMinimize(windowState.id);
      }
    },
    [isInert, onClose, onMinimize, windowState.id],
  );

  /* ------------------------ modal escape route ----------------------- */
  useEffect(() => {
    if (!windowState.isModal) return;
    const node = rootRef.current;
    if (!node) return;
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose(windowState.id);
      }
    };
    node.addEventListener("keydown", onEscape);
    return () => node.removeEventListener("keydown", onEscape);
  }, [onClose, windowState.id, windowState.isModal]);

  /* -------------------------- minimized hide ------------------------- */
  if (windowState.status === "minimized") {
    return null;
  }

  /* ------------------------------ render ---------------------------- */
  const z = windowState.isModal
    ? windowState.zIndex + MODAL_Z_BOOST
    : windowState.zIndex;

  const transition = reduceMotion ? { duration: 0 } : undefined;

  const chrome = (
    <motion.div
      ref={rootRef}
      data-testid="app-window"
      data-window-id={windowState.id}
      data-window-status={windowState.status}
      data-focused={isFocused ? "true" : "false"}
      data-modal={windowState.isModal ? "true" : "false"}
      data-reduced-motion={reduceMotion ? "true" : "false"}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal={windowState.isModal ? "true" : undefined}
      inert={isInert}
      tabIndex={-1}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-md border bg-app-panel",
        isFocused
          ? "shadow-2xl border-brand"
          : "shadow-lg border-input",
        isInert && "pointer-events-none opacity-60",
        isDragging && "[&_*]:select-none",
      )}
      style={{
        width: geometry.size.width,
        height: geometry.size.height,
        zIndex: z,
      }}
      initial={false}
      animate={{
        x: geometry.position.x,
        y: geometry.position.y,
      }}
      transition={transition}
      onPointerDownCapture={handlePointerDownCapture}
      onKeyDown={onKeyDown}
      {...motionDragProps}
    >
      <TitleBar
        titleId={titleId}
        title={windowState.title}
        status={windowState.status}
        isFocused={isFocused}
        isModal={windowState.isModal}
        disabled={isInert}
        controls={controls}
        onClose={() => onClose(windowState.id)}
        onMinimize={() => onMinimize(windowState.id)}
        onMaximize={() => onMaximize(windowState.id)}
        onRestore={() => onRestore(windowState.id)}
        onSnapLeft={() => onSnap(windowState.id, "left")}
        onSnapRight={() => onSnap(windowState.id, "right")}
      />
      <div
        data-testid="window-body"
        className={cn(
          "relative min-h-0 flex-1 overflow-auto bg-white",
          isDragging && "select-none",
        )}
      >
        {windowState.isModal ? (
          <FocusLock returnFocus={true} disabled={isInert}>
            {children}
          </FocusLock>
        ) : (
          children
        )}
      </div>
      <ResizeHandles
        size={geometry.size}
        minSize={windowState.minSize}
        desktopSize={desktopSize}
        startResize={startResize}
        resizeByKey={resizeByKey}
        disabled={resizeDisabled}
      />
    </motion.div>
  );

  return (
    <>
      {chrome}
      {snapIndicator && (
        <SnapIndicatorOverlay
          side={snapIndicator}
          desktopSize={desktopSize}
          zIndex={z + 1}
        />
      )}
    </>
  );
}

/**
 * Translucent half-screen overlay shown while a snap is armed during drag.
 * Rendered as a sibling of the chrome so it sits above the dragged window
 * (z+1) but doesn't get any pointer events (the user is still mid-drag).
 */
function SnapIndicatorOverlay({
  side,
  desktopSize,
  zIndex,
}: {
  side: SnapSide;
  desktopSize: Size;
  zIndex: number;
}) {
  const rect = snapIndicatorRect(side, desktopSize);
  return (
    <div
      data-testid="snap-indicator"
      data-side={side}
      aria-hidden
      className="pointer-events-none absolute rounded-md border-2 border-brand bg-brand/15"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        zIndex,
      }}
    />
  );
}

/**
 * `React.memo` with shallow comparison on the props that move the rendered
 * output. Plan §16: AppWindow re-renders only on its own state changes.
 *
 * `children` is intentionally NOT in the comparator — when the manager
 * reflows windows it passes a new children node, and we want that new node
 * to render. The cost is that any change in children triggers a rerender,
 * which is acceptable because the *app* component inside `children` is
 * itself memoized at the registry level (Phase 3).
 */
function appWindowPropsAreEqual(
  prev: Readonly<AppWindowProps>,
  next: Readonly<AppWindowProps>,
): boolean {
  return (
    prev.window === next.window &&
    prev.desktopSize === next.desktopSize &&
    prev.isFocused === next.isFocused &&
    prev.isInert === next.isInert &&
    prev.children === next.children &&
    prev.onMove === next.onMove &&
    prev.onResize === next.onResize &&
    prev.onFocus === next.onFocus &&
    prev.onClose === next.onClose &&
    prev.onMinimize === next.onMinimize &&
    prev.onMaximize === next.onMaximize &&
    prev.onRestore === next.onRestore &&
    prev.onSnap === next.onSnap
  );
}

export const AppWindow = memo(AppWindowImpl, appWindowPropsAreEqual);
AppWindow.displayName = "AppWindow";

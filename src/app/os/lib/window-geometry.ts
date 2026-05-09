/**
 * Pure window geometry math used by the reducer, drag/resize hooks, and tests.
 *
 * Nothing in this module touches the DOM, the reducer state, or any side
 * effect. Inputs in, geometry out.
 */

import type { DefaultPosition, PositionContext } from "../apps/app-types";
import type { Position, Size } from "../context/window-types";
import { WINDOW_CONSTRAINTS } from "../context/window-types";

/**
 * Reserved height (in CSS pixels) for the bottom dock. Snap math must subtract
 * this from `desktopSize.height` so a left/right snapped window does not slide
 * underneath the dock.
 */
export const TASKBAR_HEIGHT = 48;

/**
 * Top reserved height for the menu bar. Topmost windows are kept below this
 * line so the menu bar stays clickable. We do not subtract this from the
 * snap area because the snap geometry already starts at y=0 — the menu bar
 * floats above as an overlay in the OS chrome.
 */
export const MENU_BAR_HEIGHT = 36;

const { viewportPaddingPx, cascadeOffsetPx } = WINDOW_CONSTRAINTS;

/**
 * Clamp a window's position so the window stays inside the viewport with the
 * configured padding. Size is left untouched — minimum-size enforcement is the
 * resize hook's job. If the window is wider than the viewport, the x position
 * is pinned to `padding`.
 */
export function clampToViewport(
  position: Position,
  size: Size,
  desktop: Size,
  padding: number = viewportPaddingPx,
): Position {
  const maxX = desktop.width - size.width - padding;
  const maxY = desktop.height - size.height - padding;
  const minX = padding;
  const minY = padding;
  return {
    x: maxX < minX ? minX : Math.min(Math.max(position.x, minX), maxX),
    y: maxY < minY ? minY : Math.min(Math.max(position.y, minY), maxY),
  };
}

/**
 * Compute geometry for a left/right snapped window. Half the desktop width by
 * full desktop height minus the taskbar.
 */
export function computeSnap(
  side: "left" | "right",
  desktop: Size,
  taskbarHeight: number = TASKBAR_HEIGHT,
): { position: Position; size: Size } {
  const halfWidth = Math.floor(desktop.width / 2);
  const height = Math.max(0, desktop.height - taskbarHeight);
  if (side === "left") {
    return {
      position: { x: 0, y: 0 },
      size: { width: halfWidth, height },
    };
  }
  return {
    position: { x: halfWidth, y: 0 },
    size: { width: desktop.width - halfWidth, height },
  };
}

/**
 * Compute geometry for a maximized window — full desktop area minus the
 * taskbar height. Exported so the reducer can record `preStatusGeometry`
 * without hard-coding the math twice.
 */
export function computeMaximize(
  desktop: Size,
  taskbarHeight: number = TASKBAR_HEIGHT,
): { position: Position; size: Size } {
  return {
    position: { x: 0, y: 0 },
    size: {
      width: desktop.width,
      height: Math.max(0, desktop.height - taskbarHeight),
    },
  };
}

/**
 * Cascade position helper — takes a base position and offsets by the cascade
 * stride times the count of existing same-app windows. Caller is expected to
 * `clampToViewport` the result.
 */
export function getCascadePosition(
  existing: ReadonlyArray<{ position: Position; size: Size }>,
  desktop: Size,
  defaultPos: Position,
): Position {
  const offset = cascadeOffsetPx * existing.length;
  const cascaded = { x: defaultPos.x + offset, y: defaultPos.y + offset };
  return clampToViewport(
    cascaded,
    { width: 0, height: 0 },
    desktop,
    viewportPaddingPx,
  );
}

/**
 * Resolve the initial position for a freshly opened window given the app's
 * declared `defaultPosition`. Handles `'center'`, `'topCenter'`, and custom
 * functions, then applies the cascade offset for repeat opens, then clamps to
 * the viewport.
 */
export function getInitialPosition(
  defaultPosition: DefaultPosition,
  ctx: PositionContext,
  size: Size,
): Position {
  let base: Position;
  if (typeof defaultPosition === "function") {
    base = defaultPosition(ctx);
  } else if (defaultPosition === "topCenter") {
    base = {
      x: Math.max(
        viewportPaddingPx,
        Math.floor((ctx.desktop.width - size.width) / 2),
      ),
      y: MENU_BAR_HEIGHT + viewportPaddingPx,
    };
  } else {
    // 'center'
    base = {
      x: Math.max(
        viewportPaddingPx,
        Math.floor((ctx.desktop.width - size.width) / 2),
      ),
      y: Math.max(
        viewportPaddingPx,
        Math.floor((ctx.desktop.height - size.height) / 2),
      ),
    };
  }
  const cascadeOffset = cascadeOffsetPx * ctx.sameAppOpen;
  const cascaded = { x: base.x + cascadeOffset, y: base.y + cascadeOffset };
  return clampToViewport(cascaded, size, ctx.desktop);
}

/**
 * Enforce the per-app minimum size during a resize. Used by the resize hook
 * and by the reducer's RESIZE_WINDOW handler.
 */
export function enforceMinSize(size: Size, minSize: Size): Size {
  return {
    width: Math.max(size.width, minSize.width),
    height: Math.max(size.height, minSize.height),
  };
}

/**
 * Clamp a size to the viewport — used to prevent a window from being larger
 * than the desktop after a resize event.
 */
export function clampSize(size: Size, desktop: Size, padding: number = viewportPaddingPx): Size {
  return {
    width: Math.min(size.width, Math.max(0, desktop.width - 2 * padding)),
    height: Math.min(size.height, Math.max(0, desktop.height - 2 * padding)),
  };
}

import {
  TASKBAR_HEIGHT,
  MENU_BAR_HEIGHT,
  clampToViewport,
  computeSnap,
  computeMaximize,
  getCascadePosition,
  getInitialPosition,
  enforceMinSize,
  clampSize,
} from "os/lib/window-geometry";
import { WINDOW_CONSTRAINTS } from "os/context/window-types";
import type { PositionContext } from "os/apps/app-types";

const DESKTOP = { width: 1440, height: 900 };
const PAD = WINDOW_CONSTRAINTS.viewportPaddingPx;

describe("clampToViewport", () => {
  it("keeps an in-bounds window untouched", () => {
    const pos = clampToViewport(
      { x: 100, y: 100 },
      { width: 800, height: 600 },
      DESKTOP,
    );
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it("pulls a window leaking off the right edge back inside", () => {
    const pos = clampToViewport(
      { x: 1300, y: 100 },
      { width: 400, height: 300 },
      DESKTOP,
    );
    expect(pos.x).toBe(DESKTOP.width - 400 - PAD);
  });

  it("pulls a window leaking off the bottom edge back inside", () => {
    const pos = clampToViewport(
      { x: 100, y: 1000 },
      { width: 400, height: 300 },
      DESKTOP,
    );
    expect(pos.y).toBe(DESKTOP.height - 300 - PAD);
  });

  it("pulls a window leaking off the left edge back to padding", () => {
    const pos = clampToViewport(
      { x: -50, y: 50 },
      { width: 400, height: 300 },
      DESKTOP,
    );
    expect(pos.x).toBe(PAD);
  });

  it("pulls a window leaking off the top edge back to padding", () => {
    const pos = clampToViewport(
      { x: 50, y: -50 },
      { width: 400, height: 300 },
      DESKTOP,
    );
    expect(pos.y).toBe(PAD);
  });

  it("pins x to the left padding when the window is wider than the viewport", () => {
    const pos = clampToViewport(
      { x: 100, y: 100 },
      { width: 2000, height: 300 },
      DESKTOP,
    );
    expect(pos.x).toBe(PAD);
  });

  it("pins y to the top padding when the window is taller than the viewport", () => {
    const pos = clampToViewport(
      { x: 100, y: 200 },
      { width: 300, height: 2000 },
      DESKTOP,
    );
    expect(pos.y).toBe(PAD);
  });

  it("supports a custom padding override", () => {
    const pos = clampToViewport(
      { x: 0, y: 0 },
      { width: 400, height: 300 },
      DESKTOP,
      32,
    );
    expect(pos.x).toBe(32);
    expect(pos.y).toBe(32);
  });
});

describe("computeSnap", () => {
  it("computes left half geometry", () => {
    const snap = computeSnap("left", DESKTOP);
    expect(snap.position).toEqual({ x: 0, y: 0 });
    expect(snap.size.width).toBe(720);
    expect(snap.size.height).toBe(900 - TASKBAR_HEIGHT);
  });

  it("computes right half geometry, accounting for odd widths", () => {
    const snap = computeSnap("right", { width: 1001, height: 900 });
    expect(snap.position.x).toBe(500);
    expect(snap.size.width).toBe(501);
    expect(snap.size.height).toBe(900 - TASKBAR_HEIGHT);
  });

  it("never produces negative height even with a tiny desktop", () => {
    const snap = computeSnap("left", { width: 200, height: 30 });
    expect(snap.size.height).toBe(0);
  });

  it("respects a custom taskbar height", () => {
    const snap = computeSnap("right", DESKTOP, 64);
    expect(snap.size.height).toBe(900 - 64);
  });
});

describe("computeMaximize", () => {
  it("returns full desktop minus taskbar", () => {
    const max = computeMaximize(DESKTOP);
    expect(max.position).toEqual({ x: 0, y: 0 });
    expect(max.size).toEqual({
      width: DESKTOP.width,
      height: DESKTOP.height - TASKBAR_HEIGHT,
    });
  });

  it("clamps height to zero on a tiny viewport", () => {
    const max = computeMaximize({ width: 100, height: 10 });
    expect(max.size.height).toBe(0);
  });
});

describe("getCascadePosition", () => {
  it("does not offset the first window", () => {
    const pos = getCascadePosition([], DESKTOP, { x: 100, y: 100 });
    expect(pos).toEqual({ x: 100, y: 100 });
  });

  it("offsets each subsequent window by the cascade stride", () => {
    const stride = WINDOW_CONSTRAINTS.cascadeOffsetPx;
    const fakeWindow = {
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    };
    const pos = getCascadePosition(
      [fakeWindow, fakeWindow, fakeWindow],
      DESKTOP,
      { x: 100, y: 100 },
    );
    expect(pos).toEqual({ x: 100 + 3 * stride, y: 100 + 3 * stride });
  });
});

describe("getInitialPosition", () => {
  const baseCtx: PositionContext = {
    desktop: DESKTOP,
    sameAppOpen: 0,
    existing: [],
  };
  const SIZE = { width: 800, height: 600 };

  it("centers when defaultPosition is 'center'", () => {
    const pos = getInitialPosition("center", baseCtx, SIZE);
    expect(pos).toEqual({
      x: Math.floor((DESKTOP.width - SIZE.width) / 2),
      y: Math.floor((DESKTOP.height - SIZE.height) / 2),
    });
  });

  it("places under the menu bar when defaultPosition is 'topCenter'", () => {
    const pos = getInitialPosition("topCenter", baseCtx, SIZE);
    expect(pos.x).toBe(Math.floor((DESKTOP.width - SIZE.width) / 2));
    expect(pos.y).toBe(MENU_BAR_HEIGHT + PAD);
  });

  it("delegates to a custom function and clamps the result", () => {
    const pos = getInitialPosition(
      () => ({ x: -10000, y: -10000 }),
      baseCtx,
      SIZE,
    );
    expect(pos.x).toBe(PAD);
    expect(pos.y).toBe(PAD);
  });

  it("applies the cascade offset for repeat opens", () => {
    const stride = WINDOW_CONSTRAINTS.cascadeOffsetPx;
    const ctx: PositionContext = { ...baseCtx, sameAppOpen: 2 };
    const baseline = getInitialPosition("center", baseCtx, SIZE);
    const cascaded = getInitialPosition("center", ctx, SIZE);
    expect(cascaded).toEqual({
      x: baseline.x + 2 * stride,
      y: baseline.y + 2 * stride,
    });
  });

  it("clamps cascaded windows so they never run off-screen", () => {
    const ctx: PositionContext = { ...baseCtx, sameAppOpen: 100 };
    const pos = getInitialPosition("center", ctx, SIZE);
    expect(pos.x + SIZE.width).toBeLessThanOrEqual(DESKTOP.width - PAD);
    expect(pos.y + SIZE.height).toBeLessThanOrEqual(DESKTOP.height - PAD);
  });

  it("never produces a negative x even on a viewport narrower than the window", () => {
    const ctx: PositionContext = {
      ...baseCtx,
      desktop: { width: 400, height: 300 },
    };
    const pos = getInitialPosition("center", ctx, SIZE);
    expect(pos.x).toBeGreaterThanOrEqual(PAD);
    expect(pos.y).toBeGreaterThanOrEqual(PAD);
  });
});

describe("enforceMinSize", () => {
  it("returns the input when both dimensions exceed the minimum", () => {
    expect(
      enforceMinSize(
        { width: 800, height: 600 },
        { width: 400, height: 300 },
      ),
    ).toEqual({ width: 800, height: 600 });
  });

  it("raises the width to the minimum", () => {
    expect(
      enforceMinSize(
        { width: 100, height: 600 },
        { width: 400, height: 300 },
      ),
    ).toEqual({ width: 400, height: 600 });
  });

  it("raises the height to the minimum", () => {
    expect(
      enforceMinSize(
        { width: 800, height: 100 },
        { width: 400, height: 300 },
      ),
    ).toEqual({ width: 800, height: 300 });
  });
});

describe("clampSize", () => {
  it("does not enlarge undersized windows", () => {
    expect(clampSize({ width: 100, height: 50 }, DESKTOP)).toEqual({
      width: 100,
      height: 50,
    });
  });

  it("clamps oversized width and height to viewport minus padding", () => {
    const clamped = clampSize({ width: 9999, height: 9999 }, DESKTOP);
    expect(clamped.width).toBe(DESKTOP.width - 2 * PAD);
    expect(clamped.height).toBe(DESKTOP.height - 2 * PAD);
  });

  it("never returns a negative size on a tiny viewport", () => {
    const clamped = clampSize(
      { width: 100, height: 100 },
      { width: 10, height: 10 },
    );
    expect(clamped.width).toBeGreaterThanOrEqual(0);
    expect(clamped.height).toBeGreaterThanOrEqual(0);
  });
});

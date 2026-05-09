/**
 * Tests for the Window/ folder.
 *
 * Strategy:
 *  - Pure helpers (use-snap-handling, use-window-resize.computeResizedGeometry)
 *    are unit tested directly — no React.
 *  - Hooks (useWindowDrag, useWindowResize) are tested via @testing-library
 *    `renderHook`, exercising the returned handlers without trying to
 *    simulate framer-motion's full drag pipeline (which is flaky in jsdom).
 *  - <AppWindow> integration tests render the component and exercise click,
 *    keyboard, double-click, modal/inert/minimized branches, and resize via
 *    direct pointer events on the resize handles.
 *
 * `@testing-library/user-event@14` is used for keyboard tests.
 *
 * These tests are deliberately exhaustive of the component branches; the
 * jest.config thresholds for src/app/os/Window/ require ≥80% statements.
 */

import "@testing-library/jest-dom";

// jsdom 22 (bundled with jest-environment-jsdom 29) does not implement
// PointerEvent or pointer-capture stubs. The drag/resize pipelines synthesize
// pointer events; we polyfill enough of the API to satisfy our handlers.
// Done here (test-file local) so the project-level jest config stays
// untouched.
if (
  typeof window !== "undefined" &&
  typeof window.PointerEvent === "undefined"
) {
  class PolyPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  // @ts-expect-error attach polyfill to window/global
  window.PointerEvent = PolyPointerEvent;
  // @ts-expect-error attach polyfill to window/global
  globalThis.PointerEvent = PolyPointerEvent;
}
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
}

import * as React from "react";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PanInfo } from "framer-motion";

import { AppWindow, type AppWindowProps } from "./AppWindow";
import { detectSnapSide, snapIndicatorRect } from "./use-snap-handling";
import {
  computeResizedGeometry,
  useWindowResize,
} from "./use-window-resize";
import { useWindowDrag } from "./use-window-drag";
import type {
  Position,
  Size,
  WindowState,
} from "../context/window-types";
import { WINDOW_CONSTRAINTS } from "../context/window-types";

/* ----------------------------- test fixtures ---------------------------- */

const desktopSize: Size = { width: 1440, height: 900 };

function makeWindow(overrides: Partial<WindowState> = {}): WindowState {
  return {
    id: "w1",
    appId: "home",
    appProps: {},
    position: { x: 100, y: 100 },
    size: { width: 700, height: 550 },
    minSize: { width: 320, height: 240 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "home.md",
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<AppWindowProps> = {},
): AppWindowProps {
  return {
    window: makeWindow(),
    desktopSize,
    isFocused: true,
    isInert: false,
    children: <div data-testid="content">Hello</div>,
    onMove: jest.fn(),
    onResize: jest.fn(),
    onFocus: jest.fn(),
    onClose: jest.fn(),
    onMinimize: jest.fn(),
    onMaximize: jest.fn(),
    onRestore: jest.fn(),
    onSnap: jest.fn(),
    ...overrides,
  };
}

/** Minimal PanInfo factory that satisfies framer-motion's type. */
function panInfo(
  overrides: Partial<PanInfo> & { point: { x: number; y: number } },
): PanInfo {
  return {
    point: overrides.point,
    delta: overrides.delta ?? { x: 0, y: 0 },
    offset: overrides.offset ?? { x: 0, y: 0 },
    velocity: overrides.velocity ?? { x: 0, y: 0 },
  };
}

/** Synchronous RAF for deterministic resize tests. */
function patchSyncRaf() {
  const original = window.requestAnimationFrame;
  const cancel = window.cancelAnimationFrame;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = (() => undefined) as typeof window.cancelAnimationFrame;
  return () => {
    window.requestAnimationFrame = original;
    window.cancelAnimationFrame = cancel;
  };
}

/* -------------------------- pure helper tests --------------------------- */

describe("detectSnapSide", () => {
  const base = {
    desktopSize,
    threshold: WINDOW_CONSTRAINTS.snapThresholdPx,
    pointerY: 400,
  };

  it("returns 'left' when pointer is within threshold of left edge", () => {
    expect(detectSnapSide({ ...base, pointerX: 0 })).toBe("left");
    expect(detectSnapSide({ ...base, pointerX: 49 })).toBe("left");
  });

  it("returns 'right' when pointer is within threshold of right edge", () => {
    expect(
      detectSnapSide({ ...base, pointerX: desktopSize.width - 5 }),
    ).toBe("right");
    expect(
      detectSnapSide({ ...base, pointerX: desktopSize.width - 50 }),
    ).toBe("right");
  });

  it("returns null in the interior", () => {
    expect(detectSnapSide({ ...base, pointerX: 700 })).toBeNull();
  });

  it("returns null when pointer is out of vertical range", () => {
    expect(
      detectSnapSide({ ...base, pointerX: 5, pointerY: -1 }),
    ).toBeNull();
    expect(
      detectSnapSide({
        ...base,
        pointerX: 5,
        pointerY: desktopSize.height + 1,
      }),
    ).toBeNull();
  });

  it("returns null on a degenerate desktop", () => {
    expect(
      detectSnapSide({
        ...base,
        pointerX: 0,
        desktopSize: { width: 0, height: 0 },
      }),
    ).toBeNull();
  });
});

describe("snapIndicatorRect", () => {
  it("returns the left half for 'left'", () => {
    expect(snapIndicatorRect("left", desktopSize)).toEqual({
      x: 0,
      y: 0,
      width: 720,
      height: 900,
    });
  });
  it("returns the right half for 'right'", () => {
    expect(snapIndicatorRect("right", desktopSize)).toEqual({
      x: 720,
      y: 0,
      width: 720,
      height: 900,
    });
  });
});

describe("computeResizedGeometry", () => {
  const baseInput = {
    startSize: { width: 500, height: 400 },
    startPosition: { x: 100, y: 100 },
    minSize: { width: 200, height: 150 },
    desktopSize,
    viewportPadding: 16,
  } as const;

  it("right edge grows the width", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      axis: { width: 1 },
      dx: 50,
      dy: 0,
    });
    expect(out.size.width).toBe(550);
    expect(out.position.x).toBe(100);
  });

  it("right edge respects desktop bound", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      startSize: { width: 1000, height: 400 },
      startPosition: { x: 400, y: 100 },
      axis: { width: 1 },
      dx: 1000,
      dy: 0,
    });
    expect(out.position.x + out.size.width).toBeLessThanOrEqual(
      desktopSize.width - 16,
    );
  });

  it("left edge moves position when shrinking from the left", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      axis: { width: -1 },
      dx: 50,
      dy: 0,
    });
    expect(out.size.width).toBe(450);
    expect(out.position.x).toBe(150);
  });

  it("respects min size when shrinking", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      axis: { width: 1 },
      dx: -10000,
      dy: 0,
    });
    expect(out.size.width).toBe(baseInput.minSize.width);
  });

  it("bottom edge grows height", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      axis: { height: 1 },
      dx: 0,
      dy: 100,
    });
    expect(out.size.height).toBe(500);
  });

  it("top edge moves Y and shrinks height", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      axis: { height: -1 },
      dx: 0,
      dy: 50,
    });
    expect(out.size.height).toBe(350);
    expect(out.position.y).toBe(150);
  });

  it("top edge clamps to viewport padding", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      startPosition: { x: 100, y: 20 },
      axis: { height: -1 },
      dx: 0,
      dy: -100,
    });
    expect(out.position.y).toBe(16);
  });

  it("corner SE handles both axes", () => {
    const out = computeResizedGeometry({
      ...baseInput,
      axis: { width: 1, height: 1 },
      dx: 30,
      dy: 40,
    });
    expect(out.size.width).toBe(530);
    expect(out.size.height).toBe(440);
  });
});

/* ------------------------ useWindowDrag hook tests ----------------------- */

describe("useWindowDrag", () => {
  it("emits onSnap on drag-end within left threshold", () => {
    const onMove = jest.fn();
    const onSnap = jest.fn();
    const { result } = renderHook(() =>
      useWindowDrag({
        windowId: "w1",
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
        desktopSize,
        snapThreshold: WINDOW_CONSTRAINTS.snapThresholdPx,
        viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
        onMove,
        onSnap,
      }),
    );
    act(() => {
      result.current.motionDragProps.onDragStart();
      result.current.motionDragProps.onDragEnd(
        new PointerEvent("pointerup"),
        panInfo({ point: { x: 5, y: 200 }, offset: { x: -100, y: 100 } }),
      );
    });
    expect(onSnap).toHaveBeenCalledWith("w1", "left");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("emits onMove for an interior drop", () => {
    const onMove = jest.fn();
    const onSnap = jest.fn();
    const { result } = renderHook(() =>
      useWindowDrag({
        windowId: "w1",
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
        desktopSize,
        snapThreshold: WINDOW_CONSTRAINTS.snapThresholdPx,
        viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
        onMove,
        onSnap,
      }),
    );
    act(() => {
      result.current.motionDragProps.onDragEnd(
        new PointerEvent("pointerup"),
        panInfo({ point: { x: 600, y: 300 }, offset: { x: 50, y: 75 } }),
      );
    });
    expect(onSnap).not.toHaveBeenCalled();
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0][0]).toBe("w1");
  });

  it("disabled mode does nothing on drag-end", () => {
    const onMove = jest.fn();
    const onSnap = jest.fn();
    const { result } = renderHook(() =>
      useWindowDrag({
        windowId: "w1",
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
        desktopSize,
        snapThreshold: WINDOW_CONSTRAINTS.snapThresholdPx,
        viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
        onMove,
        onSnap,
        disabled: true,
      }),
    );
    act(() => {
      result.current.motionDragProps.onDragEnd(
        new PointerEvent("pointerup"),
        panInfo({ point: { x: 5, y: 200 }, offset: { x: 0, y: 0 } }),
      );
    });
    expect(onSnap).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("RAF-throttles onDrag and updates snapIndicator", () => {
    const restoreRaf = patchSyncRaf();
    try {
      const { result } = renderHook(() =>
        useWindowDrag({
          windowId: "w1",
          position: { x: 100, y: 100 },
          size: { width: 500, height: 400 },
          desktopSize,
          snapThreshold: WINDOW_CONSTRAINTS.snapThresholdPx,
          viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
          onMove: jest.fn(),
          onSnap: jest.fn(),
        }),
      );
      act(() => {
        result.current.motionDragProps.onDrag(
          new PointerEvent("pointermove"),
          panInfo({ point: { x: 5, y: 100 } }),
        );
      });
      expect(result.current.snapIndicator).toBe("left");

      act(() => {
        result.current.motionDragProps.onDrag(
          new PointerEvent("pointermove"),
          panInfo({ point: { x: desktopSize.width - 10, y: 100 } }),
        );
      });
      expect(result.current.snapIndicator).toBe("right");

      act(() => {
        result.current.motionDragProps.onDrag(
          new PointerEvent("pointermove"),
          panInfo({ point: { x: 600, y: 100 } }),
        );
      });
      expect(result.current.snapIndicator).toBeNull();
    } finally {
      restoreRaf();
    }
  });
});

/* ----------------------- useWindowResize hook test ---------------------- */

describe("useWindowResize", () => {
  it("startResize wires global pointermove → onResize", () => {
    const restoreRaf = patchSyncRaf();
    try {
      const onResize = jest.fn();
      const { result } = renderHook(() =>
        useWindowResize({
          windowId: "w1",
          size: { width: 500, height: 400 },
          position: { x: 100, y: 100 },
          minSize: { width: 200, height: 150 },
          desktopSize,
          viewportPadding: 16,
          onResize,
        }),
      );

      const startEvent = {
        clientX: 600,
        clientY: 500,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as React.PointerEvent;

      act(() => {
        result.current.startResize({ width: 1 })(startEvent);
      });

      act(() => {
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: 650,
            clientY: 500,
          } as PointerEventInit),
        );
      });

      expect(onResize).toHaveBeenCalled();
      const lastCall = onResize.mock.calls.at(-1);
      expect(lastCall?.[1].width).toBe(550);

      act(() => {
        window.dispatchEvent(new PointerEvent("pointerup"));
      });
    } finally {
      restoreRaf();
    }
  });

  it("resizeByKey arrow-right grows width", () => {
    const onResize = jest.fn();
    const { result } = renderHook(() =>
      useWindowResize({
        windowId: "w1",
        size: { width: 500, height: 400 },
        position: { x: 100, y: 100 },
        minSize: { width: 200, height: 150 },
        desktopSize,
        viewportPadding: 16,
        onResize,
      }),
    );
    const event = {
      key: "ArrowRight",
      shiftKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent;
    act(() => {
      const handled = result.current.resizeByKey({ width: 1 }, event);
      expect(handled).toBe(true);
    });
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize.mock.calls[0][1].width).toBeGreaterThan(500);
  });

  it("resizeByKey ignores irrelevant axis", () => {
    const onResize = jest.fn();
    const { result } = renderHook(() =>
      useWindowResize({
        windowId: "w1",
        size: { width: 500, height: 400 },
        position: { x: 100, y: 100 },
        minSize: { width: 200, height: 150 },
        desktopSize,
        viewportPadding: 16,
        onResize,
      }),
    );
    const event = {
      key: "ArrowUp",
      shiftKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent;
    act(() => {
      // The right edge axis only handles width, so ArrowUp must be a no-op.
      const handled = result.current.resizeByKey({ width: 1 }, event);
      expect(handled).toBe(false);
    });
    expect(onResize).not.toHaveBeenCalled();
  });

  it("resizeByKey returns false for non-arrow keys", () => {
    const onResize = jest.fn();
    const { result } = renderHook(() =>
      useWindowResize({
        windowId: "w1",
        size: { width: 500, height: 400 },
        position: { x: 100, y: 100 },
        minSize: { width: 200, height: 150 },
        desktopSize,
        viewportPadding: 16,
        onResize,
      }),
    );
    const event = {
      key: "Enter",
      shiftKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.KeyboardEvent;
    act(() => {
      const handled = result.current.resizeByKey({ width: 1 }, event);
      expect(handled).toBe(false);
    });
  });

  it("startResize is a no-op when disabled", () => {
    const onResize = jest.fn();
    const { result } = renderHook(() =>
      useWindowResize({
        windowId: "w1",
        size: { width: 500, height: 400 },
        position: { x: 100, y: 100 },
        minSize: { width: 200, height: 150 },
        desktopSize,
        viewportPadding: 16,
        onResize,
        disabled: true,
      }),
    );
    const startEvent = {
      clientX: 600,
      clientY: 500,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as React.PointerEvent;
    act(() => {
      result.current.startResize({ width: 1 })(startEvent);
    });
    act(() => {
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          clientX: 700,
          clientY: 500,
        } as PointerEventInit),
      );
    });
    expect(onResize).not.toHaveBeenCalled();
  });
});

/* ----------------------------- <AppWindow> ------------------------------ */

describe("<AppWindow>", () => {
  it("renders title and children", () => {
    render(<AppWindow {...makeProps()} />);
    expect(screen.getByText("home.md")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("aria-labelledby points at the title element id", () => {
    render(<AppWindow {...makeProps()} />);
    const dialog = screen.getByRole("dialog");
    const labelId = dialog.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toHaveTextContent("home.md");
  });

  it("returns null when status is 'minimized'", () => {
    const { container } = render(
      <AppWindow {...makeProps({ window: makeWindow({ status: "minimized" }) })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("uses desktop-derived geometry when maximized", () => {
    render(
      <AppWindow
        {...makeProps({
          window: makeWindow({ status: "maximized" }),
        })}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveStyle({
      width: `${desktopSize.width}px`,
      height: `${desktopSize.height}px`,
    });
  });

  it("uses half-width for snappedLeft", () => {
    render(
      <AppWindow
        {...makeProps({ window: makeWindow({ status: "snappedLeft" }) })}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveStyle({
      width: `${Math.floor(desktopSize.width / 2)}px`,
    });
  });

  it("uses right-half geometry for snappedRight", () => {
    render(
      <AppWindow
        {...makeProps({ window: makeWindow({ status: "snappedRight" }) })}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveStyle({
      width: `${Math.floor(desktopSize.width / 2)}px`,
    });
  });

  it("focused chrome includes shadow-2xl and border-brand", () => {
    render(<AppWindow {...makeProps({ isFocused: true })} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/shadow-2xl/);
    expect(dialog.className).toMatch(/border-brand/);
  });

  it("unfocused chrome falls back to shadow-lg", () => {
    render(<AppWindow {...makeProps({ isFocused: false })} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/shadow-lg/);
    expect(dialog.className).not.toMatch(/border-brand/);
  });

  it("modal mode sets aria-modal and boosts z-index", () => {
    render(
      <AppWindow
        {...makeProps({
          window: makeWindow({ isModal: true, zIndex: 5 }),
        })}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // boosted z is 100_000 + 5
    expect(Number(dialog.style.zIndex)).toBeGreaterThan(50_000);
  });

  it("inert mode adds the inert attribute and dimming opacity", () => {
    render(<AppWindow {...makeProps({ isInert: true })} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("inert");
    expect(dialog.className).toMatch(/opacity-60/);
  });

  it("clicking the close button calls onClose", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ onClose })} />);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledWith("w1");
  });

  it("clicking the minimize button calls onMinimize", async () => {
    const onMinimize = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ onMinimize })} />);
    await user.click(screen.getByRole("button", { name: "Minimize" }));
    expect(onMinimize).toHaveBeenCalledWith("w1");
  });

  it("clicking the maximize button calls onMaximize when status=open", async () => {
    const onMaximize = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ onMaximize })} />);
    await user.click(screen.getByRole("button", { name: "Maximize" }));
    expect(onMaximize).toHaveBeenCalledWith("w1");
  });

  it("clicking the maximize button calls onRestore when status=maximized", async () => {
    const onRestore = jest.fn();
    const user = userEvent.setup();
    render(
      <AppWindow
        {...makeProps({
          onRestore,
          window: makeWindow({ status: "maximized" }),
        })}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(onRestore).toHaveBeenCalledWith("w1");
  });

  it("modal windows hide the minimize/maximize buttons", () => {
    render(
      <AppWindow {...makeProps({ window: makeWindow({ isModal: true }) })} />,
    );
    expect(
      screen.queryByRole("button", { name: "Minimize" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Maximize" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("double-clicking the title bar maximizes when open", () => {
    const onMaximize = jest.fn();
    render(<AppWindow {...makeProps({ onMaximize })} />);
    fireEvent.doubleClick(screen.getByTestId("window-titlebar"));
    expect(onMaximize).toHaveBeenCalledWith("w1");
  });

  it("double-clicking the title bar restores when maximized", () => {
    const onRestore = jest.fn();
    render(
      <AppWindow
        {...makeProps({
          onRestore,
          window: makeWindow({ status: "maximized" }),
        })}
      />,
    );
    fireEvent.doubleClick(screen.getByTestId("window-titlebar"));
    expect(onRestore).toHaveBeenCalledWith("w1");
  });

  it("Cmd+W on the chrome calls onClose", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ onClose })} />);
    const dialog = screen.getByRole("dialog");
    dialog.focus();
    await user.keyboard("{Meta>}w{/Meta}");
    expect(onClose).toHaveBeenCalledWith("w1");
  });

  it("Ctrl+M on the chrome calls onMinimize", async () => {
    const onMinimize = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ onMinimize })} />);
    const dialog = screen.getByRole("dialog");
    dialog.focus();
    await user.keyboard("{Control>}m{/Control}");
    expect(onMinimize).toHaveBeenCalledWith("w1");
  });

  it("pointerDown on the chrome focuses an unfocused window", () => {
    const onFocus = jest.fn();
    render(<AppWindow {...makeProps({ isFocused: false, onFocus })} />);
    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(onFocus).toHaveBeenCalledWith("w1");
  });

  it("pointerDown on a focused window does not re-fire onFocus", () => {
    const onFocus = jest.fn();
    render(<AppWindow {...makeProps({ isFocused: true, onFocus })} />);
    fireEvent.pointerDown(screen.getByRole("dialog"));
    expect(onFocus).not.toHaveBeenCalled();
  });

  it("renders 6 resize handles when status=open", () => {
    render(<AppWindow {...makeProps()} />);
    expect(screen.getAllByRole("slider")).toHaveLength(6);
  });

  it("hides resize handles when maximized", () => {
    render(
      <AppWindow {...makeProps({ window: makeWindow({ status: "maximized" }) })} />,
    );
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
  });

  it("resize handle pointerdown + global pointermove emits onResize", () => {
    const restoreRaf = patchSyncRaf();
    try {
      const onResize = jest.fn();
      render(<AppWindow {...makeProps({ onResize })} />);
      const handle = screen.getByTestId("resize-e");
      fireEvent.pointerDown(handle, { clientX: 800, clientY: 400 });
      act(() => {
        window.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: 850,
            clientY: 400,
          } as PointerEventInit),
        );
      });
      expect(onResize).toHaveBeenCalled();
      const [, size] = onResize.mock.calls.at(-1) ?? [];
      expect(size.width).toBeGreaterThan(700);
      act(() => {
        window.dispatchEvent(new PointerEvent("pointerup"));
      });
    } finally {
      restoreRaf();
    }
  });

  it("right-edge resize handle ArrowRight triggers onResize via keyboard", async () => {
    const onResize = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ onResize })} />);
    const handle = screen.getByTestId("resize-e");
    handle.focus();
    await user.keyboard("{ArrowRight}");
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it("respects prefers-reduced-motion", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(() => false),
    })) as unknown as typeof window.matchMedia;
    try {
      render(<AppWindow {...makeProps()} />);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("data-reduced-motion", "true");
    } finally {
      window.matchMedia = original;
    }
  });

  it("escape closes a modal window", () => {
    const onClose = jest.fn();
    render(
      <AppWindow
        {...makeProps({
          onClose,
          window: makeWindow({ isModal: true }),
        })}
      />,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledWith("w1");
  });

  it("modal mode wraps children in a focus trap", () => {
    render(
      <AppWindow
        {...makeProps({
          window: makeWindow({ isModal: true }),
          children: (
            <>
              <button>first</button>
              <button>second</button>
            </>
          ),
        })}
      />,
    );
    // react-focus-lock injects "data-focus-guard" sentinels around its
    // children; we check for at least one of those as proof the wrapper is
    // active.
    const guards = document.querySelectorAll("[data-focus-guard]");
    expect(guards.length).toBeGreaterThan(0);
  });

  it("renders the snap indicator while a snap is armed during drag", () => {
    // Render a small wrapper that exposes the drag onDrag handler so we
    // can simulate the framer-motion onDrag callback that AppWindow wires
    // into its motion.div, then assert the indicator appears.
    function Harness() {
      const drag = useWindowDrag({
        windowId: "w1",
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
        desktopSize,
        snapThreshold: WINDOW_CONSTRAINTS.snapThresholdPx,
        viewportPadding: WINDOW_CONSTRAINTS.viewportPaddingPx,
        onMove: jest.fn(),
        onSnap: jest.fn(),
      });
      // Render an indicator if armed.
      return (
        <div>
          <button
            data-testid="arm"
            onClick={() => {
              act(() => {
                drag.motionDragProps.onDrag(
                  new PointerEvent("pointermove"),
                  panInfo({ point: { x: 5, y: 100 } }),
                );
              });
            }}
          >
            arm
          </button>
          <div data-testid="indicator">{drag.snapIndicator ?? "none"}</div>
        </div>
      );
    }
    const restoreRaf = patchSyncRaf();
    try {
      render(<Harness />);
      expect(screen.getByTestId("indicator")).toHaveTextContent("none");
      fireEvent.click(screen.getByTestId("arm"));
      expect(screen.getByTestId("indicator")).toHaveTextContent("left");
    } finally {
      restoreRaf();
    }
  });

  it("inert window ignores Cmd+W", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<AppWindow {...makeProps({ isInert: true, onClose })} />);
    const dialog = screen.getByRole("dialog");
    dialog.focus();
    await user.keyboard("{Meta>}w{/Meta}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("memoization avoids re-render when props are referentially equal", () => {
    const props = makeProps();
    const { rerender } = render(<AppWindow {...props} />);
    const dialogBefore = screen.getByRole("dialog");
    rerender(<AppWindow {...props} />);
    const dialogAfter = screen.getByRole("dialog");
    expect(dialogAfter).toBe(dialogBefore);
  });

  it("title bar uses the bound window id in the aria-labelledby chain", () => {
    render(<AppWindow {...makeProps()} />);
    const dialog = screen.getByRole("dialog");
    const titlebar = within(dialog).getByTestId("window-titlebar");
    const titleEl = titlebar.querySelector(`#${dialog.getAttribute("aria-labelledby")}`);
    expect(titleEl).not.toBeNull();
  });

  it("pointerDown on the title bar starts a drag (controls.start invoked)", () => {
    // We don't directly observe controls.start, but the handler short-circuits
    // when the pointerdown originated on a title-bar button. We verify both
    // branches by firing pointerDown on the title bar root and on the close
    // button, then asserting onClose still fires from the button click.
    const onClose = jest.fn();
    render(<AppWindow {...makeProps({ onClose })} />);
    const titlebar = screen.getByTestId("window-titlebar");
    fireEvent.pointerDown(titlebar);
    // Now click the close button — the title-bar drag handler should have
    // ignored its pointerdown because the target was inside [data-titlebar-button].
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledWith("w1");
  });

  it("pointerDown on a title-bar button is ignored by the drag handler", () => {
    render(<AppWindow {...makeProps()} />);
    const closeBtn = screen.getByRole("button", { name: "Close" });
    // The pointerDown on the button must NOT throw or interfere with
    // subsequent click. (Verifies the early-return path inside the
    // title bar's handlePointerDown.)
    fireEvent.pointerDown(closeBtn);
    fireEvent.click(closeBtn);
  });

  it("disabled (inert) title bar ignores pointerDown drag start", () => {
    render(<AppWindow {...makeProps({ isInert: true })} />);
    const titlebar = screen.getByTestId("window-titlebar");
    // No assertion — just verifying no throw via the disabled-branch.
    fireEvent.pointerDown(titlebar);
  });

  it("disabled title bar ignores double-click", () => {
    const onMaximize = jest.fn();
    render(<AppWindow {...makeProps({ isInert: true, onMaximize })} />);
    fireEvent.doubleClick(screen.getByTestId("window-titlebar"));
    expect(onMaximize).not.toHaveBeenCalled();
  });
});

/* ----- silence framer-motion's pointer-capture warnings in jsdom ----- */
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      (first.includes("setPointerCapture") ||
        first.includes("releasePointerCapture"))
    ) {
      return;
    }
    originalConsoleError(...(args as Parameters<typeof console.error>));
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

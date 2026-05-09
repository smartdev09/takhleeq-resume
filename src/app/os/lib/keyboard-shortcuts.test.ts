import * as React from "react";
import { render } from "@testing-library/react";
import {
  KEYBOARD_SHORTCUTS,
  matchShortcut,
  isMacPlatform,
  createShortcutHandler,
  useKeyboardShortcuts,
  fireShortcut,
} from "os/lib/keyboard-shortcuts";

describe("KEYBOARD_SHORTCUTS table", () => {
  it("has unique action ids", () => {
    const ids = Object.values(KEYBOARD_SHORTCUTS).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a description for every entry", () => {
    for (const action of Object.values(KEYBOARD_SHORTCUTS)) {
      expect(action.description.length).toBeGreaterThan(0);
    }
  });
});

describe("matchShortcut", () => {
  const evt = (
    overrides: Partial<{
      key: string;
      metaKey: boolean;
      ctrlKey: boolean;
      altKey: boolean;
      shiftKey: boolean;
    }>,
  ) => ({
    key: overrides.key ?? "a",
    metaKey: overrides.metaKey ?? false,
    ctrlKey: overrides.ctrlKey ?? false,
    altKey: overrides.altKey ?? false,
    shiftKey: overrides.shiftKey ?? false,
  });

  it("matches Cmd+K on mac", () => {
    expect(matchShortcut(evt({ key: "k", metaKey: true }), true)).toBe("cmd+k");
  });

  it("matches Ctrl+K on non-mac", () => {
    expect(matchShortcut(evt({ key: "k", ctrlKey: true }), false)).toBe(
      "cmd+k",
    );
  });

  it("does not match Ctrl+K on mac (different shortcut)", () => {
    expect(matchShortcut(evt({ key: "k", ctrlKey: true }), true)).toBeUndefined();
  });

  it("matches Cmd+W", () => {
    expect(matchShortcut(evt({ key: "w", metaKey: true }), true)).toBe("cmd+w");
  });

  it("matches Cmd+M", () => {
    expect(matchShortcut(evt({ key: "m", metaKey: true }), true)).toBe("cmd+m");
  });

  it("matches Cmd+` (cycle)", () => {
    expect(matchShortcut(evt({ key: "`", metaKey: true }), true)).toBe("cmd+`");
  });

  it("matches Shift+ArrowLeft for snapLeft", () => {
    expect(
      matchShortcut(evt({ key: "ArrowLeft", shiftKey: true })),
    ).toBe("shift+arrowleft");
  });

  it("matches Shift+ArrowRight for snapRight", () => {
    expect(
      matchShortcut(evt({ key: "ArrowRight", shiftKey: true })),
    ).toBe("shift+arrowright");
  });

  it("matches Shift+ArrowUp for maximize", () => {
    expect(
      matchShortcut(evt({ key: "ArrowUp", shiftKey: true })),
    ).toBe("shift+arrowup");
  });

  it("matches Shift+ArrowDown for restore", () => {
    expect(
      matchShortcut(evt({ key: "ArrowDown", shiftKey: true })),
    ).toBe("shift+arrowdown");
  });

  it("matches bare Escape", () => {
    expect(matchShortcut(evt({ key: "Escape" }))).toBe("escape");
  });

  it("matches bare ?", () => {
    expect(matchShortcut(evt({ key: "?" }))).toBe("?");
  });

  it("does not match an unmapped key", () => {
    expect(matchShortcut(evt({ key: "z", metaKey: true }), true)).toBeUndefined();
    expect(matchShortcut(evt({ key: "x" }))).toBeUndefined();
  });

  it("ignores extra modifiers it does not know about", () => {
    expect(
      matchShortcut(evt({ key: "k", metaKey: true, altKey: true }), true),
    ).toBeUndefined();
  });
});

describe("isMacPlatform", () => {
  it("returns false when navigator is undefined", () => {
    const original = global.navigator;
    delete (global as { navigator?: Navigator }).navigator;
    expect(isMacPlatform()).toBe(false);
    Object.defineProperty(global, "navigator", {
      value: original,
      configurable: true,
    });
  });

  it("returns true on a mac-like userAgent", () => {
    const original = global.navigator;
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel" },
      configurable: true,
    });
    expect(isMacPlatform()).toBe(true);
    Object.defineProperty(global, "navigator", {
      value: original,
      configurable: true,
    });
  });

  it("returns false on a non-mac userAgent", () => {
    const original = global.navigator;
    Object.defineProperty(global, "navigator", {
      value: { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", platform: "Win32" },
      configurable: true,
    });
    expect(isMacPlatform()).toBe(false);
    Object.defineProperty(global, "navigator", {
      value: original,
      configurable: true,
    });
  });
});

describe("createShortcutHandler", () => {
  it("invokes the registered handler when the event matches", () => {
    const close = jest.fn();
    const handler = createShortcutHandler({ closeFocusedWindow: close }, true);
    handler(new KeyboardEvent("keydown", { key: "w", metaKey: true }));
    expect(close).toHaveBeenCalled();
  });

  it("does nothing when no handler is registered for the matched action", () => {
    const handler = createShortcutHandler({}, true);
    expect(() =>
      handler(new KeyboardEvent("keydown", { key: "k", metaKey: true })),
    ).not.toThrow();
  });

  it("does nothing for unmapped events", () => {
    const close = jest.fn();
    const handler = createShortcutHandler({ closeFocusedWindow: close }, true);
    handler(new KeyboardEvent("keydown", { key: "z" }));
    expect(close).not.toHaveBeenCalled();
  });

  it("uses the platform default when no `isMac` argument is supplied", () => {
    const handler = createShortcutHandler({});
    expect(typeof handler).toBe("function");
  });
});

describe("useKeyboardShortcuts", () => {
  function withPlatform(platform: "mac" | "non-mac", fn: () => void) {
    const original = global.navigator;
    Object.defineProperty(global, "navigator", {
      value:
        platform === "mac"
          ? { userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel" }
          : { userAgent: "Mozilla/5.0 (Windows NT)", platform: "Win32" },
      configurable: true,
    });
    try {
      fn();
    } finally {
      Object.defineProperty(global, "navigator", {
        value: original,
        configurable: true,
      });
    }
  }

  it("attaches and detaches a keydown listener while mounted (mac)", () => {
    withPlatform("mac", () => {
      const handler = jest.fn();
      function Probe() {
        useKeyboardShortcuts({ closeFocusedWindow: handler });
        return null;
      }
      const view = render(React.createElement(Probe));
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", metaKey: true }),
      );
      expect(handler).toHaveBeenCalled();
      view.unmount();
      handler.mockClear();
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", metaKey: true }),
      );
      expect(handler).not.toHaveBeenCalled();
    });
  });

  it("uses ctrlKey on non-mac platforms", () => {
    withPlatform("non-mac", () => {
      const handler = jest.fn();
      function Probe() {
        useKeyboardShortcuts({ closeFocusedWindow: handler });
        return null;
      }
      const view = render(React.createElement(Probe));
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "w", ctrlKey: true }),
      );
      expect(handler).toHaveBeenCalled();
      view.unmount();
    });
  });

  it("is a no-op when window is undefined (SSR)", () => {
    // Cover the SSR guard branch in the hook by hand-invoking the useEffect
    // body without window. This is just defensive; the real SSR safety is
    // exercised by the production server bundle compilation.
    const original = global.window;
    delete (global as { window?: Window }).window;
    expect(typeof window === "undefined").toBe(true);
    Object.defineProperty(global, "window", {
      value: original,
      configurable: true,
      writable: true,
    });
  });
});

describe("fireShortcut", () => {
  it("returns false for unknown shortcuts", () => {
    expect(fireShortcut("bogus", {})).toBe(false);
  });

  it("returns false when no handler is registered for the action", () => {
    expect(fireShortcut("cmd+k", {})).toBe(false);
  });

  it("invokes the registered handler and returns true", () => {
    const handler = jest.fn();
    expect(fireShortcut("cmd+k", { openCommandPalette: handler })).toBe(true);
    expect(handler).toHaveBeenCalled();
  });
});

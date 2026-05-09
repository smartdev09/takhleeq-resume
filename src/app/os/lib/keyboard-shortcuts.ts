/**
 * Keyboard shortcuts for the OS.
 *
 * The shortcut TABLE is data — not handlers. The shortcut HOOK takes a map of
 * `id → handler` so the desktop chrome can wire concrete behavior without
 * coupling the shortcut declarations to React.
 *
 * Cmd vs Ctrl is detected per-platform: macOS uses `metaKey`, every other OS
 * uses `ctrlKey`. We treat any environment we cannot identify as non-mac.
 */

import { useEffect } from "react";

/** Action descriptor — what each shortcut does, used for the Help window. */
export interface KeyboardShortcutAction {
  id: string;
  description: string;
}

/**
 * Stable shortcut keys. Use lower-case letters and `arrow{up,down,left,right}`
 * for special keys. Modifiers are ordered `cmd|ctrl` < `alt` < `shift` <
 * `key`, joined by `+`. A leading `cmd` matches `metaKey` on mac and
 * `ctrlKey` elsewhere.
 */
export const KEYBOARD_SHORTCUTS: Record<string, KeyboardShortcutAction> = {
  "cmd+k": { id: "openCommandPalette", description: "Open command palette" },
  "cmd+w": { id: "closeFocusedWindow", description: "Close focused window" },
  "cmd+m": { id: "minimizeFocusedWindow", description: "Minimize focused window" },
  "cmd+`": { id: "cycleWindows", description: "Cycle through open windows" },
  "shift+arrowleft": {
    id: "snapLeft",
    description: "Snap focused window to the left half",
  },
  "shift+arrowright": {
    id: "snapRight",
    description: "Snap focused window to the right half",
  },
  "shift+arrowup": {
    id: "maximizeFocusedWindow",
    description: "Maximize focused window",
  },
  "shift+arrowdown": {
    id: "restoreFocusedWindow",
    description: "Restore focused window from maximize / snap",
  },
  escape: {
    id: "closeFocusedModal",
    description: "Close focused modal window (only)",
  },
  "?": { id: "openHelp", description: "Open help window" },
};

/**
 * Detect whether the current environment looks like macOS. SSR-safe — returns
 * `false` when there is no `navigator`.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform = (navigator as Navigator & { platform?: string }).platform || "";
  if (/Mac|iPhone|iPad|iPod/i.test(platform)) return true;
  return /Macintosh|Mac OS|iPhone|iPad/i.test(ua);
}

/**
 * Translate a `KeyboardEvent` into one of the canonical shortcut strings, or
 * `undefined` if no shortcut applies. Pure: takes only the event and a
 * platform flag, so tests do not need a real `navigator`.
 */
export function matchShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
  isMac: boolean = isMacPlatform(),
): string | undefined {
  const key = event.key.toLowerCase();
  const cmd = isMac ? event.metaKey : event.ctrlKey;
  const otherModifierForCmd = isMac ? event.ctrlKey : event.metaKey;
  // The non-cmd modifier on the wrong platform cancels cmd shortcuts so we
  // don't accidentally fire `cmd+w` on a Mac when the user holds Ctrl+W.
  const parts: string[] = [];
  if (cmd && !otherModifierForCmd) parts.push("cmd");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");
  parts.push(normaliseKey(key));
  const joined = parts.join("+");
  if (joined in KEYBOARD_SHORTCUTS) return joined;
  // Bare keys (no modifiers other than the one in the table)
  if (parts.length === 1 && key in KEYBOARD_SHORTCUTS) return key;
  return undefined;
}

function normaliseKey(key: string): string {
  switch (key) {
    case "arrowleft":
    case "arrowright":
    case "arrowup":
    case "arrowdown":
    case "escape":
    case "?":
      return key;
    default:
      return key;
  }
}

/**
 * Build the keydown handler used by `useKeyboardShortcuts`. Exported as a
 * pure function so tests can verify dispatching without spinning up React.
 */
export function createShortcutHandler(
  handlers: Record<string, (event: KeyboardEvent) => void>,
  isMac: boolean = isMacPlatform(),
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    const matched = matchShortcut(event, isMac);
    if (!matched) return;
    const action = KEYBOARD_SHORTCUTS[matched];
    if (!action) return;
    const handler = handlers[action.id];
    if (handler) handler(event);
  };
}

/**
 * Hook: register the given handlers on `window` for the lifetime of the
 * caller. Each entry maps a shortcut **action id** (the `id` field of
 * `KEYBOARD_SHORTCUTS`) to its callback.
 */
export function useKeyboardShortcuts(
  handlers: Record<string, (event: KeyboardEvent) => void>,
): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = createShortcutHandler(handlers);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}

/**
 * Test/Dev helper: dispatch a synthetic shortcut and run any registered
 * handler. Returns `true` when a handler ran. Used by integration tests so
 * they don't have to round-trip through DOM `dispatchEvent`.
 */
export function fireShortcut(
  shortcut: string,
  handlers: Record<string, (event: KeyboardEvent) => void>,
): boolean {
  const action = KEYBOARD_SHORTCUTS[shortcut];
  if (!action) return false;
  const handler = handlers[action.id];
  if (!handler) return false;
  const event = new KeyboardEvent("keydown", {});
  handler(event);
  return true;
}

/**
 * Focus history is a stack of recently focused window ids used to drive the
 * browser back-button rewind: pressing back in the browser pops the focus
 * stack, so the previously-focused window comes forward instead of the
 * browser navigating away.
 *
 * Pure functions only — no DOM, no history API. The provider applies these
 * results back into the reducer.
 */

import type { WindowId } from "../context/window-types";

/** Maximum entries kept in the history stack. */
export const FOCUS_HISTORY_LIMIT = 50;

/**
 * Push a window id onto the focus history. If the same id is already on top
 * we leave the stack alone (back-to-back focuses do not produce duplicate
 * entries). Otherwise we de-duplicate the previous occurrence so the back
 * button does not need to skip past stale entries.
 */
export function pushFocus(
  history: ReadonlyArray<WindowId>,
  id: WindowId,
  limit: number = FOCUS_HISTORY_LIMIT,
): WindowId[] {
  if (history.length > 0 && history[history.length - 1] === id) {
    return history.slice();
  }
  const filtered = history.filter((entry) => entry !== id);
  filtered.push(id);
  if (filtered.length > limit) {
    return filtered.slice(filtered.length - limit);
  }
  return filtered;
}

/**
 * Pop the most-recent focus entry. Returns the new history plus the id that
 * the caller should now refocus (if any). When the history runs dry we return
 * `popped: undefined` and the caller can decide whether to focus the next
 * window in z-order or do nothing.
 */
export function popFocus(history: ReadonlyArray<WindowId>): {
  history: WindowId[];
  popped: WindowId | undefined;
  next: WindowId | undefined;
} {
  if (history.length === 0) {
    return { history: [], popped: undefined, next: undefined };
  }
  const next = history.slice(0, -1);
  const popped = history[history.length - 1];
  const newTop = next.length > 0 ? next[next.length - 1] : undefined;
  return { history: next, popped, next: newTop };
}

/**
 * Remove all references to a closed window from the history. Used by
 * `CLOSE_WINDOW` so a back-button rewind never selects a window that no
 * longer exists.
 */
export function removeFromFocus(
  history: ReadonlyArray<WindowId>,
  id: WindowId,
): WindowId[] {
  return history.filter((entry) => entry !== id);
}

/**
 * Trim history to existing window ids only. Used when hydrating from a stale
 * localStorage snapshot — windows that no longer exist are silently dropped.
 */
export function pruneFocus(
  history: ReadonlyArray<WindowId>,
  existing: ReadonlySet<WindowId>,
): WindowId[] {
  return history.filter((entry) => existing.has(entry));
}

/**
 * Public hook returning the live window-manager state + dispatcher.
 *
 * Throws if called outside `<WindowManagerProvider>` so a regression that
 * accidentally renders an OS app component in isolation fails loudly instead
 * of silently rendering with placeholder state.
 */

"use client";

import { useContext } from "react";

import {
  WindowManagerContext,
  type WindowManagerContextValue,
} from "./WindowManagerContext";

export function useWindowManager(): WindowManagerContextValue {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) {
    throw new Error(
      "useWindowManager() called outside <WindowManagerProvider>. " +
        "Wrap your component tree with <WindowManagerProvider>.",
    );
  }
  return ctx;
}

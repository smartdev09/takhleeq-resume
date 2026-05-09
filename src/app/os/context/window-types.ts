/**
 * Type contracts for the OS window manager.
 *
 * These types are the API surface every other module depends on. They are
 * intentionally implementation-free — Phase 1A wires the reducer; Phase 1B
 * wires the UI; Phase 3 wires the apps. All three import from this file.
 */

import type { AppId } from "../apps/app-types";

export type WindowId = string;

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type WindowStatus =
  | "open"
  | "minimized"
  | "maximized"
  | "snappedLeft"
  | "snappedRight";

export interface WindowState<TProps = unknown> {
  id: WindowId;
  appId: AppId;
  appProps: TProps;
  /** Optional binding to a resume document. */
  resumeId?: string;
  /** For popped-out tools: which editor window they came from. */
  parentId?: WindowId;
  /** Which tab inside the parent editor this window represents. */
  poppedOutFromTab?: string;
  position: Position;
  size: Size;
  minSize: Size;
  zIndex: number;
  status: WindowStatus;
  /** Geometry to restore when leaving snapped/maximized. */
  preStatusGeometry?: { position: Position; size: Size };
  /** Anchor to scroll into view inside the window body. */
  scrollAnchor?: string;
  /** Modal-typed windows block sibling interaction. */
  isModal: boolean;
  openedAt: number;
  /** Title resolved at render time so resume rename reflows the title bar. */
  title: string;
}

export interface WindowManagerState {
  windows: Record<WindowId, WindowState>;
  /** Last element is the focused window. */
  zOrder: WindowId[];
  /** Stack of recently focused windows for back/forward focus rewind. */
  focusHistory: WindowId[];
  desktopSize: Size;
  /** Resume id of the most recently focused editor window. */
  currentResumeId?: string;
  /** localStorage-backed flag for the auto-opening home.md window. */
  hasShownWelcome: boolean;
  /** False until URL + localStorage have been replayed into state. */
  isHydrated: boolean;
}

export type OpenWindowOptions<TProps = unknown> = {
  appId: AppId;
  appProps?: TProps;
  resumeId?: string;
  parentId?: WindowId;
  poppedOutFromTab?: string;
  initialPosition?: Position;
  initialSize?: Size;
  scrollAnchor?: string;
  /** If a window for the same app+resume is already open, focus it instead of opening another. */
  focusIfExists?: boolean;
};

export type WindowAction =
  | { type: "HYDRATE"; payload: Partial<WindowManagerState> }
  | { type: "VIEWPORT_RESIZED"; size: Size }
  | { type: "OPEN_WINDOW"; window: WindowState }
  | { type: "CLOSE_WINDOW"; id: WindowId }
  | { type: "MOVE_WINDOW"; id: WindowId; position: Position }
  | { type: "RESIZE_WINDOW"; id: WindowId; size: Size; position?: Position }
  | { type: "BRING_TO_FRONT"; id: WindowId }
  | { type: "MINIMIZE"; id: WindowId }
  | { type: "MAXIMIZE"; id: WindowId }
  | { type: "RESTORE"; id: WindowId }
  | { type: "SNAP"; id: WindowId; side: "left" | "right" }
  | { type: "POP_OUT_TAB"; parentId: WindowId; tabId: string; appId: AppId }
  | { type: "RETURN_TO_TAB"; id: WindowId }
  | { type: "SET_SCROLL_ANCHOR"; id: WindowId; anchor: string | undefined }
  | { type: "RESTORE_FROM_URL"; specs: WindowSpec[] }
  | { type: "RESTORE_FROM_LOCALSTORAGE"; state: Partial<WindowManagerState> }
  | { type: "RESET_DESKTOP" }
  | { type: "MARK_WELCOME_SHOWN" }
  | { type: "SET_CURRENT_RESUME"; resumeId: string | undefined };

/** Compact specification used by URL parser / serializer. */
export interface WindowSpec {
  appId: AppId;
  resumeId?: string;
  scrollAnchor?: string;
  /** Optional explicit geometry from the ?windows= layout share format. */
  position?: Position;
  size?: Size;
  zIndex?: number;
}

/** Public hook surface — apps call methods here, never dispatch directly. */
export interface WindowControls {
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  bringToFront: () => void;
  snap: (side: "left" | "right") => void;
  setScrollAnchor: (anchor: string | undefined) => void;
  popOutTab: (tabId: string, appId: AppId) => void;
  returnToTab: () => void;
}

export const WINDOW_CONSTRAINTS = {
  /** Maximum simultaneously open windows. 13th open shows a toast. */
  maxOpen: 12,
  /** Sensitivity for snap-to-side (pixels past the viewport edge). */
  snapThresholdPx: 50,
  /** Padding when clamping windows to the viewport. */
  viewportPaddingPx: 16,
  /** Stacking offset when opening successive windows of the same app. */
  cascadeOffsetPx: 28,
} as const;

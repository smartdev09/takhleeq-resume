/**
 * URL ↔ window state serialization.
 *
 * Two formats live here:
 *
 *   1. Compact (`?w=...`) — human-readable, used for everyday URLs and deep
 *      links. Each top-level entry is `appId[:resumeId][#anchor]`. Adjacent
 *      popped-out tools are joined to their parent with `/`, e.g.
 *      `editor:abc-123/analyzer`. Multiple unrelated windows are joined by
 *      `,`. The last entry is the focused window.
 *
 *   2. Full layout (`?windows=...`) — base64-encoded JSON snapshot of every
 *      window's position, size, and z-index. Only produced by the explicit
 *      "Copy share link" action.
 *
 * Both deserializers MUST return `[]` for malformed input rather than throw,
 * so a hostile or stale URL never crashes the OS.
 */

import type { AppId } from "../apps/app-types";
import type {
  Position,
  Size,
  WindowManagerState,
  WindowSpec,
  WindowState,
} from "../context/window-types";

/** App ids known to the registry. Mirrors the union in `app-types.ts`. */
const KNOWN_APP_IDS: ReadonlySet<string> = new Set<AppId>([
  "home",
  "editor",
  "analyzer",
  "jobMatcher",
  "coverLetter",
  "templates",
  "myResumes",
  "parser",
  "importer",
  "docs",
  "help",
  "auth",
  "community",
  "aiSetup",
  "searchPalette",
  "trash",
]);

const RESUME_ID_RE = /[^a-zA-Z0-9_-]/g;
const ANCHOR_RE = /[^a-zA-Z0-9_-]/g;

export function sanitizeResumeId(value: string): string {
  return value.replace(RESUME_ID_RE, "").slice(0, 64);
}

export function sanitizeAnchor(value: string): string {
  return value.replace(ANCHOR_RE, "").slice(0, 64);
}

export function isKnownAppId(value: string): value is AppId {
  return KNOWN_APP_IDS.has(value);
}

/**
 * Group child windows under their parent. A child is a window whose
 * `parentId` references a window that exists in `windows`. Returns the
 * children in z-order under each parent id.
 */
function groupChildren(
  windows: Record<string, WindowState>,
  zOrder: ReadonlyArray<string>,
): Map<string, WindowState[]> {
  const out = new Map<string, WindowState[]>();
  for (const id of zOrder) {
    const w = windows[id];
    if (!w) continue;
    if (w.parentId && windows[w.parentId]) {
      const arr = out.get(w.parentId) ?? [];
      arr.push(w);
      out.set(w.parentId, arr);
    }
  }
  return out;
}

/**
 * Serialize the open windows to the compact `?w=` value. Children are joined
 * to their parents with `/`. The output is the *decoded* form — the URL layer
 * (URLSearchParams / `router.replace`) handles percent-encoding.
 */
export function serializeWindows(state: WindowManagerState): string {
  const childrenByParent = groupChildren(state.windows, state.zOrder);
  const parts: string[] = [];
  for (const id of state.zOrder) {
    const w = state.windows[id];
    if (!w) continue;
    if (w.parentId && state.windows[w.parentId]) continue;
    parts.push(formatWindow(w, childrenByParent.get(id) ?? []));
  }
  return parts.join(",");
}

function formatWindow(w: WindowState, children: WindowState[]): string {
  let out = w.appId as string;
  if (w.resumeId) out += `:${sanitizeResumeId(w.resumeId)}`;
  for (const child of children) {
    out += `/${child.appId}`;
    if (child.resumeId && child.resumeId !== w.resumeId) {
      out += `:${sanitizeResumeId(child.resumeId)}`;
    }
  }
  if (w.scrollAnchor) out += `#${sanitizeAnchor(w.scrollAnchor)}`;
  return out;
}

/**
 * Parse a compact `?w=` value back into specs. Children inherit their
 * parent's `resumeId` when they don't override it. Malformed entries are
 * silently dropped.
 */
export function deserializeWindowsCompact(value: string): WindowSpec[] {
  if (typeof value !== "string" || value.length === 0) return [];
  const out: WindowSpec[] = [];
  const groups = value.split(",");
  for (const group of groups) {
    if (!group) continue;
    const segments = group.split("/");
    let parentResumeId: string | undefined;
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      if (!segment) continue;
      const parsed = parseSegment(segment);
      if (!parsed) continue;
      if (i === 0) {
        parentResumeId = parsed.resumeId;
        out.push(parsed);
      } else {
        if (!parsed.resumeId && parentResumeId) {
          parsed.resumeId = parentResumeId;
        }
        out.push(parsed);
      }
    }
  }
  return out;
}

function parseSegment(segment: string): WindowSpec | undefined {
  let body = segment;
  let anchor: string | undefined;
  const hashIdx = body.indexOf("#");
  if (hashIdx >= 0) {
    const raw = body.slice(hashIdx + 1);
    const cleaned = sanitizeAnchor(raw);
    anchor = cleaned ? cleaned : undefined;
    body = body.slice(0, hashIdx);
  }
  const colonIdx = body.indexOf(":");
  let appId: string;
  let resumeId: string | undefined;
  if (colonIdx >= 0) {
    appId = body.slice(0, colonIdx);
    const cleaned = sanitizeResumeId(body.slice(colonIdx + 1));
    resumeId = cleaned ? cleaned : undefined;
  } else {
    appId = body;
  }
  if (!isKnownAppId(appId)) return undefined;
  const spec: WindowSpec = { appId };
  if (resumeId) spec.resumeId = resumeId;
  if (anchor) spec.scrollAnchor = anchor;
  return spec;
}

/* ----------------------- Full-layout share format ----------------------- */

interface SerializedFullSpec {
  appId: AppId;
  resumeId?: string;
  scrollAnchor?: string;
  position?: Position;
  size?: Size;
  zIndex?: number;
  parentId?: string;
  poppedOutFromTab?: string;
}

interface SerializedFullPayload {
  v: 1;
  desktop?: Size;
  windows: SerializedFullSpec[];
}

/**
 * Encode the entire window-manager layout into a base64url JSON blob suitable
 * for `?windows=...` share links.
 */
export function serializeFullLayout(state: WindowManagerState): string {
  const payload: SerializedFullPayload = {
    v: 1,
    desktop: state.desktopSize,
    windows: state.zOrder.flatMap((id, idx): SerializedFullSpec[] => {
      const w = state.windows[id];
      if (!w) return [];
      return [
        {
          appId: w.appId,
          resumeId: w.resumeId,
          scrollAnchor: w.scrollAnchor,
          position: w.position,
          size: w.size,
          zIndex: idx,
          parentId: w.parentId,
          poppedOutFromTab: w.poppedOutFromTab,
        },
      ];
    }),
  };
  return base64UrlEncode(JSON.stringify(payload));
}

/**
 * Decode a `?windows=...` blob back into specs. Returns `[]` for any kind of
 * malformed input (corrupt base64, JSON, missing fields, wrong shape).
 */
export function deserializeFullLayout(value: string): WindowSpec[] {
  if (typeof value !== "string" || value.length === 0) return [];
  let json: string;
  try {
    json = base64UrlDecode(value);
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const payload = parsed as Partial<SerializedFullPayload>;
  if (!Array.isArray(payload.windows)) return [];
  const out: WindowSpec[] = [];
  for (const entry of payload.windows) {
    const spec = coerceFullSpec(entry);
    if (spec) out.push(spec);
  }
  return out;
}

function coerceFullSpec(input: unknown): WindowSpec | undefined {
  if (!input || typeof input !== "object") return undefined;
  const e = input as SerializedFullSpec;
  if (typeof e.appId !== "string" || !isKnownAppId(e.appId)) return undefined;
  const spec: WindowSpec = { appId: e.appId };
  if (typeof e.resumeId === "string") {
    const r = sanitizeResumeId(e.resumeId);
    if (r) spec.resumeId = r;
  }
  if (typeof e.scrollAnchor === "string") {
    const a = sanitizeAnchor(e.scrollAnchor);
    if (a) spec.scrollAnchor = a;
  }
  if (isFinitePosition(e.position)) spec.position = e.position;
  if (isFiniteSize(e.size)) spec.size = e.size;
  if (typeof e.zIndex === "number" && Number.isFinite(e.zIndex)) {
    spec.zIndex = e.zIndex;
  }
  return spec;
}

function isFinitePosition(value: unknown): value is Position {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Position>;
  return (
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function isFiniteSize(value: unknown): value is Size {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<Size>;
  return (
    typeof s.width === "number" &&
    typeof s.height === "number" &&
    Number.isFinite(s.width) &&
    Number.isFinite(s.height) &&
    s.width >= 0 &&
    s.height >= 0
  );
}

/* ----------------------------- base64 helpers --------------------------- */

/**
 * Base64-url encode a UTF-8 string. Works in Node (Buffer) and browser (btoa).
 */
export function base64UrlEncode(input: string): string {
  let raw: string;
  if (typeof Buffer !== "undefined") {
    raw = Buffer.from(input, "utf8").toString("base64");
  } else {
    raw = btoa(unescape(encodeURIComponent(input)));
  }
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode a base64-url encoded string back to UTF-8. Throws on malformed
 * input — the caller (`deserializeFullLayout`) catches and returns `[]`.
 */
export function base64UrlDecode(input: string): string {
  let raw = input.replace(/-/g, "+").replace(/_/g, "/");
  while (raw.length % 4) raw += "=";
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(raw)));
}

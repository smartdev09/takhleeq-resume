/**
 * Generic placeholder body used by Phase 2's chrome smoke test.
 *
 * Phase 3 will replace each placeholder by a real app component (registered
 * via `registerApp` from the app's own module). The placeholder keeps the
 * registry shape stable so the desktop, top menu bar, and dock can call
 * `controls.openWindow('home')` etc. without a "no such app" crash.
 *
 * The component is deliberately tiny — the title bar already shows the app
 * name; the body is just confirmation that something rendered, plus any
 * scroll anchors the registry advertised so menu sub-link clicks have a
 * target during Phase 2.
 */

"use client";

import type { AppComponentProps } from "../app-types";

export interface PlaceholderAppProps extends AppComponentProps {
  /**
   * Optional anchor list rendered as in-window scroll targets so menu-bar
   * sub-anchor clicks have something to land on while real content is being
   * built. Keeps `<TopMenuBar>` Docs > AI Setup reachable end-to-end.
   */
  anchors?: ReadonlyArray<{ id: string; label: string }>;
  /** Friendly name for the body header — defaults to the windowId. */
  label?: string;
}

export default function PlaceholderApp({
  resumeId,
  windowId,
  anchors,
  label,
}: PlaceholderAppProps) {
  return (
    <div
      data-testid="placeholder-app"
      data-window-id={windowId}
      className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-os-window p-6 text-os-ink"
    >
      <header className="border-b border-os-window-border pb-3">
        <p className="text-xs uppercase tracking-wide text-os-ink-muted">
          Placeholder app
        </p>
        <h1 className="text-lg font-semibold">{label ?? "App body"}</h1>
        <p className="mt-1 text-sm text-os-ink-muted">
          Phase 3 will replace this body with the real component.
        </p>
      </header>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs text-os-ink-muted">
        <dt>Window id</dt>
        <dd className="font-mono text-os-ink">{windowId}</dd>
        {resumeId && (
          <>
            <dt>Resume id</dt>
            <dd className="font-mono text-os-ink">{resumeId}</dd>
          </>
        )}
      </dl>
      {anchors && anchors.length > 0 && (
        <nav aria-label="In-window sections" className="flex flex-col gap-3">
          {anchors.map((a) => (
            <section
              key={a.id}
              id={a.id}
              data-testid={`placeholder-anchor-${a.id}`}
              className="rounded border border-os-window-border bg-os-titlebar p-3"
            >
              <h2 className="text-sm font-medium text-os-ink">{a.label}</h2>
              <p className="text-xs text-os-ink-muted">
                Anchor target #{a.id}
              </p>
            </section>
          ))}
        </nav>
      )}
    </div>
  );
}

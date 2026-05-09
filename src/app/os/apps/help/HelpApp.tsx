/**
 * `Help` — keyboard shortcuts reference + a small FAQ about the OS
 * metaphor itself (mobile, downloads, AI privacy).
 *
 * Sections:
 *   #shortcuts — three groups (Global, Window, Navigation)
 *   #faq       — five short Q&A entries
 *
 * Same scroll-to-anchor wiring as Docs / Home.
 */

"use client";

import * as React from "react";

import type { AppComponentProps } from "os/apps/app-types";
import { useWindowManager } from "os/context/use-window-manager";

interface Shortcut {
  keys: ReadonlyArray<string>;
  action: string;
}

const GLOBAL_SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: ["Cmd", "K"], action: "Open the search palette" },
  { keys: ["?"], action: "Show this help window" },
  { keys: ["Esc"], action: "Close the focused modal" },
  { keys: ["Shift", "M"], action: "Toggle Boring Mode (no animations)" },
];

const WINDOW_SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: ["Cmd", "W"], action: "Close the focused window" },
  { keys: ["Cmd", "M"], action: "Minimize the focused window" },
  { keys: ["Cmd", "`"], action: "Cycle through open windows" },
  { keys: ["Shift", "←"], action: "Snap focused window to the left half" },
  { keys: ["Shift", "→"], action: "Snap focused window to the right half" },
];

const NAVIGATION_SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: ["Tab"], action: "Move focus across desktop icons" },
  {
    keys: ["Enter"],
    action: "Activate the focused desktop icon (also: Space)",
  },
  { keys: ["Space"], action: "Activate the focused desktop icon" },
];

interface FAQEntry {
  q: string;
  a: React.ReactNode;
}

const FAQ: ReadonlyArray<FAQEntry> = [
  {
    q: "Why is Takhleeq styled like a desktop OS?",
    a: (
      <p>
        It maps the way people actually work on a resume — multiple drafts,
        a cover letter alongside the CV, an analyzer in a side panel — onto
        a familiar visual model. You can have several resumes open at once
        without losing context, and tools like the Analyzer and Job Matcher
        can pop out into their own windows on a big monitor.
      </p>
    ),
  },
  {
    q: "Does this work on mobile?",
    a: (
      <p>
        Yes. The same desktop, same windows — icons reflow into a vertical
        2-column grid, windows open at 90% viewport width, and resize
        handles hide because touch targets need a different interaction
        model. Drag works via touch on the title bar; double-tap the title
        bar to maximize/restore.
      </p>
    ),
  },
  {
    q: "Where does my data live?",
    a: (
      <p>
        In your browser. Resumes are stored in IndexedDB; window layout in
        localStorage. There are no accounts and no server-side database.
        Sign-in via GitHub is only used to verify a star (which unlocks
        one-click PDF export); no resume data is ever uploaded.
      </p>
    ),
  },
  {
    q: "Why do I have to star the GitHub repo to download?",
    a: (
      <p>
        Stars are how an open-source project signals momentum to potential
        contributors and sponsors. Takhleeq is free forever and stays
        free; the star gate is a one-time, low-effort ask. If you genuinely
        don&apos;t have a GitHub account, the &quot;I don&apos;t have GitHub&quot;
        bypass on the star window lets you continue.
      </p>
    ),
  },
  {
    q: "Which AI provider should I pick?",
    a: (
      <p>
        Try <span className="font-semibold">Ollama</span> first if you have
        a recent laptop — it&apos;s free, fully local, and your resume
        never leaves your machine. If your machine can&apos;t run a 3B
        model, <span className="font-semibold">Google Gemini</span> has a
        generous free tier. <span className="font-semibold">Groq</span> is
        a great choice when you want fast iteration; OpenAI is the highest
        quality but paid. Configure any of these from the AI Setup window.
      </p>
    ),
  },
];

function scrollAnchorIntoView(
  container: HTMLElement | null,
  anchor: string,
): void {
  if (!container) return;
  const safe =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(anchor)
      : anchor.replace(/[^a-zA-Z0-9_-]/g, "");
  const el = container.querySelector<HTMLElement>(`#${safe}`);
  if (!el) return;
  if (typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function ShortcutRow({ keys, action }: Shortcut) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-os-window-border/60 py-1.5 last:border-0">
      <span className="text-sm text-gray-700">{action}</span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((k, idx) => (
          <React.Fragment key={`${k}-${idx}`}>
            {idx > 0 && <span className="text-gray-400">+</span>}
            <kbd className="rounded border border-os-window-border bg-os-titlebar px-1.5 py-0.5 font-mono text-xs text-foreground">
              {k}
            </kbd>
          </React.Fragment>
        ))}
      </span>
    </div>
  );
}

export default function HelpApp({
  windowId,
  appProps,
}: AppComponentProps<"help">) {
  const { state } = useWindowManager();
  const scrollAnchor = state.windows[windowId]?.scrollAnchor;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const initialAnchor = appProps.initialAnchor;
  React.useEffect(() => {
    if (!initialAnchor) return;
    scrollAnchorIntoView(containerRef.current, initialAnchor);
  }, [initialAnchor]);

  React.useEffect(() => {
    if (!scrollAnchor) return;
    scrollAnchorIntoView(containerRef.current, scrollAnchor);
  }, [scrollAnchor]);

  return (
    <div
      ref={containerRef}
      data-testid="help-app"
      data-window-id={windowId}
      className="h-full w-full overflow-y-auto bg-os-window text-foreground"
    >
      <article className="mx-auto max-w-2xl px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-6 border-b border-os-window-border pb-4">
          <p className="text-xs uppercase tracking-wide text-os-ink-muted">
            Help
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Help &amp; Shortcuts
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Everything keyboard, plus answers to the most common questions
            about how the OS-style desktop works.
          </p>
        </header>

        {/* -------------------------- Shortcuts ------------------------- */}
        <section id="shortcuts" className="scroll-mt-6 pb-8">
          <h2 className="text-xl font-semibold text-foreground">
            Keyboard Shortcuts
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Modifier keys: on Windows / Linux, replace{" "}
            <kbd className="rounded border bg-gray-50 px-1 text-[11px]">
              Cmd
            </kbd>{" "}
            with{" "}
            <kbd className="rounded border bg-gray-50 px-1 text-[11px]">
              Ctrl
            </kbd>
            .
          </p>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-os-ink-muted">
            Global
          </h3>
          <div role="list" className="mt-1">
            {GLOBAL_SHORTCUTS.map((s) => (
              <ShortcutRow key={s.action} {...s} />
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-os-ink-muted">
            Windows
          </h3>
          <div role="list" className="mt-1">
            {WINDOW_SHORTCUTS.map((s) => (
              <ShortcutRow key={s.action} {...s} />
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-os-ink-muted">
            Navigation
          </h3>
          <div role="list" className="mt-1">
            {NAVIGATION_SHORTCUTS.map((s) => (
              <ShortcutRow key={s.action} {...s} />
            ))}
          </div>
        </section>

        {/* ------------------------------ FAQ ----------------------------- */}
        <section id="faq" className="scroll-mt-6 pb-8">
          <h2 className="text-xl font-semibold text-foreground">FAQ</h2>
          <dl className="mt-3 space-y-4">
            {FAQ.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-lg border border-os-window-border bg-os-titlebar/40 p-4"
              >
                <dt className="font-semibold text-foreground">{q}</dt>
                <dd className="mt-2 text-sm leading-7 text-gray-700">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </article>
    </div>
  );
}

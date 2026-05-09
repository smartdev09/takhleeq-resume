/**
 * `Docs` — long-form usage guide rendered as a single scrollable window
 * with anchored sections so the menu bar's `Docs > <section>` items can
 * deep-link.
 *
 * Sections (top → bottom, also the registered `scrollAnchors`):
 *   #getting-started   — the 4-step happy path
 *   #ai-setup          — providers (Ollama / Gemini / Groq / OpenAI),
 *                        privacy stance, kill-switch
 *   #templates-guide   — picking and applying a template
 *   #shortcuts         — pointer to the dedicated Help window
 *
 * Scroll-to-anchor wiring is identical to `HomeApp`: read
 * `state.windows[windowId].scrollAnchor`, react on change. `appProps.initialAnchor`
 * is honoured on mount.
 */

"use client";

import * as React from "react";

import type { AppComponentProps } from "os/apps/app-types";
import { useWindowManager } from "os/context/use-window-manager";

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

export default function DocsApp({
  windowId,
  appProps,
}: AppComponentProps<"docs">) {
  const { state, controls } = useWindowManager();
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

  const openHelp = React.useCallback(() => {
    controls.openWindow({ appId: "help", focusIfExists: true });
  }, [controls]);
  const openAiSetup = React.useCallback(() => {
    controls.openWindow({ appId: "aiSetup", focusIfExists: true });
  }, [controls]);
  const openTemplates = React.useCallback(() => {
    controls.openWindow({ appId: "templates", focusIfExists: true });
  }, [controls]);
  const openImporter = React.useCallback(() => {
    controls.openWindow({ appId: "importer", focusIfExists: true });
  }, [controls]);

  return (
    <div
      ref={containerRef}
      data-testid="docs-app"
      data-window-id={windowId}
      className="h-full w-full overflow-y-auto bg-os-window text-foreground"
    >
      <article className="prose mx-auto max-w-2xl px-6 py-8 lg:px-10 lg:py-10">
        <header className="mb-6 border-b border-os-window-border pb-4">
          <p className="text-xs uppercase tracking-wide text-os-ink-muted">
            OpenResume documentation
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Docs
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            How to get the most out of the OS-style desktop. Each section
            below is a deep-linkable anchor: open from the top menu via{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              Docs &gt; …
            </code>
            .
          </p>
        </header>

        {/* ----------------------- Getting Started ----------------------- */}
        <section id="getting-started" className="scroll-mt-6 pb-8">
          <h2 className="text-xl font-semibold text-foreground">
            Getting Started
          </h2>
          <p className="mt-2 text-gray-700">
            Everything in OpenResume happens inside windows on a desktop.
            Click a desktop icon to open a window, drag the title bar to
            move it, drag a corner to resize, or drag past a viewport edge
            to snap it to half. The dock at the bottom keeps track of every
            open window.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-700">
            <li>
              <span className="font-medium">Start with a resume.</span> Open{" "}
              <em>My Resumes</em> from the desktop. Click <em>+ New</em> to
              create a blank resume, or use{" "}
              <button
                type="button"
                onClick={openImporter}
                className="text-brand underline underline-offset-2 hover:decoration-2"
              >
                Import Resume
              </button>{" "}
              to start from an existing PDF.
            </li>
            <li>
              <span className="font-medium">Edit with live preview.</span>{" "}
              The Editor window has a left-hand form and a right-hand PDF
              preview that updates as you type. Tabs across the top switch
              between Content, Theme, AI Analyzer, Job Matcher, and Cover
              Letter.
            </li>
            <li>
              <span className="font-medium">Pop tools out.</span> Click the
              pop-out icon on any tool tab (Analyzer, Job Matcher, Cover
              Letter) to break it into its own window snapped beside the
              editor — useful on big monitors.
            </li>
            <li>
              <span className="font-medium">Download.</span> Press the{" "}
              Download button in the editor; first-time downloaders are
              asked to star the GitHub repo, after which exports work
              forever.
            </li>
          </ol>
        </section>

        {/* --------------------------- AI Setup --------------------------- */}
        <section id="ai-setup" className="scroll-mt-6 pb-8">
          <h2 className="text-xl font-semibold text-foreground">AI Setup</h2>
          <p className="mt-2 text-gray-700">
            All AI features (one-click ATS improvements, bullet rewrites,
            JD-tailoring, cover letters) need an AI provider. OpenResume
            supports four, listed roughly from most-private to most-capable:
          </p>
          <ul className="mt-3 space-y-2 pl-5 text-gray-700">
            <li>
              <span className="font-semibold">Ollama (local).</span> Free.
              Runs on your machine. Data never leaves your computer. Best
              for privacy-first users; needs ~4–8 GB of RAM depending on the
              model. Recommended starter model: <code>llama3.2:3b</code>.
            </li>
            <li>
              <span className="font-semibold">Google Gemini.</span> Free
              tier (15 requests/minute). Get a key from Google AI Studio;
              paste into the AI Setup window.
            </li>
            <li>
              <span className="font-semibold">Groq.</span> Free tier with
              very fast inference. Good for snappy iterating.
            </li>
            <li>
              <span className="font-semibold">OpenAI.</span> Paid. Best
              quality results; bring your own API key.
            </li>
          </ul>
          <p className="mt-3 text-gray-700">
            Open the configuration window from anywhere via the desktop
            icon, the top menu, or this button:{" "}
            <button
              type="button"
              onClick={openAiSetup}
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Open AI Setup
            </button>
            .
          </p>
          <p className="mt-3 text-gray-700">
            Your provider config lives in browser storage only — no server
            stores keys. Disable AI entirely with the{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_DISABLE_AI
            </code>{" "}
            environment variable for self-hosted deployments.
          </p>
        </section>

        {/* ------------------------ Templates Guide ----------------------- */}
        <section id="templates-guide" className="scroll-mt-6 pb-8">
          <h2 className="text-xl font-semibold text-foreground">
            Templates Guide
          </h2>
          <p className="mt-2 text-gray-700">
            Templates are a starting layout — fonts, colors, and section
            ordering — that you can pick before or after writing your
            content. Every template is tested against top ATS platforms
            (Greenhouse, Lever) so a one-click switch never breaks parsing.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
            <li>
              Open the{" "}
              <button
                type="button"
                onClick={openTemplates}
                className="text-brand underline underline-offset-2 hover:decoration-2"
              >
                Templates
              </button>{" "}
              window from the desktop or the top menu.
            </li>
            <li>
              Use the category filter to narrow by role (Engineer, Designer,
              PM, etc.) or by visual style (Classic, Modern, Compact).
            </li>
            <li>
              Click any card to preview at full size; click{" "}
              <em>Use this template</em> to either apply to the currently
              focused resume (overwrites styling, keeps content) or create a
              new resume from it.
            </li>
          </ol>
          <p className="mt-3 text-gray-700">
            You can switch templates at any time from the Theme tab inside
            the editor.
          </p>
        </section>

        {/* --------------------------- Shortcuts -------------------------- */}
        <section id="shortcuts" className="scroll-mt-6 pb-8">
          <h2 className="text-xl font-semibold text-foreground">Shortcuts</h2>
          <p className="mt-2 text-gray-700">
            The full keyboard reference lives in the dedicated Help window
            so it stays in one place.{" "}
            <button
              type="button"
              onClick={openHelp}
              className="text-brand underline underline-offset-2 hover:decoration-2"
            >
              Open Help &amp; Shortcuts →
            </button>
          </p>
          <p className="mt-3 text-gray-700">
            The fastest two to memorise:{" "}
            <kbd className="rounded border bg-gray-50 px-1.5 py-0.5 text-xs">
              Cmd
            </kbd>
            <span className="mx-0.5">+</span>
            <kbd className="rounded border bg-gray-50 px-1.5 py-0.5 text-xs">
              K
            </kbd>{" "}
            opens the search palette;{" "}
            <kbd className="rounded border bg-gray-50 px-1.5 py-0.5 text-xs">
              Cmd
            </kbd>
            <span className="mx-0.5">+</span>
            <kbd className="rounded border bg-gray-50 px-1.5 py-0.5 text-xs">
              W
            </kbd>{" "}
            closes the focused window.
          </p>
        </section>
      </article>
    </div>
  );
}

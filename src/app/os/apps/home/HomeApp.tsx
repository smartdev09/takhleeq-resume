/**
 * `home.md` — the OS-version of the marketing home page.
 *
 * Contents (top → bottom, scrollable, anchored):
 *   #hero      — the brand pitch + primary CTAs
 *   #features  — four key value props
 *   #steps     — four "how it works" steps
 *   #faq       — questions & answers
 *
 * Why we re-implement instead of importing the marketing `<Hero>` directly:
 * the marketing version uses `next/link` to point at routes that no longer
 * exist in the OS metaphor. Inside the OS we open windows. We keep the copy
 * verbatim so design + SEO stays consistent.
 *
 * Scroll-to-anchor behavior:
 *   - On mount, if `appProps.initialAnchor` is set, scroll to it once.
 *   - On every render, watch the `scrollAnchor` value forwarded by the
 *     window manager (set when chrome menu items dispatch
 *     `setScrollAnchor`). Whenever it changes, smooth-scroll to it.
 *
 * In jsdom `Element.prototype.scrollIntoView` is `undefined`; tests polyfill
 * it. The component is defensive against the missing method so it never
 * throws.
 */

"use client";

import * as React from "react";
import {
  Globe2,
  Lock,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { Features } from "home/Features";
import { QuestionsAndAnswers } from "home/QuestionsAndAnswers";
import { Steps } from "home/Steps";
import { useWindowManager } from "os/context/use-window-manager";
import type { AppComponentProps } from "os/apps/app-types";

/* The icon list is duplicated here only as a hint for the title row in
 * the hero section — `Features.tsx` has the canonical card list. */
const HERO_VALUES: ReadonlyArray<{ icon: LucideIcon; label: string }> = [
  { icon: Sparkles, label: "AI" },
  { icon: ShieldCheck, label: "ATS-safe" },
  { icon: Lock, label: "Private" },
  { icon: Globe2, label: "Global" },
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

export default function HomeApp({
  windowId,
  appProps,
}: AppComponentProps<"home">) {
  const { state, controls } = useWindowManager();
  const scrollAnchor = state.windows[windowId]?.scrollAnchor;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  /* `initialAnchor` is the anchor the window opened on (e.g. user clicked
   * Docs > AI Setup before any docs window existed). The window manager
   * forwards subsequent menu re-clicks via `state.scrollAnchor`. Keep both
   * handlers — they may fire with the same value on mount, which is a
   * harmless duplicate scroll. */
  const initialAnchor = appProps.initialAnchor;
  React.useEffect(() => {
    if (!initialAnchor) return;
    scrollAnchorIntoView(containerRef.current, initialAnchor);
  }, [initialAnchor]);

  React.useEffect(() => {
    if (!scrollAnchor) return;
    scrollAnchorIntoView(containerRef.current, scrollAnchor);
  }, [scrollAnchor]);

  const openMyResumes = React.useCallback(() => {
    controls.openWindow({ appId: "myResumes", focusIfExists: true });
  }, [controls]);
  const openTemplates = React.useCallback(() => {
    controls.openWindow({ appId: "templates", focusIfExists: true });
  }, [controls]);
  const openParser = React.useCallback(() => {
    controls.openWindow({ appId: "parser", focusIfExists: true });
  }, [controls]);
  const openAuth = React.useCallback(() => {
    controls.openWindow({ appId: "auth", focusIfExists: true });
  }, [controls]);

  return (
    <div
      ref={containerRef}
      data-testid="home-app"
      data-window-id={windowId}
      className="h-full w-full overflow-y-auto bg-os-window text-foreground"
    >
      <article className="mx-auto max-w-3xl px-6 py-8 lg:px-10 lg:py-12">
        {/* ----------------------------- Hero ----------------------------- */}
        <section
          id="hero"
          aria-labelledby="home-hero-title"
          className="scroll-mt-6"
        >
          <button
            type="button"
            onClick={openAuth}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
          >
            <span aria-hidden>★</span>
            <span>Star on GitHub to unlock PDF export</span>
          </button>
          <h1
            id="home-hero-title"
            className="text-primary text-3xl font-bold leading-tight lg:text-4xl"
          >
            Land your next job
            <br />
            with a resume that
            <br />
            stands out
          </h1>
          <p className="mt-3 text-base text-gray-600 lg:mt-4 lg:text-lg">
            Free, open-source, AI-powered resume builder.
            <br />
            No signup required. ATS-optimized from day one.
          </p>
          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openMyResumes}
              className="rounded-full bg-[color:var(--theme-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--theme-primary)]"
            >
              Start Building &mdash; It&apos;s Free
            </button>
            <button
              type="button"
              onClick={openTemplates}
              className="rounded-full border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--theme-primary)]"
            >
              See Templates
            </button>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Already have a resume? Test its ATS readability with the{" "}
            <button
              type="button"
              onClick={openParser}
              className="text-brand underline underline-offset-2 hover:decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--theme-primary)]"
            >
              resume parser
            </button>
            .
          </p>
          <ul
            aria-label="Why OpenResume"
            className="mt-5 flex flex-wrap gap-2 text-xs text-gray-600"
          >
            {HERO_VALUES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --------------------------- Features --------------------------- */}
        <section
          id="features"
          aria-labelledby="home-features-title"
          className="scroll-mt-6 pt-2"
        >
          <h2
            id="home-features-title"
            className="text-center text-2xl font-bold lg:text-3xl"
          >
            Built for job seekers, not for sales funnels
          </h2>
          <Features />
        </section>

        {/* ----------------------------- Steps ---------------------------- */}
        <section
          id="steps"
          aria-labelledby="home-steps-title"
          className="scroll-mt-6"
        >
          <h2 id="home-steps-title" className="sr-only">
            How it works in four steps
          </h2>
          <Steps />
        </section>

        {/* ------------------------------ FAQ ----------------------------- */}
        <section
          id="faq"
          aria-labelledby="home-faq-title"
          className="scroll-mt-6 pb-2 pt-8"
        >
          <h2 id="home-faq-title" className="sr-only">
            Questions and answers
          </h2>
          <QuestionsAndAnswers />
        </section>
      </article>
    </div>
  );
}

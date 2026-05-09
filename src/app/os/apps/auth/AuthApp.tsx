/**
 * `auth` — the GitHub OAuth + repo-star flow rewritten as a window.
 *
 * Three states driven by `useAuthStatus()`:
 *   1. anonymous              → "Sign in with GitHub" CTA
 *   2. authenticated, !starred → "Star us on GitHub" CTA + 2s star polling
 *   3. authenticated && starred → confirmation
 *
 * Modality trade-off: the registry's `isModal` is static. We register
 * `auth` with `isModal: true` so download-triggered opens correctly inert
 * sibling windows. When a user opens it proactively from the desktop icon
 * or a top-menu CTA, the body shows a small "Close" link explaining they
 * can dismiss anytime. Phase 4 owns the proper fix (a callback-style
 * `isModal: (props) => boolean` in `app-types`).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

import type { AppComponentProps } from "os/apps/app-types";
import { useWindowControls } from "os/context/use-window-controls";
import { useAuthStatus } from "lib/auth/use-auth-status";
import { trackEvent, Events } from "lib/analytics";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "xitanggg/open-resume";
const REPO_URL = `https://github.com/${REPO}`;
/** Poll cadence after the user clicks "Star us on GitHub" — they may take a
 * few seconds to click Star in the new tab and switch back. */
const STAR_POLL_INTERVAL_MS = 2_000;

export default function AuthApp({
  windowId,
  appProps,
}: AppComponentProps<"auth">) {
  const controls = useWindowControls(windowId);
  const status = useAuthStatus();
  const trigger = appProps.trigger ?? "proactive";
  const isDownloadFlow = trigger === "download";

  /* When the user has clicked "Star us on GitHub" we kick off a 2s poll of
   * /api/auth/me so the window can transition to the success state without
   * a manual refresh. The poll only runs while the window thinks we're in
   * the not-starred-yet state. */
  const [polling, setPolling] = useState(false);
  const refetchRef = useRef(status.refetch);

  useEffect(() => {
    refetchRef.current = status.refetch;
  }, [status.refetch]);

  useEffect(() => {
    if (!polling) return;
    if (!status.authenticated) return;
    if (status.starred) {
      setPolling(false);
      return;
    }
    const interval = window.setInterval(() => {
      refetchRef.current();
    }, STAR_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [polling, status.authenticated, status.starred, setPolling]);

  const handleSignIn = useCallback(() => {
    trackEvent(Events.OAUTH_STARTED);
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/github";
    }
  }, []);

  const handleStarClick = useCallback(() => {
    setPolling(true);
    if (typeof window !== "undefined") {
      window.open(REPO_URL, "_blank", "noopener,noreferrer");
    }
  }, [setPolling]);

  const handleNoGithub = useCallback(() => {
    trackEvent("gate_no_github_bypass");
    status.setNoGithub(true);
    controls.close();
  }, [controls, status]);

  const handleSkipDownload = useCallback(() => {
    trackEvent(Events.GATE_DISMISSED);
    controls.close();
  }, [controls]);

  const handleClose = useCallback(() => {
    controls.close();
  }, [controls]);

  return (
    <div
      data-testid="auth-app"
      data-window-id={windowId}
      data-trigger={trigger}
      className="flex h-full w-full flex-col overflow-y-auto bg-os-window text-os-ink"
    >
      {/* Proactive-open hint: the registry marks this app modal, so even a
       * user-initiated open will inert siblings. Surface a close link so
       * they don't feel trapped. */}
      {!isDownloadFlow && (
        <div className="flex items-center justify-between border-b border-os-window-border bg-os-titlebar px-4 py-2 text-xs text-os-ink-muted">
          <span>You opened this proactively — close anytime.</span>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <XMarkIcon className="h-4 w-4" />
            Close
          </button>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 py-8 text-center">
        {status.loading ? (
          <LoadingState />
        ) : !status.authenticated ? (
          <AnonymousState
            isDownloadFlow={isDownloadFlow}
            onSignIn={handleSignIn}
            onNoGithub={handleNoGithub}
            onSkipDownload={handleSkipDownload}
          />
        ) : !status.starred ? (
          <NotStarredState
            username={status.username}
            polling={polling}
            onStarClick={handleStarClick}
          />
        ) : (
          <StarredState
            username={status.username}
            isDownloadFlow={isDownloadFlow}
            onClose={handleClose}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ sub-states ------------------------------ */

function LoadingState() {
  return (
    <div
      data-testid="auth-state-loading"
      className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-os-ink-muted"
    >
      <span>Checking your GitHub status…</span>
    </div>
  );
}

function AnonymousState({
  isDownloadFlow,
  onSignIn,
  onNoGithub,
  onSkipDownload,
}: {
  isDownloadFlow: boolean;
  onSignIn: () => void;
  onNoGithub: () => void;
  onSkipDownload: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <div
      data-testid="auth-state-anonymous"
      className="flex flex-col items-center gap-5"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <StarIcon className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-os-ink">
          Sign in with GitHub to unlock PDF export
        </h2>
        <p className="mt-2 text-sm text-os-ink-muted">
          Takhleeq is built solo and free. A star helps the project get
          discovered. In return you get a polished PDF resume, forever.
        </p>
      </div>

      <button
        type="button"
        onClick={onSignIn}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
      >
        <StarIconSolid className="h-4 w-4 text-amber-400" />
        Sign in with GitHub
      </button>

      <button
        type="button"
        onClick={() => setShowWhy((v) => !v)}
        className="text-xs text-os-ink-muted underline underline-offset-2 hover:text-os-ink"
        aria-expanded={showWhy}
        aria-controls="auth-why-explainer"
      >
        {showWhy ? "Hide" : "Why we ask"}
      </button>
      {showWhy && (
        <p
          id="auth-why-explainer"
          className="text-left text-xs text-os-ink-muted"
        >
          Takhleeq is open source and free to use. Stars are how a tiny
          project finds new contributors and stays alive — they take you ten
          seconds and cost nothing. We never ask for an email, never read
          your repos, and never share your data. Your username is stored in
          a 24-hour cookie purely so we don&apos;t ask you again.
        </p>
      )}

      <div className="w-full border-t border-os-window-border" />

      <button
        type="button"
        onClick={onNoGithub}
        className="text-xs text-os-ink-muted underline underline-offset-2 hover:text-os-ink"
      >
        I don&apos;t have GitHub
      </button>

      {isDownloadFlow && (
        <button
          type="button"
          onClick={onSkipDownload}
          className="text-xs text-os-ink-muted underline underline-offset-2 hover:text-os-ink"
        >
          Skip &amp; cancel download
        </button>
      )}
    </div>
  );
}

function NotStarredState({
  username,
  polling,
  onStarClick,
}: {
  username?: string;
  polling: boolean;
  onStarClick: () => void;
}) {
  return (
    <div
      data-testid="auth-state-not-starred"
      className="flex flex-col items-center gap-5"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <StarIcon className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-os-ink">
          {username ? `Welcome back, @${username}!` : "Welcome back!"} One
          last step: star us on GitHub
        </h2>
        <p className="mt-2 text-sm text-os-ink-muted">
          We can&apos;t see a star from your account yet. Open the repo,
          tap the Star button, then return — we&apos;ll detect it
          automatically.
        </p>
      </div>

      <button
        type="button"
        onClick={onStarClick}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-300"
      >
        <StarIconSolid className="h-4 w-4" />
        Star {REPO} on GitHub
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </button>

      {polling && (
        <p
          data-testid="auth-poll-hint"
          className="text-xs text-os-ink-muted"
        >
          Watching for your star…
        </p>
      )}
    </div>
  );
}

function StarredState({
  username,
  isDownloadFlow,
  onClose,
}: {
  username?: string;
  isDownloadFlow: boolean;
  onClose: () => void;
}) {
  return (
    <div
      data-testid="auth-state-starred"
      className="flex flex-col items-center gap-5"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-os-ink">
          Thanks for starring{username ? `, @${username}` : ""}! You&apos;re
          all set.
        </h2>
        <p className="mt-2 text-sm text-os-ink-muted">
          {isDownloadFlow
            ? "You can close this window and try downloading again."
            : "PDF export is unlocked. You can close this window."}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
      >
        Close window
      </button>

      <a
        href="/api/auth/logout"
        className="text-xs text-os-ink-muted underline underline-offset-2 hover:text-os-ink"
      >
        Sign out
      </a>
    </div>
  );
}

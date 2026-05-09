"use client";

import { useEffect, useRef } from "react";
import { XMarkIcon, StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { PrivacyNotice } from "components/auth/PrivacyNotice";
import { trackEvent, Events } from "lib/analytics";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "xitanggg/open-resume";
const REPO_URL = `https://github.com/${REPO}`;

interface StarGateModalProps {
  open: boolean;
  onClose: () => void;
  returnUrl?: string;
  /** If true, user is authenticated on GitHub but hasn't starred yet. */
  authenticated?: boolean;
  username?: string;
  onNoGithub: () => void;
}

export function StarGateModal({
  open,
  onClose,
  returnUrl,
  authenticated = false,
  username,
  onNoGithub,
}: StarGateModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Track when modal becomes visible
  useEffect(() => {
    if (open) trackEvent(Events.STAR_GATE_SHOWN);
  }, [open]);

  // Dismiss with telemetry
  const handleDismiss = () => {
    trackEvent(Events.GATE_DISMISSED);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) handleDismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  // Trap focus / prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const oauthHref = `/api/auth/github?return=${encodeURIComponent(returnUrl ?? "/dashboard?auth=success")}`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) handleDismiss();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stargate-title"
      >
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>

        {!authenticated ? (
          /* ── State 1: Unauthenticated ── */
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <StarIcon className="h-7 w-7 text-amber-500" />
            </div>

            <div>
              <h2
                id="stargate-title"
                className="text-xl font-semibold text-gray-900"
              >
                One small ask
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Takhleeq is built solo and free. A GitHub star costs you
                nothing and helps the project get discovered. In return, you get
                a polished PDF resume — forever.
              </p>
            </div>

            <a
              href={oauthHref}
              onClick={() => trackEvent(Events.OAUTH_STARTED)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              <StarIconSolid className="h-4 w-4 text-amber-400" />
              Star &amp; Sign in with GitHub
            </a>

            <PrivacyNotice />

            <div className="w-full border-t border-gray-100" />

            <button
              onClick={() => {
                trackEvent("gate_no_github_bypass");
                onNoGithub();
                onClose();
              }}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
            >
              I don&apos;t have a GitHub account — let me download anyway
            </button>
          </div>
        ) : (
          /* ── State 2: Authenticated but not starred ── */
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <StarIcon className="h-7 w-7 text-amber-500" />
            </div>

            <div>
              <h2
                id="stargate-title"
                className="text-xl font-semibold text-gray-900"
              >
                Star not detected
                {username ? `, @${username}` : ""}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We couldn&apos;t see a star from your account yet. Star the
                repo, then sign in again to download your PDF.
              </p>
            </div>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-300"
            >
              <StarIconSolid className="h-4 w-4" />
              Star {REPO} on GitHub
            </a>

            <a
              href={oauthHref}
              className="text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
            >
              I&apos;ve starred — sign in again
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

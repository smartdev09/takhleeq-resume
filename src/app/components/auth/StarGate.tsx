"use client";

import { useState, useCallback } from "react";
import { useAuthStatus } from "lib/auth/use-auth-status";
import { StarGateModal } from "components/auth/StarGateModal";
import { trackEvent, Events } from "lib/analytics";

interface StarGateProps {
  children: React.ReactNode;
  onDownload: () => void;
  /** URL to return to after successful OAuth (defaults to current page). */
  returnUrl?: string;
}

/**
 * Wraps a download trigger. Passes through immediately when:
 *  - NEXT_PUBLIC_DISABLE_STAR_GATE === "1"
 *  - User is authenticated and has starred the repo
 *  - User clicked "I don't have GitHub" this session (D11 fallback)
 *
 * Otherwise shows the StarGateModal on click.
 */
export function StarGate({ children, onDownload, returnUrl }: StarGateProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { authenticated, starred, username, noGithub, setNoGithub } =
    useAuthStatus();

  const handleNoGithub = useCallback(() => {
    setNoGithub(true);
  }, [setNoGithub]);

  const handleClick = useCallback(() => {
    // Kill-switch: bypass gate entirely
    if (process.env.NEXT_PUBLIC_DISABLE_STAR_GATE === "1") {
      onDownload();
      return;
    }

    // D11 fallback: user opted out of GitHub this session
    if (noGithub) {
      trackEvent("download_no_github_bypass");
      onDownload();
      return;
    }

    // Fully verified — let them download
    if (authenticated && starred) {
      trackEvent(Events.DOWNLOAD_AFTER_GATE);
      onDownload();
      return;
    }

    // Gate: show modal
    setModalOpen(true);
  }, [authenticated, starred, noGithub, onDownload]);

  return (
    <>
      <span
        onClick={handleClick}
        style={{ display: "contents" }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleClick();
        }}
      >
        {children}
      </span>

      <StarGateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        returnUrl={returnUrl}
        authenticated={authenticated}
        username={username}
        onNoGithub={handleNoGithub}
      />
    </>
  );
}

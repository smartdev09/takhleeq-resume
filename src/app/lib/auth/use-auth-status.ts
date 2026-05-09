"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { trackEvent, Events } from "lib/analytics";

export interface AuthStatus {
  authenticated: boolean;
  starred: boolean;
  username?: string;
  expiresAt?: string;
  loading: boolean;
  /** True when the user clicked "I don't have a GitHub account" this session. */
  noGithub: boolean;
  setNoGithub: (value: boolean) => void;
  refetch: () => void;
}

const NO_GITHUB_KEY = "or_no_github";

export function useAuthStatus(): AuthStatus {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [starred, setStarred] = useState(false);
  const [username, setUsername] = useState<string | undefined>();
  const [expiresAt, setExpiresAt] = useState<string | undefined>();
  const [noGithub, setNoGithubState] = useState(false);
  const hasFiredUrlParamEventsRef = useRef(false);

  // Load noGithub from sessionStorage on mount
  useEffect(() => {
    try {
      setNoGithubState(
        sessionStorage.getItem(NO_GITHUB_KEY) === "true"
      );
    } catch {
      // sessionStorage may be blocked in some environments
    }
  }, []);

  const setNoGithub = useCallback((value: boolean) => {
    setNoGithubState(value);
    try {
      if (value) {
        sessionStorage.setItem(NO_GITHUB_KEY, "true");
      } else {
        sessionStorage.removeItem(NO_GITHUB_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    // Capture whether this is the first load (for URL-param event firing).
    // Mark immediately to prevent double-fire in React strict-mode.
    const shouldCheckUrlParams = !hasFiredUrlParamEventsRef.current;
    hasFiredUrlParamEventsRef.current = true;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated?: boolean;
          starred?: boolean;
          username?: string;
          expiresAt?: string;
        };
        setAuthenticated(data.authenticated ?? false);
        setStarred(data.starred ?? false);
        setUsername(data.username);
        setExpiresAt(data.expiresAt);

        // Fire post-OAuth telemetry based on redirect URL params (first load only)
        if (shouldCheckUrlParams) {
          const params = new URLSearchParams(window.location.search);
          const authParam = params.get("auth");
          const authError = params.get("auth_error");
          if (authParam === "success" && data.authenticated && data.starred) {
            trackEvent(Events.OAUTH_COMPLETED);
            trackEvent(Events.DOWNLOAD_AFTER_GATE, { method: "github_star" });
          } else if (authError === "not_starred") {
            trackEvent(Events.OAUTH_FAILED_NOT_STARRED);
          } else if (authError === "state") {
            trackEvent(Events.OAUTH_FAILED_STATE);
          }
        }
      } else {
        setAuthenticated(false);
        setStarred(false);
      }
    } catch {
      setAuthenticated(false);
      setStarred(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  return {
    authenticated,
    starred,
    username,
    expiresAt,
    loading,
    noGithub,
    setNoGithub,
    refetch: fetchStatus,
  };
}

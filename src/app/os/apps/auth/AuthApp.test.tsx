/**
 * Tests for the `auth` window body.
 *
 * Strategy: mock `lib/auth/use-auth-status` so each test can drive a
 * specific state of the OAuth machine without touching the live
 * `/api/auth/me` endpoint. The window manager is provided by
 * `WindowManagerProvider` with a single `auth` window in the initial
 * state — same shape as the HomeApp tests.
 */

import "@testing-library/jest-dom";

import { lazy } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import { useWindowManager } from "os/context/use-window-manager";
import type {
  WindowManagerState,
  WindowState,
} from "os/context/window-types";
import type { AuthStatus } from "lib/auth/use-auth-status";

import AuthApp from "./AuthApp";

/* Renders the open-window count out of the manager so close-action tests
 * can assert on the underlying state without depending on the WindowsLayer
 * to unmount AuthApp (we mount it directly, by design). */
function StateProbe() {
  const { state } = useWindowManager();
  return (
    <div
      data-testid="state-probe"
      data-window-count={String(Object.keys(state.windows).length)}
    />
  );
}

/* ----------------------------- mock setup ------------------------------ */

// `lib/analytics` pulls in the ESM-only `@vercel/analytics` package which
// jest-environment-jsdom can't load without an extra transform. Stub it.
jest.mock("lib/analytics", () => ({
  trackEvent: jest.fn(),
  Events: {
    OAUTH_STARTED: "oauth_started",
    GATE_DISMISSED: "gate_dismissed",
  },
}));

const setNoGithubMock = jest.fn();
const refetchMock = jest.fn();
let mockStatus: AuthStatus = makeStatus({});

jest.mock("lib/auth/use-auth-status", () => ({
  useAuthStatus: () => mockStatus,
}));

function makeStatus(overrides: Partial<AuthStatus>): AuthStatus {
  return {
    authenticated: false,
    starred: false,
    username: undefined,
    expiresAt: undefined,
    loading: false,
    noGithub: false,
    setNoGithub: setNoGithubMock,
    refetch: refetchMock,
    ...overrides,
  };
}

function setStatus(overrides: Partial<AuthStatus>) {
  mockStatus = makeStatus(overrides);
}

/* ---------------------------- registry seed ---------------------------- */

const Stub = lazy(async () => ({ default: () => null }));

function makeApp<K extends AppId>(
  appId: K,
  partial: Partial<RegisteredApp<K>> = {},
): RegisteredApp<K> {
  return {
    appId,
    title: () => appId as string,
    icon: () => null,
    desktopLabel: appId as string,
    defaultSize: { width: 540, height: 520 },
    minSize: { width: 380, height: 360 },
    defaultPosition: "center",
    bind: "standalone",
    showOnDesktop: true,
    Component: Stub as RegisteredApp<K>["Component"],
    ...partial,
  };
}

function makeAuthWindow(
  appProps: Partial<{
    trigger?: "download" | "proactive";
    returnAction?: string;
  }> = {},
): WindowState {
  return {
    id: "w-auth",
    appId: "auth",
    appProps,
    position: { x: 0, y: 0 },
    size: { width: 540, height: 520 },
    minSize: { width: 380, height: 360 },
    zIndex: 1,
    status: "open",
    isModal: true,
    openedAt: 0,
    title: "Sign in & Star",
  };
}

function makeInitialState(
  windowOverride?: WindowState,
): Partial<WindowManagerState> {
  const w = windowOverride ?? makeAuthWindow();
  return {
    windows: { [w.id]: w },
    zOrder: [w.id],
    isHydrated: true,
  };
}

function renderAuth(
  appProps: { trigger?: "download" | "proactive"; returnAction?: string } = {},
) {
  const w = makeAuthWindow(appProps);
  return render(
    <WindowManagerProvider
      initialState={makeInitialState(w)}
      disablePersistence
      router={null}
    >
      <StateProbe />
      <AuthApp windowId="w-auth" appProps={appProps} />
    </WindowManagerProvider>,
  );
}

function getWindowCount(): number {
  const probe = screen.getByTestId("state-probe");
  return Number(probe.getAttribute("data-window-count") ?? "0");
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("auth", { isModal: true }));
  setStatus({});
  setNoGithubMock.mockClear();
  refetchMock.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
  jest.useRealTimers();
});

describe("<AuthApp>", () => {
  describe("loading state", () => {
    it("shows the loading hint while useAuthStatus is fetching", () => {
      setStatus({ loading: true });
      renderAuth();
      expect(screen.getByTestId("auth-state-loading")).toBeInTheDocument();
    });
  });

  describe("anonymous state", () => {
    it("renders the sign-in CTA and explainer toggle", () => {
      setStatus({});
      renderAuth();
      expect(screen.getByTestId("auth-state-anonymous")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /sign in with github to unlock pdf export/i,
        }),
      ).toBeInTheDocument();
      const why = screen.getByRole("button", { name: /why we ask/i });
      expect(why).toHaveAttribute("aria-expanded", "false");
      act(() => {
        fireEvent.click(why);
      });
      expect(
        screen.getByRole("button", { name: /hide/i }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText(/openresume is open source and free to use/i),
      ).toBeInTheDocument();
    });

    it("clicks the sign-in button → window.location.href is set to /api/auth/github", () => {
      setStatus({});
      renderAuth();
      const originalLocation = window.location;
      const setter = jest.fn();
      const fakeLocation = {} as Location;
      Object.defineProperty(fakeLocation, "href", {
        configurable: true,
        get: () => originalLocation.href,
        set: (v: string) => setter(v),
      });
      Object.defineProperty(window, "location", {
        configurable: true,
        value: fakeLocation,
      });
      try {
        act(() => {
          fireEvent.click(
            screen.getByRole("button", { name: /sign in with github/i }),
          );
        });
        expect(setter).toHaveBeenCalledWith("/api/auth/github");
      } finally {
        Object.defineProperty(window, "location", {
          configurable: true,
          value: originalLocation,
        });
      }
    });

    it("'I don't have GitHub' calls setNoGithub(true) and closes the window", () => {
      setStatus({});
      renderAuth();
      expect(getWindowCount()).toBe(1);
      act(() => {
        fireEvent.click(
          screen.getByRole("button", { name: /i don't have github/i }),
        );
      });
      expect(setNoGithubMock).toHaveBeenCalledWith(true);
      expect(getWindowCount()).toBe(0);
    });

    it("'Skip & cancel download' is only shown in download trigger mode", () => {
      setStatus({});
      renderAuth({ trigger: "proactive" });
      expect(
        screen.queryByRole("button", { name: /skip & cancel download/i }),
      ).not.toBeInTheDocument();
    });

    it("'Skip & cancel download' closes the window when shown", () => {
      setStatus({});
      renderAuth({ trigger: "download" });
      const skip = screen.getByRole("button", {
        name: /skip & cancel download/i,
      });
      expect(getWindowCount()).toBe(1);
      act(() => {
        fireEvent.click(skip);
      });
      expect(getWindowCount()).toBe(0);
    });
  });

  describe("not-starred state", () => {
    it("renders the star CTA with the username", () => {
      setStatus({ authenticated: true, starred: false, username: "alice" });
      renderAuth();
      expect(screen.getByTestId("auth-state-not-starred")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /welcome back, @alice!/i,
        }),
      ).toBeInTheDocument();
    });

    it("clicking 'Star us on GitHub' opens the repo and starts polling", () => {
      jest.useFakeTimers();
      const openSpy = jest
        .spyOn(window, "open")
        .mockImplementation(() => null);
      try {
        setStatus({ authenticated: true, starred: false, username: "alice" });
        renderAuth();
        const star = screen.getByRole("button", {
          name: /star .* on github/i,
        });
        act(() => {
          fireEvent.click(star);
        });
        expect(openSpy).toHaveBeenCalledWith(
          expect.stringMatching(/^https:\/\/github\.com\//),
          "_blank",
          expect.stringContaining("noopener"),
        );
        expect(screen.getByTestId("auth-poll-hint")).toBeInTheDocument();
        // The 2s interval should drive refetch at least once.
        act(() => {
          jest.advanceTimersByTime(2_100);
        });
        expect(refetchMock).toHaveBeenCalled();
      } finally {
        openSpy.mockRestore();
      }
    });
  });

  describe("starred state", () => {
    it("renders the success state and a sign-out link", () => {
      setStatus({ authenticated: true, starred: true, username: "alice" });
      renderAuth();
      expect(screen.getByTestId("auth-state-starred")).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: /thanks for starring, @alice/i,
        }),
      ).toBeInTheDocument();
      const signOut = screen.getByRole("link", { name: /sign out/i });
      expect(signOut).toHaveAttribute("href", "/api/auth/logout");
    });

    it("download trigger mode shows the 'try downloading again' hint", () => {
      setStatus({ authenticated: true, starred: true });
      renderAuth({ trigger: "download" });
      expect(
        screen.getByText(/you can close this window and try downloading again/i),
      ).toBeInTheDocument();
    });

    it("close-window button dismisses the window", () => {
      setStatus({ authenticated: true, starred: true });
      renderAuth();
      expect(getWindowCount()).toBe(1);
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: /close window/i }));
      });
      expect(getWindowCount()).toBe(0);
    });
  });

  describe("modality affordance", () => {
    it("proactive trigger shows the 'opened proactively' header + close link", () => {
      setStatus({});
      renderAuth({ trigger: "proactive" });
      const root = screen.getByTestId("auth-app");
      expect(root).toHaveAttribute("data-trigger", "proactive");
      expect(
        screen.getByText(/you opened this proactively/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^close$/i }),
      ).toBeInTheDocument();
    });

    it("download trigger hides the 'opened proactively' affordance", () => {
      setStatus({});
      renderAuth({ trigger: "download" });
      const root = screen.getByTestId("auth-app");
      expect(root).toHaveAttribute("data-trigger", "download");
      expect(
        screen.queryByText(/you opened this proactively/i),
      ).not.toBeInTheDocument();
    });
  });
});

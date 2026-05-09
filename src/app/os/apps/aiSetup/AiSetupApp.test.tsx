/**
 * Tests for the `aiSetup` window body.
 *
 * Strategy: render with WindowManagerProvider, exercise the visible
 * affordances (header, expandable advanced section, close button). The
 * underlying provider classes (Ollama / Gemini / etc) are not contacted
 * because the body never auto-selects a provider on mount; tests only
 * touch state once the user clicks into the advanced accordion. We mock
 * `OllamaProvider.isAvailable` to short-circuit the 4s polling effect.
 */

import "@testing-library/jest-dom";

// `lib/analytics` pulls in the ESM-only `@vercel/analytics` package which
// jest-environment-jsdom can't load without an extra transform. Stub it.
jest.mock("lib/analytics", () => ({
  trackEvent: jest.fn(),
  Events: { PROVIDER_CONFIGURED: "provider_configured" },
}));

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
import { OllamaProvider } from "lib/agent/providers/ollama";

import AiSetupApp from "./AiSetupApp";

/* Renders the open-window count out of the manager so close-button tests
 * can assert on the underlying state without depending on the WindowsLayer
 * to unmount AiSetupApp (we mount it directly, by design). */
function StateProbe() {
  const { state } = useWindowManager();
  return (
    <div
      data-testid="state-probe"
      data-window-count={String(Object.keys(state.windows).length)}
    />
  );
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
    defaultSize: { width: 640, height: 600 },
    minSize: { width: 460, height: 420 },
    defaultPosition: "center",
    bind: "standalone",
    showOnDesktop: true,
    Component: Stub as RegisteredApp<K>["Component"],
    ...partial,
  };
}

function makeAiSetupWindow(): WindowState {
  return {
    id: "w-ai",
    appId: "aiSetup",
    appProps: {},
    position: { x: 0, y: 0 },
    size: { width: 640, height: 600 },
    minSize: { width: 460, height: 420 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "AI Setup",
  };
}

function makeInitialState(): Partial<WindowManagerState> {
  const w = makeAiSetupWindow();
  return {
    windows: { [w.id]: w },
    zOrder: [w.id],
    isHydrated: true,
  };
}

function renderAiSetup() {
  return render(
    <WindowManagerProvider
      initialState={makeInitialState()}
      disablePersistence
      router={null}
    >
      <StateProbe />
      <AiSetupApp windowId="w-ai" appProps={{}} />
    </WindowManagerProvider>,
  );
}

function getWindowCount(): number {
  const probe = screen.getByTestId("state-probe");
  return Number(probe.getAttribute("data-window-count") ?? "0");
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("aiSetup"));
  // Stub Ollama detection so the periodic 4s effect doesn't try to hit
  // localhost during tests.
  jest.spyOn(OllamaProvider.prototype, "isAvailable").mockResolvedValue(false);
  jest.spyOn(OllamaProvider.prototype, "listModels").mockResolvedValue([]);
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
  jest.restoreAllMocks();
});

describe("<AiSetupApp>", () => {
  it("renders the header inside the window (no fixed-position dialog)", () => {
    renderAiSetup();
    const root = screen.getByTestId("ai-setup-app");
    expect(root).toHaveAttribute("data-window-id", "w-ai");
    expect(
      screen.getByRole("heading", { name: /ai agent settings/i }),
    ).toBeInTheDocument();
    // The legacy fixed overlay used role="dialog"; we should NOT render one.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts with the Advanced accordion collapsed and toggles open", () => {
    renderAiSetup();
    expect(
      screen.queryByRole("button", { name: /ollama \(local\)/i }),
    ).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", {
      name: /advanced — use your own api key/i,
    });
    act(() => {
      fireEvent.click(toggle);
    });
    expect(
      screen.getByRole("button", { name: /ollama \(local\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /google gemini/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /openai requires/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /groq free tier/i }),
    ).toBeInTheDocument();
  });

  it("clicking the close button closes the window", () => {
    renderAiSetup();
    expect(getWindowCount()).toBe(1);
    const close = screen.getByRole("button", { name: /close ai setup/i });
    act(() => {
      fireEvent.click(close);
    });
    expect(getWindowCount()).toBe(0);
  });

  it("selecting a key-based provider reveals the API Key input", () => {
    renderAiSetup();
    act(() => {
      fireEvent.click(
        screen.getByRole("button", {
          name: /advanced — use your own api key/i,
        }),
      );
    });
    act(() => {
      fireEvent.click(
        screen.getByRole("button", { name: /google gemini/i }),
      );
    });
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    // Test Connection button starts disabled until an API key is typed.
    const testBtn = screen.getByRole("button", { name: /test connection/i });
    expect(testBtn).toBeDisabled();
    act(() => {
      fireEvent.change(screen.getByLabelText(/api key/i), {
        target: { value: "AIza-test" },
      });
    });
    expect(testBtn).not.toBeDisabled();
  });
});

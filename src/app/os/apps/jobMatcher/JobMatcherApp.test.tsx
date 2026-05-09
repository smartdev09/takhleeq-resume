/**
 * Tests for `<JobMatcherApp>`.
 *
 * Coverage:
 *  - With a `resumeId` in `appProps`, the picker is hidden and the body
 *    renders.
 *  - Without `resumeId`, the picker renders and selecting one rebinds.
 *  - The generalised `onSwitchTab` callback opens or focuses an `editor`
 *    window for the bound resume id (Phase 3 behaviour: focus editor
 *    instead of switching tabs in this window).
 */

import "@testing-library/jest-dom";

import * as React from "react";
import { lazy } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import { useWindowManager } from "os/context/use-window-manager";
import type { WindowManagerState } from "os/context/window-types";
import { store } from "lib/redux/store";
import { setResume, initialResumeState } from "lib/redux/resumeSlice";

/* ---- Mocks -------------------------------------------------------------- */

// `lib/analytics` pulls in the ESM-only `@vercel/analytics` package which
// jest-environment-jsdom can't load without an extra transform. Stub it.
jest.mock("lib/analytics", () => ({
  trackEvent: jest.fn(),
  Events: new Proxy(
    {},
    { get: (_t, prop: string) => prop },
  ),
}));

// JobMatcherFlow is a heavy real component; replace with a stub that
// exposes the `onSwitchTab` callback for assertion.
let lastFlowProps: {
  onSwitchTab?: (tab: string) => void;
  onSessionChange?: (s: unknown) => void;
  initialJobDescription?: string;
} | null = null;

jest.mock("components/agent/job-matcher/JobMatcherFlow", () => ({
  JobMatcherFlow: (props: {
    onSwitchTab?: (tab: string) => void;
    onSessionChange?: (s: unknown) => void;
    initialJobDescription?: string;
  }) => {
    lastFlowProps = props;
    return (
      <div data-testid="mock-job-matcher-flow">
        <button
          type="button"
          data-testid="mock-switch-to-editor"
          onClick={() => props.onSwitchTab?.("content-editor")}
        >
          edit in editor
        </button>
      </div>
    );
  },
}));

jest.mock("lib/redux/hooks", () => {
  const actual = jest.requireActual("lib/redux/hooks");
  return {
    ...actual,
    useIndexedDBResumeSync: jest.fn(),
  };
});

jest.mock("lib/storage/resume-store", () => ({
  listResumes: jest.fn(),
}));

import * as resumeStore from "lib/storage/resume-store";
import * as reduxHooks from "lib/redux/hooks";
import JobMatcherApp from "./JobMatcherApp";

const mockListResumes = resumeStore.listResumes as jest.MockedFunction<
  typeof resumeStore.listResumes
>;
const mockUseIndexedDBResumeSync =
  reduxHooks.useIndexedDBResumeSync as jest.MockedFunction<
    typeof reduxHooks.useIndexedDBResumeSync
  >;

/* ---- Helpers ------------------------------------------------------------ */

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
    defaultSize: { width: 700, height: 550 },
    minSize: { width: 320, height: 200 },
    defaultPosition: "center",
    bind: "standalone",
    showOnDesktop: true,
    Component: Stub as RegisteredApp<K>["Component"],
    ...partial,
  };
}

function StateProbe() {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
    resumeId: w.resumeId,
  }));
  return (
    <div
      data-testid="state-probe"
      data-windows={JSON.stringify(summary)}
    />
  );
}

function readWindows() {
  return JSON.parse(
    screen.getByTestId("state-probe").getAttribute("data-windows") ?? "[]",
  ) as Array<{ id: string; appId: string; resumeId?: string }>;
}

function renderApp(
  props: { resumeId?: string; initialJobDescription?: string } = {},
) {
  const initialState: Partial<WindowManagerState> = {
    isHydrated: true,
    desktopSize: { width: 1440, height: 900 },
  };
  return render(
    <Provider store={store}>
      <WindowManagerProvider
        initialState={initialState}
        disablePersistence
        router={null}
      >
        <StateProbe />
        <JobMatcherApp
          windowId="w-job-matcher"
          appProps={
            props as { resumeId?: string; initialJobDescription?: string }
          }
          resumeId={props.resumeId}
        />
      </WindowManagerProvider>
    </Provider>,
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(
    makeApp("jobMatcher", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "jobMatcher" },
    }),
  );
  registerApp(makeApp("editor", { bind: "resume", showOnDesktop: false }));
  mockListResumes.mockReset();
  mockUseIndexedDBResumeSync.mockReset();
  lastFlowProps = null;
  store.dispatch(setResume(initialResumeState));
});

afterEach(() => {
  __resetRegistryForTests();
});

/* ---- Tests -------------------------------------------------------------- */

describe("<JobMatcherApp> with bound resumeId", () => {
  it("hides the picker and renders the flow", () => {
    renderApp({ resumeId: "rid-1" });
    expect(screen.queryByTestId("job-matcher-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-job-matcher-flow")).toBeInTheDocument();
  });

  it("calls useIndexedDBResumeSync with the bound id", () => {
    renderApp({ resumeId: "rid-9" });
    expect(mockUseIndexedDBResumeSync).toHaveBeenCalledWith("rid-9");
  });

  it("forwards initialJobDescription to the underlying flow", () => {
    renderApp({ resumeId: "rid-1", initialJobDescription: "Hello JD" });
    expect(lastFlowProps?.initialJobDescription).toBe("Hello JD");
  });
});

describe("<JobMatcherApp> standalone (no bound resumeId)", () => {
  it("renders the picker and rebinds on selection", async () => {
    mockListResumes.mockResolvedValue([
      {
        id: "rid-A",
        name: "A",
        resume: initialResumeState,
        settings: {} as never,
        createdAt: "now",
        updatedAt: "now",
      },
    ]);
    renderApp({});
    expect(screen.getByTestId("job-matcher-picker")).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    const select = screen.getByLabelText(
      /^Tailor for which resume:$/,
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "rid-A" } });
    const calls = mockUseIndexedDBResumeSync.mock.calls.map((c) => c[0]);
    expect(calls).toContain("rid-A");
  });
});

describe("<JobMatcherApp> onSwitchTab → focus editor", () => {
  it("opens (or focuses) an editor window for the bound resume", () => {
    renderApp({ resumeId: "rid-42" });
    act(() => {
      fireEvent.click(screen.getByTestId("mock-switch-to-editor"));
    });
    const editors = readWindows().filter(
      (w) => w.appId === "editor" && w.resumeId === "rid-42",
    );
    expect(editors).toHaveLength(1);
  });

  it("with no bound resumeId, onSwitchTab is a no-op (nothing to focus)", () => {
    mockListResumes.mockResolvedValue([]);
    renderApp({});
    act(() => {
      fireEvent.click(screen.getByTestId("mock-switch-to-editor"));
    });
    expect(
      readWindows().filter((w) => w.appId === "editor"),
    ).toHaveLength(0);
  });
});

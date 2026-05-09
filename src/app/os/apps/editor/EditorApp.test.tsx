/**
 * Tests for `<EditorApp>` — the resume editor mounted as an OS window.
 *
 * Coverage:
 *  - Renders the 5-tab nav with the right labels.
 *  - Pop-out icon appears next to Analyzer / Job Matcher / Cover Letter and
 *    is absent next to Content Editor / Designer.
 *  - Clicking pop-out dispatches POP_OUT_TAB and creates a child window
 *    bound to the same resume.
 *  - When a tab is popped out, the editor's body for that tab renders the
 *    "popped out" stub instead of the real tab content.
 *  - The pop-out icon flips to a "return" icon when popped out, and clicking
 *    it dispatches RETURN_TO_TAB.
 *
 * The heavy resume-form / preview / agent components are mocked so the test
 * stays focused on the editor-shell behaviour.
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
import type {
  WindowManagerState,
  WindowState,
} from "os/context/window-types";
import { store } from "lib/redux/store";

/* ---- Mocks -------------------------------------------------------------- */

jest.mock("components/Resume", () => ({
  Resume: () => <div data-testid="mock-resume-preview" />,
}));

jest.mock("components/ResumeForm", () => ({
  ResumeForm: () => <div data-testid="mock-resume-form" />,
}));

jest.mock("components/builder/DesignerTab", () => ({
  DesignerTab: () => <div data-testid="mock-designer-tab" />,
}));

jest.mock("components/agent/AnalyzerTab", () => ({
  AnalyzerTab: () => <div data-testid="mock-analyzer-tab" />,
}));

jest.mock("components/agent/JobMatcherTab", () => ({
  JobMatcherTab: () => <div data-testid="mock-job-matcher-tab" />,
}));

jest.mock("components/ResumeForm/CoverLetterForm", () => ({
  CoverLetterForm: () => <div data-testid="mock-cover-letter-form" />,
}));

jest.mock("components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-sheet">{children}</div>
  ),
}));

jest.mock("lib/redux/hooks", () => {
  const actual = jest.requireActual("lib/redux/hooks");
  return {
    ...actual,
    useSetInitialStore: () => undefined,
    useSaveStateToLocalStorageOnChange: () => undefined,
    useIndexedDBResumeSync: () => undefined,
  };
});

import EditorApp from "./EditorApp";

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

function makeEditorWindow(): WindowState {
  return {
    id: "w-editor",
    appId: "editor",
    appProps: { resumeId: "rid-1" },
    resumeId: "rid-1",
    position: { x: 100, y: 100 },
    size: { width: 1100, height: 750 },
    minSize: { width: 720, height: 480 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "Editor",
  };
}

function makeInitialState(
  windows: WindowState[],
): Partial<WindowManagerState> {
  const map: Record<string, WindowState> = {};
  for (const w of windows) map[w.id] = w;
  return {
    windows: map,
    zOrder: windows.map((w) => w.id),
    desktopSize: { width: 1440, height: 900 },
    isHydrated: true,
  };
}

function StateProbe() {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
    parentId: w.parentId,
    poppedOutFromTab: w.poppedOutFromTab,
    resumeId: w.resumeId,
    status: w.status,
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
  ) as Array<{
    id: string;
    appId: string;
    parentId?: string;
    poppedOutFromTab?: string;
    resumeId?: string;
    status: string;
  }>;
}

function renderApp(initialWindows: WindowState[] = [makeEditorWindow()]) {
  return render(
    <Provider store={store}>
      <WindowManagerProvider
        initialState={makeInitialState(initialWindows)}
        disablePersistence
        router={null}
      >
        <StateProbe />
        <EditorApp
          windowId="w-editor"
          appProps={{ resumeId: "rid-1" }}
          resumeId="rid-1"
        />
      </WindowManagerProvider>
    </Provider>,
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("editor", { bind: "resume", showOnDesktop: false }));
  registerApp(
    makeApp("analyzer", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "analyzer" },
    }),
  );
  registerApp(
    makeApp("jobMatcher", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "jobMatcher" },
    }),
  );
  registerApp(
    makeApp("coverLetter", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "coverLetter" },
    }),
  );
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

/* ---- Tests -------------------------------------------------------------- */

describe("<EditorApp> tab nav", () => {
  it("renders all five builder tabs", () => {
    renderApp();
    expect(screen.getByTestId("editor-tab-content-editor")).toBeInTheDocument();
    expect(screen.getByTestId("editor-tab-designer")).toBeInTheDocument();
    expect(screen.getByTestId("editor-tab-analyzer")).toBeInTheDocument();
    expect(screen.getByTestId("editor-tab-job-matcher")).toBeInTheDocument();
    expect(screen.getByTestId("editor-tab-cover-letter")).toBeInTheDocument();
  });

  it("starts on Content Editor and switches tabs on click", () => {
    renderApp();
    expect(screen.getByTestId("mock-resume-form")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("editor-tab-designer"));
    expect(screen.getByTestId("mock-designer-tab")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("editor-tab-analyzer"));
    expect(screen.getByTestId("mock-analyzer-tab")).toBeInTheDocument();
  });

  it("only shows pop-out icons next to Analyzer / Job Matcher / Cover Letter", () => {
    renderApp();
    expect(
      screen.queryByTestId("editor-popout-content-editor"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("editor-popout-designer")).not.toBeInTheDocument();
    expect(screen.getByTestId("editor-popout-analyzer")).toBeInTheDocument();
    expect(screen.getByTestId("editor-popout-job-matcher")).toBeInTheDocument();
    expect(screen.getByTestId("editor-popout-cover-letter")).toBeInTheDocument();
  });
});

describe("<EditorApp> pop-out behaviour", () => {
  it("clicking pop-out on the Analyzer tab spawns a child analyzer window", () => {
    renderApp();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-analyzer"));
    });
    const child = readWindows().find((w) => w.appId === "analyzer");
    expect(child).toBeDefined();
    expect(child?.parentId).toBe("w-editor");
    expect(child?.poppedOutFromTab).toBe("analyzer");
    expect(child?.resumeId).toBe("rid-1");
  });

  it("renders the 'popped out' stub when the active tab is popped out", () => {
    renderApp();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-tab-analyzer"));
    });
    expect(screen.getByTestId("mock-analyzer-tab")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-analyzer"));
    });
    expect(screen.queryByTestId("mock-analyzer-tab")).not.toBeInTheDocument();
    expect(screen.getByTestId("popped-out-stub")).toBeInTheDocument();
  });

  it("flips the pop-out icon to a return arrow when popped out", () => {
    renderApp();
    const before = screen.getByTestId("editor-popout-analyzer");
    expect(before).toHaveAttribute("aria-label", "Pop out Analyzer tab");
    act(() => {
      fireEvent.click(before);
    });
    const after = screen.getByTestId("editor-popout-analyzer");
    expect(after).toHaveAttribute("aria-label", "Return Analyzer tab");
  });

  it("clicking the return-tab icon dispatches RETURN_TO_TAB and removes the child", () => {
    renderApp();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-analyzer"));
    });
    expect(readWindows().some((w) => w.appId === "analyzer")).toBe(true);
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-analyzer"));
    });
    expect(readWindows().some((w) => w.appId === "analyzer")).toBe(false);
  });

  it("Job Matcher and Cover Letter pop-outs spawn the right app id", () => {
    renderApp();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-job-matcher"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-cover-letter"));
    });
    const appIds = readWindows().map((w) => w.appId);
    expect(appIds).toContain("jobMatcher");
    expect(appIds).toContain("coverLetter");
  });
});

describe("<EditorApp> popped-out stub controls", () => {
  it("Focus window button focuses the existing popped-out window", () => {
    renderApp();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-tab-analyzer"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-analyzer"));
    });
    // Click "Focus window" inside the stub.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /focus window/i }));
    });
    // The analyzer window should remain present (focusIfExists found it).
    expect(readWindows().filter((w) => w.appId === "analyzer")).toHaveLength(1);
  });

  it("Return to tab button dispatches RETURN_TO_TAB", () => {
    renderApp();
    act(() => {
      fireEvent.click(screen.getByTestId("editor-tab-analyzer"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("editor-popout-analyzer"));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /return to tab/i }));
    });
    expect(readWindows().some((w) => w.appId === "analyzer")).toBe(false);
    expect(screen.queryByTestId("popped-out-stub")).not.toBeInTheDocument();
  });
});

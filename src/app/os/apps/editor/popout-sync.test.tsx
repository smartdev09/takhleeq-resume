/**
 * **The most important test in Phase 3F.**
 *
 * Real-time pop-out sync proof. Renders an editor window AND a popped-out
 * analyzer window backed by the same Redux store, then dispatches a single
 * `setResume(...)` action and asserts that the analyzer's ATS score
 * number changes synchronously — within the same React tick, with no
 * `waitFor` / no remount.
 *
 * If anyone in the future regresses the sync model (e.g. by snapshotting
 * resume data into local React state via `useState(useAppSelector(...))`)
 * this test fails loudly. The lint rule `no-resume-snapshot-in-state` is
 * the first line of defence; this test is the second.
 *
 * Constraints honoured here:
 *  - No `waitFor`. The Redux update is propagated by react-redux's
 *    `useSyncExternalStore` subscription, which flushes inside `act()`
 *    synchronously. Asserting against `screen.getBy*` immediately after
 *    `act()` is enough.
 *  - No remount. Both apps are mounted exactly once; we just dispatch.
 */

import "@testing-library/jest-dom";

import * as React from "react";
import { lazy } from "react";
import { act, render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import type {
  WindowManagerState,
  WindowState,
} from "os/context/window-types";
import { store } from "lib/redux/store";
import {
  initialResumeState,
  setResume,
} from "lib/redux/resumeSlice";
import type { Resume } from "lib/redux/types";

/* ---- Mocks -------------------------------------------------------------- */

// `lib/analytics` pulls in the ESM-only `@vercel/analytics` package which
// jest-environment-jsdom can't load without an extra transform.
jest.mock("lib/analytics", () => ({
  trackEvent: jest.fn(),
  Events: new Proxy(
    {},
    { get: (_t, prop: string) => prop },
  ),
}));

// The live `<Resume />` PDF preview is heavy and irrelevant to this test.
jest.mock("components/Resume", () => ({
  Resume: () => <div data-testid="mock-resume-preview" />,
}));

// The resume form is heavy and irrelevant — we only need the editor shell
// + the analyzer tab body to verify sync.
jest.mock("components/ResumeForm", () => ({
  ResumeForm: () => <div data-testid="mock-resume-form" />,
}));

// Designer + JobMatcher + CoverLetter are mocked because we never switch to
// them in this test, but importing them via EditorApp would otherwise pull
// in @react-pdf and friends.
jest.mock("components/builder/DesignerTab", () => ({
  DesignerTab: () => null,
}));
jest.mock("components/agent/JobMatcherTab", () => ({
  JobMatcherTab: () => null,
}));
jest.mock("components/ResumeForm/CoverLetterForm", () => ({
  CoverLetterForm: () => null,
}));
jest.mock("components/agent/AgentSetup", () => ({
  AgentSetup: () => null,
}));
jest.mock("components/agent/DiffReview", () => ({
  DiffReview: () => null,
}));

jest.mock("components/ui/sheet", () => ({
  Sheet: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-sheet">{children}</div>
  ),
}));

// IndexedDB sync would race with our explicit Redux dispatches; no-op it.
jest.mock("lib/redux/hooks", () => {
  const actual = jest.requireActual("lib/redux/hooks");
  return {
    ...actual,
    useSetInitialStore: () => undefined,
    useSaveStateToLocalStorageOnChange: () => undefined,
    useIndexedDBResumeSync: () => undefined,
  };
});

// The standalone analyzer's resume picker calls `listResumes` on mount.
// We provide an empty list since this test binds via `appProps.resumeId`.
jest.mock("lib/storage/resume-store", () => ({
  listResumes: jest.fn().mockResolvedValue([]),
}));

import EditorApp from "../editor/EditorApp";
import AnalyzerApp from "../analyzer/AnalyzerApp";

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

function makeWindow(overrides: Partial<WindowState> & Pick<WindowState, "id" | "appId">): WindowState {
  return {
    appProps: { resumeId: "rid-1" },
    resumeId: "rid-1",
    position: { x: 0, y: 0 },
    size: { width: 720, height: 600 },
    minSize: { width: 320, height: 240 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: overrides.appId,
    ...overrides,
  };
}

function makeInitialState(): Partial<WindowManagerState> {
  const editor = makeWindow({
    id: "w-editor",
    appId: "editor",
    appProps: { resumeId: "rid-1" },
  });
  const analyzer = makeWindow({
    id: "w-editor::popout::analyzer",
    appId: "analyzer",
    appProps: { resumeId: "rid-1" },
    parentId: editor.id,
    poppedOutFromTab: "analyzer",
    status: "snappedRight",
  });
  return {
    isHydrated: true,
    desktopSize: { width: 1440, height: 900 },
    windows: { [editor.id]: editor, [analyzer.id]: analyzer },
    zOrder: [editor.id, analyzer.id],
    currentResumeId: "rid-1",
  };
}

/**
 * Read the AnalyzerApp's overall ATS score. The score is rendered inside a
 * "<span>{score}</span><span>/100</span>" pair — locating "/100" gives us
 * a stable anchor near the score number.
 */
function readAnalyzerScore(): number {
  const root = screen.getByTestId("analyzer-app");
  const slash100 = within(root).getByText("/100");
  // The score lives in the previous sibling `<span>`.
  const scoreEl = slash100.previousElementSibling as HTMLElement | null;
  if (!scoreEl) throw new Error("score element not found");
  const value = Number(scoreEl.textContent);
  if (Number.isNaN(value)) {
    throw new Error(`score is not a number: ${scoreEl.textContent ?? ""}`);
  }
  return value;
}

/** A resume populated enough that `scoreResume` returns a markedly higher
 *  number than the empty initial state. Keep the data deterministic. */
const FILLED_RESUME: Resume = {
  ...initialResumeState,
  profile: {
    ...initialResumeState.profile,
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "555-0100",
    linkedin: "https://linkedin.com/in/ada",
    title: "Software Engineer",
    summary:
      "Experienced engineer with a track record of shipping reliable systems.",
    city: "London",
    state: "UK",
  },
  workExperiences: [
    {
      company: "Analytical Engines Ltd",
      jobTitle: "Senior Engineer",
      date: "2021 — Present",
      descriptions: [
        "Improved throughput by 40% across 3 services by introducing a new caching layer.",
        "Mentored 5 engineers and led the design of the company's first job-scheduler.",
      ],
    },
  ],
  educations: [
    {
      school: "University of London",
      degree: "BSc Mathematics",
      gpa: "3.9",
      date: "2010 — 2014",
      descriptions: [],
    },
  ],
  skills: {
    ...initialResumeState.skills,
    descriptions: [
      "TypeScript, Python, Go, Rust",
      "Distributed systems, observability, performance engineering",
    ],
    featuredSkills: initialResumeState.skills.featuredSkills.map((_, i) => ({
      skill: ["TS", "Python", "Go", "Rust", "AWS", "Postgres"][i] ?? "",
      rating: 4,
    })),
  },
};

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
  // Reset the redux store between tests.
  store.dispatch(setResume(initialResumeState));
});

afterEach(() => {
  __resetRegistryForTests();
});

/* ---- The test ---------------------------------------------------------- */

describe("real-time pop-out sync", () => {
  it("dispatching setResume updates the popped-out analyzer score within the same tick", () => {
    render(
      <Provider store={store}>
        <WindowManagerProvider
          initialState={makeInitialState()}
          disablePersistence
          router={null}
        >
          <EditorApp
            windowId="w-editor"
            appProps={{ resumeId: "rid-1" }}
            resumeId="rid-1"
          />
          <AnalyzerApp
            windowId="w-editor::popout::analyzer"
            appProps={{ resumeId: "rid-1" }}
            resumeId="rid-1"
          />
        </WindowManagerProvider>
      </Provider>,
    );

    // Both windows are mounted in the same DOM, sharing one Redux store.
    expect(screen.getByTestId("editor-app")).toBeInTheDocument();
    expect(screen.getByTestId("analyzer-app")).toBeInTheDocument();

    // Initial state: empty resume → very low ATS score.
    const before = readAnalyzerScore();

    // Dispatch a single Redux update to simulate "the user typed in the
    // editor". No remount, no router, no waitFor — this MUST be reflected
    // in the popped-out analyzer immediately.
    act(() => {
      store.dispatch(setResume(FILLED_RESUME));
    });

    const after = readAnalyzerScore();

    // The exact numbers shift if the ATS scorer's weights change, so we
    // assert on the relative change rather than a hard-coded value.
    expect(after).not.toBe(before);
    expect(after).toBeGreaterThan(before);
  });

  it("the editor's analyzer-tab badge tracks the same store update", () => {
    render(
      <Provider store={store}>
        <WindowManagerProvider
          initialState={makeInitialState()}
          disablePersistence
          router={null}
        >
          <EditorApp
            windowId="w-editor"
            appProps={{ resumeId: "rid-1" }}
            resumeId="rid-1"
          />
          <AnalyzerApp
            windowId="w-editor::popout::analyzer"
            appProps={{ resumeId: "rid-1" }}
            resumeId="rid-1"
          />
        </WindowManagerProvider>
      </Provider>,
    );

    // Empty resume = many deductions → badge present with a positive number.
    const badgeBefore = screen.getByTestId("editor-tab-badge-analyzer");
    const beforeCount = Number(badgeBefore.textContent);
    expect(beforeCount).toBeGreaterThan(0);

    act(() => {
      store.dispatch(setResume(FILLED_RESUME));
    });

    // After filling the resume, fewer deductions remain. The badge's
    // re-render is driven by the same `useAppSelector(selectResume)` chain,
    // synchronously inside `act()`.
    const badgeAfter = screen.queryByTestId("editor-tab-badge-analyzer");
    if (badgeAfter) {
      const afterCount = Number(badgeAfter.textContent);
      expect(afterCount).toBeLessThan(beforeCount);
    } else {
      // A perfectly filled resume can drive deductions to zero, which
      // unmounts the badge entirely. That's still proof of sync.
      expect(badgeAfter).toBeNull();
    }
  });
});

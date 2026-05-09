/**
 * Tests for `<CoverLetterApp>`.
 *
 * Coverage:
 *  - With a `resumeId` in `appProps`, the picker is hidden and the body
 *    renders directly.
 *  - With no `resumeId`, the picker renders and lists resumes.
 *  - Selecting a resume rebinds via `useIndexedDBResumeSync`.
 *  - The body reads from `useAppSelector` — store dispatches don't crash
 *    the component.
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
import type { WindowManagerState } from "os/context/window-types";
import { store } from "lib/redux/store";
import { setResume, initialResumeState } from "lib/redux/resumeSlice";

/* ---- Mocks -------------------------------------------------------------- */

jest.mock("components/ResumeForm/CoverLetterForm", () => ({
  CoverLetterForm: () => <div data-testid="mock-cover-letter-form" />,
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
import CoverLetterApp from "./CoverLetterApp";

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

function renderApp(props: { resumeId?: string } = {}) {
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
        <CoverLetterApp
          windowId="w-cover-letter"
          appProps={(props as { resumeId?: string }) as { resumeId: string }}
          resumeId={props.resumeId}
        />
      </WindowManagerProvider>
    </Provider>,
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(
    makeApp("coverLetter", {
      bind: "resume",
      popOutOf: { parentAppId: "editor", tabId: "coverLetter" },
      showOnDesktop: false,
    }),
  );
  registerApp(makeApp("editor", { bind: "resume", showOnDesktop: false }));
  mockListResumes.mockReset();
  mockUseIndexedDBResumeSync.mockReset();
  store.dispatch(setResume(initialResumeState));
});

afterEach(() => {
  __resetRegistryForTests();
});

/* ---- Tests -------------------------------------------------------------- */

describe("<CoverLetterApp> with bound resumeId", () => {
  it("hides the picker and renders the cover letter form", () => {
    renderApp({ resumeId: "rid-1" });
    expect(screen.queryByTestId("cover-letter-picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-cover-letter-form")).toBeInTheDocument();
  });

  it("calls useIndexedDBResumeSync with the bound id", () => {
    renderApp({ resumeId: "rid-9" });
    expect(mockUseIndexedDBResumeSync).toHaveBeenCalledWith("rid-9");
  });
});

describe("<CoverLetterApp> standalone (no bound resumeId)", () => {
  it("renders the picker and a 'no resumes yet' hint when the list is empty", async () => {
    mockListResumes.mockResolvedValue([]);
    renderApp({});
    expect(screen.getByTestId("cover-letter-picker")).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText(/no resumes yet/i)).toBeInTheDocument();
  });

  it("populates the dropdown and rebinds on selection", async () => {
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
    await act(async () => {
      await Promise.resolve();
    });
    const select = screen.getByLabelText(/^Resume:$/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "rid-A" } });
    const calls = mockUseIndexedDBResumeSync.mock.calls.map((c) => c[0]);
    expect(calls).toContain("rid-A");
  });
});

describe("<CoverLetterApp> reads resume live from Redux", () => {
  it("dispatching setResume to the store does not crash the body", () => {
    renderApp({ resumeId: "rid-X" });
    expect(screen.getByTestId("mock-cover-letter-form")).toBeInTheDocument();
    act(() => {
      store.dispatch(setResume(initialResumeState));
    });
    expect(screen.getByTestId("mock-cover-letter-form")).toBeInTheDocument();
  });
});

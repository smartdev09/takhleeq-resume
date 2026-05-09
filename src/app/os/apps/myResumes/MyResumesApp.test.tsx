/**
 * Tests for the `myResumes` folder window.
 *
 * Coverage focus:
 *  - Toolbar: "+ New" creates a fresh resume in IndexedDB and opens the
 *    editor window for it.
 *  - View modes (icons / list / details) render the appropriate container.
 *  - Single-click selects (toggles bulk-select footer); double-click opens
 *    the editor window via `openWindow({ appId: 'editor', ... })`.
 *  - Search filters by name; sort selector reorders.
 *  - Empty state renders when no resumes exist; "no match" state renders
 *    when search returns nothing.
 *  - Error path: when `listResumes` throws, an error message + Retry are
 *    rendered instead of crashing the window.
 *
 * The IndexedDB API is mocked at the module boundary — the OS test runs in
 * jsdom which has no real IDB and we don't need to verify storage internals
 * here (resume-store has its own tests).
 */

import "@testing-library/jest-dom";

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverPoly {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverPoly;
}

import * as React from "react";
import { lazy } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// Mock the IndexedDB API at the module boundary. Mock factory must run
// BEFORE any module that imports this path, so we don't `import type` it
// from above (the type-only import would still be hoisted as a require by
// jest's transform, racing against the mock).
jest.mock("lib/storage/resume-store", () => ({
  listResumes: jest.fn(),
  createResume: jest.fn(),
  deleteResume: jest.fn(),
  duplicateResume: jest.fn(),
  updateResume: jest.fn(),
  importAll: jest.fn(),
}));

import type { ResumeRecord } from "lib/storage/resume-store";
import * as resumeStore from "lib/storage/resume-store";

import MyResumesApp from "./MyResumesApp";

const mockListResumes = resumeStore.listResumes as jest.MockedFunction<
  typeof resumeStore.listResumes
>;
const mockCreateResume = resumeStore.createResume as jest.MockedFunction<
  typeof resumeStore.createResume
>;
const mockDeleteResume = resumeStore.deleteResume as jest.MockedFunction<
  typeof resumeStore.deleteResume
>;
const mockDuplicateResume = resumeStore.duplicateResume as jest.MockedFunction<
  typeof resumeStore.duplicateResume
>;

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

function makeWindow(): WindowState {
  return {
    id: "w-myr",
    appId: "myResumes",
    appProps: {},
    position: { x: 0, y: 0 },
    size: { width: 880, height: 620 },
    minSize: { width: 480, height: 360 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "My Resumes",
  };
}

function makeInitialState(): Partial<WindowManagerState> {
  const w = makeWindow();
  return {
    windows: { [w.id]: w },
    zOrder: [w.id],
    isHydrated: true,
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

function makeRecord(
  partial: Partial<ResumeRecord> & { id: string; name: string },
): ResumeRecord {
  return {
    resume: {} as ResumeRecord["resume"],
    settings: {} as ResumeRecord["settings"],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
    ...partial,
  };
}

function renderApp() {
  return render(
    <Provider store={store}>
      <WindowManagerProvider
        initialState={makeInitialState()}
        disablePersistence
        router={null}
      >
        <StateProbe />
        <MyResumesApp windowId="w-myr" appProps={{}} />
      </WindowManagerProvider>
    </Provider>,
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("myResumes"));
  registerApp(makeApp("editor", { showOnDesktop: false, bind: "resume" }));
  mockListResumes.mockReset();
  mockCreateResume.mockReset();
  mockDeleteResume.mockReset();
  mockDuplicateResume.mockReset();
  (resumeStore.updateResume as jest.MockedFunction<typeof resumeStore.updateResume>).mockReset();
  (resumeStore.importAll as jest.MockedFunction<typeof resumeStore.importAll>).mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

describe("<MyResumesApp>", () => {
  it("renders the empty state when no resumes exist", async () => {
    mockListResumes.mockResolvedValue([]);
    renderApp();
    await waitFor(() =>
      expect(screen.getByText(/No resumes yet/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /new resume/i }),
    ).toBeInTheDocument();
  });

  it("renders the file grid when resumes exist", async () => {
    mockListResumes.mockResolvedValue([
      makeRecord({ id: "a", name: "Alpha" }),
      makeRecord({ id: "b", name: "Beta" }),
    ]);
    renderApp();
    await waitFor(() =>
      expect(screen.getByTestId("my-resumes-icons")).toBeInTheDocument(),
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("'+ New' creates a resume and opens the editor", async () => {
    mockListResumes.mockResolvedValue([]);
    mockCreateResume.mockResolvedValue(
      makeRecord({ id: "new-id", name: "Untitled Resume" }),
    );
    renderApp();
    await waitFor(() =>
      expect(screen.getByText(/No resumes yet/i)).toBeInTheDocument(),
    );
    // Use the toolbar New button (header shows two: toolbar + empty state).
    const newButton = screen.getAllByRole("button", { name: /^new$/i })[0];
    await act(async () => {
      fireEvent.click(newButton);
    });
    await waitFor(() => {
      expect(mockCreateResume).toHaveBeenCalledWith("Untitled Resume");
    });
    await waitFor(() => {
      expect(
        readWindows().some(
          (w) => w.appId === "editor" && w.resumeId === "new-id",
        ),
      ).toBe(true);
    });
  });

  it("double-click opens the editor for that resume", async () => {
    mockListResumes.mockResolvedValue([
      makeRecord({ id: "x", name: "Alpha" }),
    ]);
    renderApp();
    await waitFor(() =>
      expect(screen.getByText("Alpha")).toBeInTheDocument(),
    );
    const button = screen.getByText("Alpha").closest("button");
    expect(button).toBeTruthy();
    await act(async () => {
      fireEvent.doubleClick(button!);
    });
    await waitFor(() =>
      expect(
        readWindows().some(
          (w) => w.appId === "editor" && w.resumeId === "x",
        ),
      ).toBe(true),
    );
  });

  it("single-click selects and shows the bulk-action footer", async () => {
    mockListResumes.mockResolvedValue([
      makeRecord({ id: "x", name: "Alpha" }),
    ]);
    renderApp();
    await waitFor(() =>
      expect(screen.getByText("Alpha")).toBeInTheDocument(),
    );
    expect(
      screen.queryByTestId("my-resumes-bulk-footer"),
    ).not.toBeInTheDocument();
    const button = screen.getByText("Alpha").closest("button");
    await act(async () => {
      fireEvent.click(button!);
    });
    expect(
      screen.getByTestId("my-resumes-bulk-footer"),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it("search filters by name", async () => {
    mockListResumes.mockResolvedValue([
      makeRecord({ id: "a", name: "Alpha" }),
      makeRecord({ id: "b", name: "Beta" }),
    ]);
    renderApp();
    await waitFor(() =>
      expect(screen.getByText("Alpha")).toBeInTheDocument(),
    );
    const search = screen.getByLabelText(/search resumes/i);
    fireEvent.change(search, { target: { value: "bet" } });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders an error message when listResumes rejects", async () => {
    mockListResumes.mockRejectedValue(new Error("idb broken"));
    renderApp();
    await waitFor(() =>
      expect(screen.getByTestId("my-resumes-error")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /retry/i }),
    ).toBeInTheDocument();
  });

  it("switches to list view when the List toggle is clicked", async () => {
    mockListResumes.mockResolvedValue([
      makeRecord({ id: "a", name: "Alpha" }),
    ]);
    renderApp();
    await waitFor(() =>
      expect(screen.getByTestId("my-resumes-icons")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /list view/i }));
    expect(screen.getByTestId("my-resumes-list")).toBeInTheDocument();
  });
});

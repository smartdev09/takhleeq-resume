/**
 * Tests for the `importer` window.
 *
 * Coverage:
 *  - Initial render: dropzone visible, Import button disabled, no errors.
 *  - Successful import: parses the dropped PDF, persists via `createResume`,
 *    shows the success toast, then opens the editor and closes the importer
 *    window after the 1s delay.
 *  - Error path: when `parseResumeFromPdf` rejects, the error message is
 *    displayed and the user can retry.
 *
 * The PDF parser and IndexedDB store are mocked at module boundaries — the
 * importer's job is the orchestration, not the parsing internals.
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
import { initialResumeState } from "lib/redux/resumeSlice";

jest.mock("lib/parse-resume-from-pdf", () => ({
  parseResumeFromPdf: jest.fn(),
}));

// `ResumeDropzone` calls `useRouter()` from next/navigation; jsdom has no
// app-router context so we stub it.
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

jest.mock("lib/storage/resume-store", () => ({
  createResume: jest.fn(),
}));

// `<ResumeDropzone>` calls `useRouter()` to navigate to /resume-builder on
// the legacy `playgroundView=false` flow. Inside the OS shell that path is
// dead, but the hook still throws when no router context exists. We stub
// just the surface needed for the dropzone to render.
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import { parseResumeFromPdf } from "lib/parse-resume-from-pdf";
import * as resumeStore from "lib/storage/resume-store";

import ImporterApp from "./ImporterApp";

const mockParse = parseResumeFromPdf as jest.MockedFunction<
  typeof parseResumeFromPdf
>;
const mockCreate = resumeStore.createResume as jest.MockedFunction<
  typeof resumeStore.createResume
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

function makeImporterWindow(): WindowState {
  return {
    id: "w-imp",
    appId: "importer",
    appProps: {},
    position: { x: 0, y: 0 },
    size: { width: 640, height: 520 },
    minSize: { width: 420, height: 360 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "Import Resume",
  };
}

function makeInitialState(): Partial<WindowManagerState> {
  const w = makeImporterWindow();
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
      data-window-count={String(Object.keys(state.windows).length)}
    />
  );
}

function readWindows() {
  return JSON.parse(
    screen.getByTestId("state-probe").getAttribute("data-windows") ?? "[]",
  ) as Array<{ id: string; appId: string; resumeId?: string }>;
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
        <ImporterApp windowId="w-imp" appProps={{}} />
      </WindowManagerProvider>
    </Provider>,
  );
}

/**
 * Drop a PDF into the dropzone via the file input element. The dropzone's
 * Browse label has a hidden `<input type="file">` we can target by accept.
 */
function selectPdfFile(name = "demo.pdf") {
  const input = document.querySelector(
    'input[type="file"][accept=".pdf"]',
  ) as HTMLInputElement | null;
  expect(input).toBeTruthy();
  const file = new File(["%PDF-1.4 demo"], name, { type: "application/pdf" });
  // Create a FileList-like object since jsdom won't let us assign files
  // directly without a DataTransfer.
  Object.defineProperty(input!, "files", {
    value: [file],
    configurable: true,
  });
  fireEvent.change(input!);
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("importer"));
  registerApp(makeApp("editor", { showOnDesktop: false, bind: "resume" }));
  mockParse.mockReset();
  mockCreate.mockReset();
  // jsdom does not implement URL.createObjectURL; the dropzone uses it.
  if (!URL.createObjectURL) {
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL =
      () => "blob:mock";
  }
  if (!URL.revokeObjectURL) {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL =
      () => undefined;
  }
});

afterEach(() => {
  __resetRegistryForTests();
});

describe("<ImporterApp>", () => {
  it("renders the dropzone with the import button disabled until a file is selected", () => {
    renderApp();
    expect(screen.getByTestId("importer-app")).toHaveAttribute(
      "data-phase",
      "idle",
    );
    expect(
      screen.getByRole("button", { name: /import resume/i }),
    ).toBeDisabled();
  });

  it("imports the dropped PDF and opens the editor", async () => {
    jest.useFakeTimers();
    try {
      mockParse.mockResolvedValue(initialResumeState);
      mockCreate.mockResolvedValue({
        id: "imp-rid",
        name: "Imported Resume",
        resume: initialResumeState,
        settings: {} as never,
        createdAt: "now",
        updatedAt: "now",
      });
      renderApp();

      await act(async () => {
        selectPdfFile("alice.pdf");
      });
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: /import resume/i }),
        ).not.toBeDisabled(),
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId("importer-submit"));
      });

      await waitFor(() => expect(mockParse).toHaveBeenCalled());
      await waitFor(() => expect(mockCreate).toHaveBeenCalled());

      // Success toast appears before the close+open transition.
      expect(screen.getByTestId("importer-success")).toBeInTheDocument();

      // Run the 1s transition.
      await act(async () => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        const editor = readWindows().find(
          (w) => w.appId === "editor" && w.resumeId === "imp-rid",
        );
        expect(editor).toBeDefined();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows an error message when parsing fails", async () => {
    mockParse.mockRejectedValue(new Error("bad pdf"));
    renderApp();

    await act(async () => {
      selectPdfFile("broken.pdf");
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /import resume/i }),
      ).not.toBeDisabled(),
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("importer-submit"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("importer-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("importer-app")).toHaveAttribute(
      "data-phase",
      "error",
    );
  });
});

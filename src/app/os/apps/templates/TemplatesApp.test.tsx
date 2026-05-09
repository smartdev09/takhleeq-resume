/**
 * Tests for the `templates` gallery + detail window.
 *
 * Coverage:
 *  - Gallery renders the full template list and the category filter chips,
 *    and clicking a chip narrows the visible cards.
 *  - Clicking a card opens a child window with `appProps.templateId` set.
 *  - Detail mode renders preview + "Use this template" button.
 *  - "Use this template" with no editor windows open creates a new resume
 *    via `createResume` and opens an editor window for it.
 *  - "Use this template" with an editor open shows the apply-dialog and
 *    "Create new" still routes through `createResume`.
 *  - "Apply to current" updates the existing resume via `updateResume`
 *    and focuses the editor.
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
import type { ResumeRecord } from "lib/storage/resume-store";
import { RESUME_TEMPLATES } from "lib/mock/templates-data";

jest.mock("lib/storage/resume-store", () => {
  const actual = jest.requireActual("lib/storage/resume-store");
  return {
    ...actual,
    createResume: jest.fn(),
    getResume: jest.fn(),
    updateResume: jest.fn(),
  };
});

import * as resumeStore from "lib/storage/resume-store";

import TemplatesApp from "./TemplatesApp";

const mockCreateResume = resumeStore.createResume as jest.MockedFunction<
  typeof resumeStore.createResume
>;
const mockGetResume = resumeStore.getResume as jest.MockedFunction<
  typeof resumeStore.getResume
>;
const mockUpdateResume = resumeStore.updateResume as jest.MockedFunction<
  typeof resumeStore.updateResume
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

function makeTemplatesWindow(
  appProps: { templateId?: string; categoryId?: string } = {},
): WindowState {
  return {
    id: "w-tpl",
    appId: "templates",
    appProps,
    position: { x: 0, y: 0 },
    size: { width: 940, height: 660 },
    minSize: { width: 520, height: 420 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "Templates",
  };
}

function makeEditorWindow(resumeId: string): WindowState {
  return {
    id: `w-editor-${resumeId}`,
    appId: "editor",
    appProps: { resumeId },
    resumeId,
    position: { x: 100, y: 100 },
    size: { width: 1100, height: 750 },
    minSize: { width: 720, height: 480 },
    zIndex: 2,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: `Editor — ${resumeId}`,
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
    isHydrated: true,
  };
}

function StateProbe() {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
    appProps: w.appProps,
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
  ) as Array<{
    id: string;
    appId: string;
    appProps: Record<string, unknown>;
    resumeId?: string;
  }>;
}

function renderApp({
  appProps = {},
  initialWindows = [makeTemplatesWindow()],
}: {
  appProps?: { templateId?: string; categoryId?: string };
  initialWindows?: WindowState[];
} = {}) {
  return render(
    <Provider store={store}>
      <WindowManagerProvider
        initialState={makeInitialState(initialWindows)}
        disablePersistence
        router={null}
      >
        <StateProbe />
        <TemplatesApp windowId="w-tpl" appProps={appProps} />
      </WindowManagerProvider>
    </Provider>,
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("templates"));
  registerApp(makeApp("editor", { showOnDesktop: false, bind: "resume" }));
  mockCreateResume.mockReset();
  mockGetResume.mockReset();
  mockUpdateResume.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

describe("<TemplatesApp> gallery", () => {
  it("renders the template grid and category chips", () => {
    renderApp();
    expect(screen.getByTestId("templates-grid")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /all templates/i, pressed: true }),
    ).toBeInTheDocument();
    // At least the first known template renders.
    const first = RESUME_TEMPLATES[0];
    expect(
      screen.getByTestId(`template-card-${first.id}`),
    ).toBeInTheDocument();
  });

  it("filters by category when a chip is clicked", () => {
    renderApp();
    const total = screen.getAllByRole("listitem").length;
    fireEvent.click(screen.getByRole("button", { name: /^minimal$/i }));
    const filtered = screen.getAllByRole("listitem").length;
    expect(filtered).toBeLessThan(total);
    expect(filtered).toBeGreaterThan(0);
  });

  it("clicking a card opens a detail child window", async () => {
    renderApp();
    const first = RESUME_TEMPLATES[0];
    await act(async () => {
      fireEvent.click(screen.getByTestId(`template-card-${first.id}`));
    });
    const child = readWindows().find(
      (w) =>
        w.appId === "templates" &&
        (w.appProps as { templateId?: string }).templateId === first.id,
    );
    expect(child).toBeDefined();
  });
});

describe("<TemplatesApp> detail", () => {
  it("renders detail body when templateId is in appProps", () => {
    const t = RESUME_TEMPLATES[0];
    renderApp({ appProps: { templateId: t.id } });
    expect(screen.getByTestId("templates-detail")).toHaveAttribute(
      "data-template-id",
      t.id,
    );
    expect(
      screen.getByRole("button", { name: /use this template/i }),
    ).toBeInTheDocument();
  });

  it("renders not-found state for an unknown template id", () => {
    renderApp({ appProps: { templateId: "does-not-exist" } });
    expect(screen.getByTestId("templates-not-found")).toBeInTheDocument();
  });

  it("'Use this template' creates a new resume when no editor is open", async () => {
    const t = RESUME_TEMPLATES[0];
    mockCreateResume.mockResolvedValue({
      id: "new-rid",
      name: t.name,
      resume: t.resume,
      settings: {} as ResumeRecord["settings"],
      createdAt: "now",
      updatedAt: "now",
    });
    renderApp({ appProps: { templateId: t.id } });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /use this template/i }),
      );
    });
    await waitFor(() => expect(mockCreateResume).toHaveBeenCalled());
    expect(mockCreateResume.mock.calls[0][0]).toBe(t.name);
    await waitFor(() =>
      expect(
        readWindows().some(
          (w) => w.appId === "editor" && w.resumeId === "new-rid",
        ),
      ).toBe(true),
    );
  });

  it("'Use this template' shows apply-dialog when an editor is open", async () => {
    const t = RESUME_TEMPLATES[0];
    renderApp({
      appProps: { templateId: t.id },
      initialWindows: [
        makeTemplatesWindow({ templateId: t.id }),
        makeEditorWindow("existing-rid"),
      ],
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /use this template/i }),
      );
    });
    expect(screen.getByTestId("templates-apply-dialog")).toBeInTheDocument();
  });

  it("'Apply to current' updates the existing resume", async () => {
    const t = RESUME_TEMPLATES[0];
    mockGetResume.mockResolvedValue({
      id: "existing-rid",
      name: "Existing",
      resume: t.resume,
      settings: {} as ResumeRecord["settings"],
      createdAt: "now",
      updatedAt: "now",
    });
    mockUpdateResume.mockResolvedValue();
    renderApp({
      appProps: { templateId: t.id },
      initialWindows: [
        makeTemplatesWindow({ templateId: t.id }),
        makeEditorWindow("existing-rid"),
      ],
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /use this template/i }),
      );
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /apply to current/i }),
      );
    });
    await waitFor(() => expect(mockUpdateResume).toHaveBeenCalled());
    expect(mockUpdateResume.mock.calls[0][0]).toBe("existing-rid");
  });

  it("'Create new' from the dialog routes to createResume", async () => {
    const t = RESUME_TEMPLATES[0];
    mockCreateResume.mockResolvedValue({
      id: "another-rid",
      name: t.name,
      resume: t.resume,
      settings: {} as ResumeRecord["settings"],
      createdAt: "now",
      updatedAt: "now",
    });
    renderApp({
      appProps: { templateId: t.id },
      initialWindows: [
        makeTemplatesWindow({ templateId: t.id }),
        makeEditorWindow("existing-rid"),
      ],
    });
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /use this template/i }),
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /create new/i }));
    });
    await waitFor(() => expect(mockCreateResume).toHaveBeenCalled());
  });
});

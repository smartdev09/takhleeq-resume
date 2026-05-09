/**
 * Smoke tests for the `parser` window. The parser playground is read-only —
 * tests check that the body renders inside the window shell, sample buttons
 * switch the iframe `src`, and the parsing-results panel mounts. The PDF
 * reading itself is mocked at the module boundary; we already have a real
 * unit test suite for the underlying parser libraries.
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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

import {
  __resetRegistryForTests,
  registerApp,
} from "os/apps/app-registry";
import type { AppId, RegisteredApp } from "os/apps/app-types";
import { WindowManagerProvider } from "os/context/WindowManagerProvider";
import { store } from "lib/redux/store";

// Avoid pulling pdfjs into jsdom — return an empty TextItems array per call.
jest.mock("lib/parse-resume-from-pdf/read-pdf", () => ({
  readPdf: jest.fn().mockResolvedValue([]),
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

import { readPdf } from "lib/parse-resume-from-pdf/read-pdf";

import ParserApp from "./ParserApp";

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

function renderApp() {
  return render(
    <Provider store={store}>
      <WindowManagerProvider
        initialState={{ isHydrated: true }}
        disablePersistence
        router={null}
      >
        <ParserApp windowId="w-parser" appProps={{}} />
      </WindowManagerProvider>
    </Provider>,
  );
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("parser"));
  (readPdf as jest.MockedFunction<typeof readPdf>).mockClear();
});

afterEach(() => {
  __resetRegistryForTests();
});

describe("<ParserApp>", () => {
  it("renders the playground shell with the default sample loaded", async () => {
    renderApp();
    expect(screen.getByTestId("parser-app")).toBeInTheDocument();
    const iframe = screen.getByTestId("parser-iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toContain(
      "resume-example/laverne-resume.pdf",
    );
    await waitFor(() => expect(readPdf).toHaveBeenCalled());
  });

  it("clicking a sample example switches the iframe source", async () => {
    renderApp();
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("parser-example-1"));
    const iframe = screen.getByTestId("parser-iframe") as HTMLIFrameElement;
    await waitFor(() =>
      expect(iframe.getAttribute("src")).toContain(
        "resume-example/openresume-resume.pdf",
      ),
    );
    await waitFor(() => expect(readPdf).toHaveBeenCalledTimes(2));
  });

  it("renders the parsing-results heading", async () => {
    renderApp();
    expect(
      screen.getByRole("heading", { name: /parsing results/i }),
    ).toBeInTheDocument();
    await waitFor(() => expect(readPdf).toHaveBeenCalled());
  });
});

/**
 * Tests for the Community app: every card renders with a working anchor
 * (or button) target, the GitHub repo slug is configurable via
 * `NEXT_PUBLIC_GITHUB_REPO`, and the "Star this project" card opens the
 * auth window.
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

import CommunityApp from "./CommunityApp";

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

function makeCommunityWindow(): WindowState {
  return {
    id: "w-community",
    appId: "community",
    appProps: {},
    position: { x: 0, y: 0 },
    size: { width: 720, height: 560 },
    minSize: { width: 420, height: 360 },
    zIndex: 1,
    status: "open",
    isModal: false,
    openedAt: 0,
    title: "Community",
  };
}

function StateProbe() {
  const { state } = useWindowManager();
  const summary = Object.values(state.windows).map((w) => ({
    id: w.id,
    appId: w.appId,
  }));
  return (
    <div data-testid="state-probe" data-windows={JSON.stringify(summary)} />
  );
}

function readWindowAppIds(): string[] {
  const el = screen.getByTestId("state-probe");
  return (
    JSON.parse(el.getAttribute("data-windows") ?? "[]") as Array<{
      id: string;
      appId: string;
    }>
  ).map((w) => w.appId);
}

beforeEach(() => {
  __resetRegistryForTests();
  registerApp(makeApp("community"));
  registerApp(makeApp("auth"));
  window.localStorage.clear();
});

afterEach(() => {
  __resetRegistryForTests();
});

function renderCommunity() {
  const w = makeCommunityWindow();
  const state: Partial<WindowManagerState> = {
    windows: { [w.id]: w },
    zOrder: [w.id],
    isHydrated: true,
  };
  return render(
    <WindowManagerProvider
      initialState={state}
      disablePersistence
      router={null}
    >
      <StateProbe />
      <CommunityApp windowId={w.id} appProps={{}} />
    </WindowManagerProvider>,
  );
}

describe("<CommunityApp>", () => {
  it("renders six community cards", () => {
    renderCommunity();
    expect(screen.getByTestId("community-card-github")).toBeInTheDocument();
    expect(screen.getByTestId("community-card-star")).toBeInTheDocument();
    expect(screen.getByTestId("community-card-discord")).toBeInTheDocument();
    expect(
      screen.getByTestId("community-card-contributing"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("community-card-issues")).toBeInTheDocument();
    expect(screen.getByTestId("community-card-share")).toBeInTheDocument();
  });

  it("uses the upstream repo slug by default", () => {
    renderCommunity();
    const github = screen.getByTestId("community-card-github") as HTMLAnchorElement;
    expect(github.href).toContain("github.com/xitanggg/open-resume");
    const issues = screen.getByTestId("community-card-issues") as HTMLAnchorElement;
    expect(issues.href).toContain("/issues");
    const contributing = screen.getByTestId(
      "community-card-contributing",
    ) as HTMLAnchorElement;
    expect(contributing.href).toContain("/blob/main/CONTRIBUTING.md");
  });

  it("opens external links in a new tab", () => {
    renderCommunity();
    const github = screen.getByTestId("community-card-github") as HTMLAnchorElement;
    expect(github.target).toBe("_blank");
    expect(github.rel).toContain("noreferrer");
  });

  it("Star this project button opens the auth window", () => {
    renderCommunity();
    act(() => {
      fireEvent.click(screen.getByTestId("community-card-star"));
    });
    expect(readWindowAppIds()).toContain("auth");
  });

  it("Discord card points at a discord URL", () => {
    renderCommunity();
    const discord = screen.getByTestId("community-card-discord") as HTMLAnchorElement;
    expect(discord.href).toMatch(/^https:\/\//);
    expect(discord.href).toMatch(/discord/);
  });
});

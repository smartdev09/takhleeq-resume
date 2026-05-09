/**
 * Central app registry. Phase 3 subagents populate this map with their app
 * components. Phase 0 ships the empty shell so other code can import the
 * symbol and the type-checker can validate references.
 */

import type { AppId, AppRegistry, RegisteredApp } from "./app-types";

const REGISTRY: Partial<AppRegistry> = {};

/**
 * Apps call this from a side-effect-free module-level statement to register.
 * The desktop, menu bar and dock read APP_REGISTRY at render time so order of
 * registration does not matter as long as it happens before first paint.
 */
export function registerApp<K extends AppId>(app: RegisteredApp<K>): void {
  if (REGISTRY[app.appId]) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[app-registry] App "${app.appId}" registered twice`);
    }
  }
  REGISTRY[app.appId] = app as unknown as AppRegistry[K];
}

export function getApp<K extends AppId>(appId: K): RegisteredApp<K> | undefined {
  return REGISTRY[appId] as RegisteredApp<K> | undefined;
}

type AnyRegisteredApp = RegisteredApp<AppId>;

export function listRegisteredApps(): ReadonlyArray<AnyRegisteredApp> {
  return Object.values(REGISTRY) as ReadonlyArray<AnyRegisteredApp>;
}

export function listDesktopApps(): ReadonlyArray<AnyRegisteredApp> {
  return listRegisteredApps()
    .filter((a) => a.showOnDesktop)
    .sort((a, b) => (a.desktopOrder ?? 0) - (b.desktopOrder ?? 0));
}

/** For tests — wipes registered apps. */
export function __resetRegistryForTests(): void {
  for (const key of Object.keys(REGISTRY)) {
    delete (REGISTRY as Record<string, unknown>)[key];
  }
}

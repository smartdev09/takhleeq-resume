import { useEffect, useRef } from "react";
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import { store, type RootState, type AppDispatch } from "lib/redux/store";
import {
  loadStateFromLocalStorage,
  saveStateToLocalStorage,
} from "lib/redux/local-storage";
import { initialResumeState, setResume } from "lib/redux/resumeSlice";
import {
  initialSettings,
  setSettings,
  type Settings,
} from "lib/redux/settingsSlice";
import { setCurrentResumeId } from "lib/redux/resumesSlice";
import { deepMerge } from "lib/deep-merge";
import type { Resume, ResumeProfile } from "lib/redux/types";
import {
  listResumes,
  createResume,
  getResume,
  updateResume,
} from "lib/storage/resume-store";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings } from "lib/redux/settingsSlice";

/**
 * Migrate legacy profile shape (name, url, location) to new shape
 * (firstName, lastName, title, linkedin, website, city, state).
 */
function migrateResumeProfile(profile: Record<string, unknown>): ResumeProfile {
  const p = profile as Record<string, string | undefined>;
  const hasNew = "firstName" in profile && profile.firstName !== undefined;
  if (hasNew) {
    return {
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      title: p.title ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      linkedin: p.linkedin ?? "",
      website: p.website ?? "",
      github: p.github,
      city: p.city ?? "",
      state: p.state ?? "",
      country: p.country,
      summary: p.summary ?? "",
    };
  }
  const name = (p.name ?? "").trim();
  const [firstName = "", ...rest] = name.split(/\s+/);
  const lastName = rest.join(" ").trim();
  const location = (p.location ?? "").trim();
  const [city = "", state = ""] = location.split(",").map((s) => s.trim());
  return {
    firstName,
    lastName,
    title: p.title ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    linkedin: (p.url ?? "").includes("linkedin") ? (p.url ?? "") : "",
    website: (p.url ?? "").includes("linkedin") ? "" : (p.url ?? ""),
    city,
    state,
    summary: p.summary ?? "",
  };
}

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Hook to save store to local storage on store change.
 * Skipped when `enabled` is false (i.e., when using IndexedDB mode).
 */
export const useSaveStateToLocalStorageOnChange = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = store.subscribe(() => {
      saveStateToLocalStorage(store.getState());
    });
    return unsubscribe;
  }, [enabled]);
};

/**
 * Load initial state from localStorage into Redux.
 * Also runs the one-time migration from localStorage → IndexedDB.
 * Skipped when `enabled` is false (i.e., when using IndexedDB mode).
 */
export const useSetInitialStore = (enabled = true) => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!enabled) return;

    // One-time migration: if IndexedDB is empty but localStorage has data,
    // migrate the localStorage resume into IndexedDB.
    listResumes().then(async (existing) => {
      if (existing.length === 0) {
        const state = loadStateFromLocalStorage();
        if (state?.resume) {
          const stored = state.resume as Record<string, unknown>;
          if (stored.profile && typeof stored.profile === "object") {
            stored.profile = migrateResumeProfile(
              stored.profile as Record<string, unknown>
            );
          }
          const migratedResume = deepMerge(
            initialResumeState,
            stored
          ) as Resume;
          const migratedSettings = state.settings
            ? (deepMerge(initialSettings, state.settings) as Settings)
            : initialSettings;
          await createResume("My Resume", migratedResume, migratedSettings);
          localStorage.removeItem("open-resume-state");
        }
      }
    });

    // Still load into Redux for current session if localStorage has data
    const state = loadStateFromLocalStorage();
    if (!state) return;
    if (state.resume) {
      const stored = state.resume as Record<string, unknown>;
      if (stored.profile && typeof stored.profile === "object") {
        stored.profile = migrateResumeProfile(
          stored.profile as Record<string, unknown>
        );
      }
      const mergedResumeState = deepMerge(
        initialResumeState,
        stored
      ) as Resume;
      dispatch(setResume(mergedResumeState));
    }
    if (state.settings) {
      const mergedSettingsState = deepMerge(
        initialSettings,
        state.settings
      ) as Settings;
      dispatch(setSettings(mergedSettingsState));
    }
  }, [dispatch, enabled]);
};

/**
 * Hook that loads a resume from IndexedDB by ID and autosaves back on changes.
 * Used by the [id] builder page instead of the localStorage-based hooks.
 */
export const useIndexedDBResumeSync = (resumeId: string | undefined) => {
  const dispatch = useAppDispatch();
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);
  const isInitializedRef = useRef(false);

  // Load from IndexedDB on mount (or when resumeId changes)
  useEffect(() => {
    if (!resumeId) return;
    isInitializedRef.current = false;
    getResume(resumeId).then((record) => {
      if (record) {
        dispatch(setResume(record.resume));
        dispatch(setSettings(record.settings));
      }
      dispatch(setCurrentResumeId(resumeId));
      isInitializedRef.current = true;
    });
  }, [resumeId, dispatch]);

  // Autosave to IndexedDB (debounced 500ms) after initialization
  useEffect(() => {
    if (!resumeId || !isInitializedRef.current) return;
    const timer = setTimeout(() => {
      updateResume(resumeId, { resume, settings });
    }, 500);
    return () => clearTimeout(timer);
  }, [resumeId, resume, settings]);
};

/**
 * `<JobMatcherApp>` — popped-out variant of the editor's Job Matcher tab,
 * also launched standalone from the desktop.
 *
 * Mounts the existing `<JobMatcherFlow>` with a generalised `onSwitchTab`
 * callback (plan §5.7):
 *  - In-tab (parent appId === "editor"): "Edit in Editor" / "Edit in
 *    Designer" switches the active tab inside the parent editor — that's
 *    what the editor's `<JobMatcherTab>` already does today.
 *  - Popped out (this component): switching tabs has no local meaning, so
 *    we focus the editor window for the bound resume instead. Phase 3 only
 *    implements the focus path; switching the editor's active tab from
 *    here is deferred to a later phase that carries cross-window tab state.
 *
 * Real-time sync constraint (plan §14):
 *  - `<JobMatcherFlow>` reads `useAppSelector(selectResume)` directly. We
 *    never snapshot resume data into local state.
 *  - `onSessionChange` is intentionally a no-op in this Phase 3F build —
 *    the SessionBanner only renders inside the editor window today, and
 *    lifting session-active state across sibling windows requires a shared
 *    side-channel (small Zustand store) that's tracked separately.
 */

"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useIndexedDBResumeSync } from "lib/redux/hooks";
import {
  listResumes,
  type ResumeListItem,
  type ResumeRecord,
} from "lib/storage/resume-store";
import { JobMatcherFlow } from "components/agent/job-matcher/JobMatcherFlow";

import { useWindowManager } from "os/context/use-window-manager";
import type { AppComponentProps } from "os/apps/app-types";

function ResumePicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const [resumes, setResumes] = useState<ResumeListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listResumes()
      .then((records: ResumeRecord[]) => {
        if (cancelled) return;
        setResumes(
          records.map((r) => ({
            id: r.id,
            name: r.name,
            updatedAt: r.updatedAt,
            atsScore: r.atsScore,
          })),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setResumes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      data-testid="job-matcher-picker"
      className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-app-panel px-3 py-2 text-sm"
    >
      <label
        htmlFor="job-matcher-resume-picker"
        className="font-medium text-gray-700"
      >
        Tailor for which resume:
      </label>
      <select
        id="job-matcher-resume-picker"
        value={selectedId ?? ""}
        onChange={(e) => {
          const next = e.target.value;
          if (next) onSelect(next);
        }}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      >
        <option value="" disabled>
          {resumes === null ? "Loading…" : "Select a resume"}
        </option>
        {(resumes ?? []).map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {resumes !== null && resumes.length === 0 && (
        <span className="text-xs text-gray-500">
          No resumes yet — create one in the editor first.
        </span>
      )}
    </div>
  );
}

export default function JobMatcherApp({
  windowId,
  appProps,
  resumeId: resumeIdProp,
}: AppComponentProps<"jobMatcher">) {
  const propResumeId = appProps?.resumeId ?? resumeIdProp;
  const initialJobDescription = appProps?.initialJobDescription;

  const [boundResumeId, setBoundResumeId] = useState<string | undefined>(
    propResumeId,
  );

  useEffect(() => {
    setBoundResumeId(propResumeId);
  }, [propResumeId]);

  useIndexedDBResumeSync(boundResumeId);

  const { controls } = useWindowManager();

  // When popped out (standalone tool window), "Edit in Editor / Designer"
  // focuses the editor for the bound resume rather than swapping tabs in
  // this window. Phase 3 only ships the focus-existing-window behaviour.
  const handleSwitchTab = useCallback(
    (_tab: string) => {
      if (!boundResumeId) return;
      controls.openWindow({
        appId: "editor",
        appProps: { resumeId: boundResumeId },
        resumeId: boundResumeId,
        focusIfExists: true,
      });
    },
    [controls, boundResumeId],
  );

  return (
    <div
      data-testid="job-matcher-app"
      data-window-id={windowId}
      className="flex h-full w-full flex-col overflow-hidden bg-white"
    >
      {!propResumeId && (
        <ResumePicker
          selectedId={boundResumeId}
          onSelect={setBoundResumeId}
        />
      )}
      <div className="min-h-0 flex-1 overflow-hidden">
        <JobMatcherFlow
          onSwitchTab={handleSwitchTab}
          onSessionChange={() => {
            /* see file header — cross-window session lift is deferred */
          }}
          initialJobDescription={initialJobDescription}
        />
      </div>
    </div>
  );
}

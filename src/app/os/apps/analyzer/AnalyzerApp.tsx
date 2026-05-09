/**
 * `<AnalyzerApp>` — popped-out variant of the editor's Analyzer tab, also
 * launched standalone from the desktop.
 *
 * Two entry paths:
 *  1. Pop-out from the editor — a `resumeId` is supplied via `appProps`.
 *     `useIndexedDBResumeSync(resumeId)` loads that resume into the shared
 *     Redux store and saves edits back; the editor window (still mounted in
 *     the OS) sees the same store and re-renders live.
 *  2. Standalone from the desktop — no `resumeId` initially. We render a
 *     "Resume:" picker that lets the user bind to one of their saved
 *     resumes. Selecting a resume triggers the same IndexedDB sync hook.
 *
 * Real-time sync constraint (plan §14):
 *  - The body reads `useAppSelector(selectResume)` directly via
 *    `<AnalyzerTab>`. We never snapshot resume data into local state.
 *  - The picker uses local UI state only for the bound `resumeId` (an id,
 *    not the resume payload).
 */

"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useIndexedDBResumeSync } from "lib/redux/hooks";
import {
  listResumes,
  type ResumeListItem,
  type ResumeRecord,
} from "lib/storage/resume-store";
import { AnalyzerTab } from "components/agent/AnalyzerTab";

import type { AppComponentProps } from "os/apps/app-types";

/* -------------------------------------------------------------------------- */
/* Resume picker (only rendered when no resumeId is bound)                    */
/* -------------------------------------------------------------------------- */

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
      data-testid="analyzer-picker"
      className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-app-panel px-3 py-2 text-sm"
    >
      <label
        htmlFor="analyzer-resume-picker"
        className="font-medium text-gray-700"
      >
        Resume:
      </label>
      <select
        id="analyzer-resume-picker"
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

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function AnalyzerApp({
  windowId,
  appProps,
  resumeId: resumeIdProp,
}: AppComponentProps<"analyzer">) {
  // Resume id may come from either `appProps.resumeId` (typed) or the
  // legacy `resumeId` field on AppComponentProps.
  const propResumeId = appProps?.resumeId ?? resumeIdProp;

  // Local UI state: which resume id is currently bound. Initialised from
  // props; the user can rebind via the picker. We only ever store the id —
  // the resume payload itself stays in Redux.
  const [boundResumeId, setBoundResumeId] = useState<string | undefined>(
    propResumeId,
  );

  // Keep the bound id in sync if the parent re-passes a different one.
  useEffect(() => {
    setBoundResumeId(propResumeId);
  }, [propResumeId]);

  // Load + autosave the bound resume into the shared Redux store.
  // `useIndexedDBResumeSync` no-ops when the id is undefined.
  useIndexedDBResumeSync(boundResumeId);

  return (
    <div
      data-testid="analyzer-app"
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
        <AnalyzerTab />
      </div>
    </div>
  );
}

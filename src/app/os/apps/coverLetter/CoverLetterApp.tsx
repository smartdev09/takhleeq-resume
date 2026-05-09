/**
 * `<CoverLetterApp>` — popped-out variant of the editor's Cover Letter tab.
 *
 * Cover letters are sub-documents of a resume (current data model — see plan
 * §5.6), so this app needs a `resumeId` to make sense. When opened from a
 * pop-out, the resumeId is supplied via `appProps`. When opened standalone
 * (no resumeId), we render a picker to bind one — same pattern as
 * `<AnalyzerApp>`.
 *
 * The download button inside `<CoverLetterForm>` keeps its existing
 * `<StarGate>` wrap; auth flow stays exactly as it is in the in-tab variant
 * and will be replaced by Phase 3G's `<AuthApp>`.
 *
 * Real-time sync constraint (plan §14):
 *  - `<CoverLetterForm>` reads `useAppSelector(selectResume)` directly. We
 *    never snapshot resume data into local state.
 *  - The picker uses local UI state for the bound `resumeId` (an id, not a
 *    payload).
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
import { CoverLetterForm } from "components/ResumeForm/CoverLetterForm";

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
      data-testid="cover-letter-picker"
      className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-app-panel px-3 py-2 text-sm"
    >
      <label
        htmlFor="cover-letter-resume-picker"
        className="font-medium text-gray-700"
      >
        Resume:
      </label>
      <select
        id="cover-letter-resume-picker"
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

export default function CoverLetterApp({
  windowId,
  appProps,
  resumeId: resumeIdProp,
}: AppComponentProps<"coverLetter">) {
  const propResumeId = appProps?.resumeId ?? resumeIdProp;

  const [boundResumeId, setBoundResumeId] = useState<string | undefined>(
    propResumeId,
  );

  useEffect(() => {
    setBoundResumeId(propResumeId);
  }, [propResumeId]);

  useIndexedDBResumeSync(boundResumeId);

  return (
    <div
      data-testid="cover-letter-app"
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
        <CoverLetterForm />
      </div>
    </div>
  );
}

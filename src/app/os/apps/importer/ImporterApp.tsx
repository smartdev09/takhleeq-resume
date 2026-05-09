/**
 * `<ImporterApp>` — drag-and-drop PDF resume importer.
 *
 * Reuses the existing `<ResumeDropzone>` UI in `playgroundView` mode (no
 * legacy "Import and Continue" button — we add our own to keep the
 * navigation under the OS window manager). When the user clicks Import we:
 *
 *   1. Parse the PDF blob via `parseResumeFromPdf`.
 *   2. Persist a fresh `ResumeRecord` to IndexedDB via `createResume`.
 *   3. Show a brief success toast ("Imported! Opening editor…").
 *   4. Close this window and open the editor for the new resume id.
 *
 * The 1-second delay before the close/open transition exists so users see
 * the success state — it also gives jsdom-based tests a deterministic moment
 * to assert the toast appears before the window unmounts.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

import { ResumeDropzone } from "components/ResumeDropzone";
import { parseResumeFromPdf } from "lib/parse-resume-from-pdf";
import { createResume } from "lib/storage/resume-store";
import { initialSettings } from "lib/redux/settingsSlice";
import { cn } from "lib/utils";
import type { AppComponentProps } from "../app-types";
import { useWindowManager } from "../../context/use-window-manager";

const SUCCESS_DELAY_MS = 1000;

export default function ImporterApp({
  windowId,
}: AppComponentProps<"importer">) {
  const { controls } = useWindowManager();

  const [fileUrl, setFileUrl] = useState<string>("");
  const [phase, setPhase] = useState<"idle" | "parsing" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const transitionTimerRef = useRef<number | null>(null);

  // Cancel any pending close/open transition if the window unmounts before
  // the success delay elapses (e.g. the user closes the window manually).
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setErrorMessage(null);
  }, []);

  const handleFileUrlChange = useCallback(
    (next: string) => {
      setFileUrl(next);
      // A new file selection clears any previous error/success state so the
      // import button shows up fresh.
      if (next) reset();
    },
    [reset],
  );

  const handleImport = useCallback(async () => {
    if (!fileUrl || phase === "parsing" || phase === "success") return;
    setPhase("parsing");
    setErrorMessage(null);
    try {
      const resume = await parseResumeFromPdf(fileUrl);
      const name = "Imported Resume";
      const record = await createResume(name, resume, initialSettings);
      setPhase("success");
      if (typeof window !== "undefined") {
        transitionTimerRef.current = window.setTimeout(() => {
          transitionTimerRef.current = null;
          controls.openWindow({
            appId: "editor",
            appProps: { resumeId: record.id },
            resumeId: record.id,
            focusIfExists: false,
          });
          controls.closeWindow(windowId);
        }, SUCCESS_DELAY_MS);
      } else {
        controls.openWindow({
          appId: "editor",
          appProps: { resumeId: record.id },
          resumeId: record.id,
          focusIfExists: false,
        });
        controls.closeWindow(windowId);
      }
    } catch (err) {
      console.error("Failed to import resume", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "We couldn't parse this PDF. Please try a different file.",
      );
      setPhase("error");
    }
  }, [controls, fileUrl, phase, windowId]);

  const isSuccess = phase === "success";
  const isParsing = phase === "parsing";
  const canImport = Boolean(fileUrl) && !isParsing && !isSuccess;

  return (
    <div
      data-testid="importer-app"
      data-phase={phase}
      className="flex h-full w-full flex-col items-center bg-os-window p-6 text-os-ink"
    >
      <header className="mb-4 max-w-md text-center">
        <h1 className="text-base font-semibold">Import a Resume</h1>
        <p className="mt-1 text-sm text-os-ink-muted">
          Drop a PDF below to extract its content into a new resume.
          Everything stays in your browser — files are never uploaded.
        </p>
      </header>

      <div className="w-full max-w-xl">
        <ResumeDropzone
          onFileUrlChange={handleFileUrlChange}
          playgroundView
          className="rounded-lg bg-white"
        />
      </div>

      <div className="mt-4 flex w-full max-w-xl flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={!canImport}
          data-testid="importer-submit"
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white transition-colors",
            canImport
              ? "bg-brand hover:opacity-90"
              : "cursor-not-allowed bg-brand/40",
          )}
        >
          {isParsing ? "Importing…" : "Import resume"}
          {!isParsing && <ArrowRightIcon className="h-4 w-4" />}
        </button>
        {!fileUrl && (
          <p className="text-xs text-os-ink-muted">
            Select a PDF above to enable import.
          </p>
        )}
        {phase === "error" && errorMessage && (
          <p
            role="alert"
            data-testid="importer-error"
            className="text-xs text-red-600"
          >
            {errorMessage}
          </p>
        )}
      </div>

      {isSuccess && (
        <div
          data-testid="importer-success"
          role="status"
          aria-live="polite"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-200"
        >
          <CheckCircleIcon className="h-4 w-4" />
          Imported! Opening editor…
        </div>
      )}
    </div>
  );
}

"use client";

import {
  SparklesIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface SessionBannerProps {
  jobTitle: string;
  onBack: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * Persistent banner shown at the top of the builder when the user navigates
 * away from the Job Matcher tab while a tailoring session is active.
 * Reminds them they're editing a generated (unsaved) resume.
 */
export function SessionBanner({
  jobTitle,
  onBack,
  onSave,
  onDiscard,
}: SessionBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand/20 bg-brand/5 px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-brand">
        <SparklesIcon className="h-4 w-4 shrink-0" />
        <span>
          Editing tailored resume for{" "}
          <strong className="font-semibold">{jobTitle}</strong>
          <span className="ml-1 text-brand/60">(unsaved)</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10"
          onClick={onBack}
        >
          <ArrowLeftIcon className="h-3 w-3" />
          Back to Review
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
          onClick={onSave}
        >
          <DocumentArrowDownIcon className="h-3 w-3" />
          Save
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          onClick={onDiscard}
        >
          <XMarkIcon className="h-3 w-3" />
          Discard
        </button>
      </div>
    </div>
  );
}

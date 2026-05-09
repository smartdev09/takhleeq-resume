"use client";

import { TrashIcon } from "@heroicons/react/24/outline";

import type { AppComponentProps } from "os/apps/app-types";

/**
 * Trash window — OpenResume currently hard-deletes resumes from IndexedDB
 * when you remove them in My Resumes, so there is nothing to list here yet.
 * This window replaces the Phase-2 placeholder and sets honest expectations.
 */
export default function TrashApp(_props: AppComponentProps<"trash">) {
  return (
    <div
      data-testid="trash-app"
      className="flex h-full flex-col gap-6 overflow-y-auto bg-os-window p-8 text-os-ink"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-os-window-border bg-os-titlebar">
          <TrashIcon className="h-8 w-8 text-os-ink-muted" aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Trash</h1>
          <p className="mt-1 text-sm text-os-ink-muted">
            Deleted items would appear here. Right now, removing a resume in{" "}
            <strong className="font-medium text-os-ink">My Resumes</strong>{" "}
            deletes it permanently from this device.
          </p>
        </div>
      </div>

      <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-os-window-border bg-os-titlebar/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-os-ink">Trash is empty</p>
        <p className="mt-2 max-w-sm text-xs text-os-ink-muted">
          Soft-delete and restore from Trash may be added in a future release.
          Until then, export backups from My Resumes before you delete anything
          important.
        </p>
      </div>
    </div>
  );
}

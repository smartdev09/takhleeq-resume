"use client";

import { useState } from "react";
import { Button } from "components/ui/button";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SaveResumeDialogProps {
  defaultName: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function SaveResumeDialog({
  defaultName,
  onSave,
  onCancel,
}: SaveResumeDialogProps) {
  const [name, setName] = useState(defaultName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Save Tailored Resume
          </h3>
          <button
            type="button"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onCancel}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          This will save the generated resume as a new resume. Your original
          resume will not be modified.
        </p>

        <div className="mt-4">
          <label
            htmlFor="resume-name"
            className="block text-sm font-medium text-gray-700"
          >
            Resume name
          </label>
          <input
            id="resume-name"
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(name)} disabled={!name.trim()}>
            Save Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

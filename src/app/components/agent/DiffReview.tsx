"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "lib/redux/hooks";
import { selectResume, setResume } from "lib/redux/resumeSlice";
import { Resume } from "components/Resume";
import { Button } from "components/ui/button";
import { applyAcceptedChanges, type FieldChange } from "lib/agent/diff";
import type { AgentResult } from "lib/agent/agent-service";
import {
  CheckIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

export function DiffReview({
  result,
  onClose,
}: {
  result: AgentResult;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const currentResume = useAppSelector(selectResume);

  const [changes, setChanges] = useState<FieldChange[]>(
    () => result.changes
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(groupedSectionNames(result.changes))
  );

  const grouped = useMemo(() => groupBySections(changes), [changes]);
  const acceptedCount = changes.filter((c) => c.accepted).length;
  const totalCount = changes.length;

  const toggleChange = (id: string) => {
    setChanges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, accepted: !c.accepted } : c))
    );
  };

  const editChange = (id: string, editedValue: string) => {
    setChanges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, editedValue } : c))
    );
  };

  const resetEdit = (id: string) => {
    setChanges((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const { editedValue: _, ...rest } = c;
        return rest;
      })
    );
  };

  const acceptAll = () => {
    setChanges((prev) => prev.map((c) => ({ ...c, accepted: true })));
  };

  const rejectAll = () => {
    setChanges((prev) => prev.map((c) => ({ ...c, accepted: false })));
  };

  const handleApply = () => {
    const finalResume = applyAcceptedChanges(
      currentResume,
      result.improved,
      changes
    );
    dispatch(setResume(finalResume));
    onClose();
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div className="h-full overflow-hidden md:grid md:grid-cols-6">
      {/* Diff Panel */}
      <div className="flex h-full min-h-0 flex-col md:col-span-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Review AI Suggestions
            </h2>
            <p className="text-xs text-gray-500">
              {acceptedCount}/{totalCount} changes accepted · ATS{" "}
              {result.atsScoreBefore} → {result.atsScoreAfter}
              {result.atsScoreAfter > result.atsScoreBefore && (
                <span className="ml-1 text-emerald-600">
                  (+{result.atsScoreAfter - result.atsScoreBefore})
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
          <Button variant="ghost" size="sm" onClick={acceptAll}>
            <CheckIcon className="h-3.5 w-3.5" />
            Accept All
          </Button>
          <Button variant="ghost" size="sm" onClick={rejectAll}>
            <XMarkIcon className="h-3.5 w-3.5" />
            Reject All
          </Button>
        </div>

        {/* Changes */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {Object.entries(grouped).map(([section, sectionChanges]) => (
              <div
                key={section}
                className="overflow-hidden rounded-lg border border-gray-100"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left text-sm font-medium text-gray-700"
                  onClick={() => toggleSection(section)}
                >
                  <span>
                    {section}{" "}
                    <span className="text-xs text-gray-400">
                      ({sectionChanges.length} change
                      {sectionChanges.length !== 1 ? "s" : ""})
                    </span>
                  </span>
                  {expandedSections.has(section) ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>

                {expandedSections.has(section) && (
                  <div className="divide-y divide-gray-50">
                    {sectionChanges.map((change) => (
                      <ChangeItem
                        key={change.id}
                        change={change}
                        onToggle={() => toggleChange(change.id)}
                        onEdit={(value) => editChange(change.id, value)}
                        onResetEdit={() => resetEdit(change.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {changes.length === 0 && (
            <div className="flex h-40 items-center justify-center text-sm text-gray-500">
              No changes detected
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3">
          <Button onClick={handleApply} disabled={acceptedCount === 0}>
            <CheckIcon className="h-4 w-4" />
            Apply {acceptedCount} Change{acceptedCount !== 1 ? "s" : ""}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <ArrowUturnLeftIcon className="h-4 w-4" />
            Discard
          </Button>
        </div>
      </div>

      {/* Preview showing proposed changes */}
      <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
        <Resume defaultScale={0.5} resumeOverride={result.improved} />
      </div>
    </div>
  );
}

function ChangeItem({
  change,
  onToggle,
  onEdit,
  onResetEdit,
}: {
  change: FieldChange;
  onToggle: () => void;
  onEdit: (value: string) => void;
  onResetEdit: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayValue = change.editedValue ?? change.newValue;
  const isEdited = change.editedValue !== undefined;

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, [editing]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(false);
      }
    },
    []
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onEdit(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = e.target.scrollHeight + "px";
    },
    [onEdit]
  );

  return (
    <div
      className={cn(
        "px-3 py-2.5 transition-colors",
        change.accepted ? "bg-white" : "bg-gray-50/50 opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-gray-500">
            {change.label}
            {isEdited && (
              <span className="ml-1.5 text-amber-500">(edited)</span>
            )}
          </span>

          {/* Old value */}
          {change.oldValue && (
            <div className="mt-1 rounded bg-red-50 px-2 py-1">
              <span className="text-xs text-red-700 line-through">
                {truncate(change.oldValue, 200)}
              </span>
            </div>
          )}

          {/* New value — editable */}
          {displayValue && (
            <div className="group/new mt-1">
              {editing ? (
                <textarea
                  ref={textareaRef}
                  className="w-full resize-none rounded border border-brand bg-white px-2 py-1.5 text-xs text-gray-900 outline-none ring-1 ring-brand/30"
                  defaultValue={displayValue}
                  onChange={handleTextareaChange}
                  onBlur={() => setEditing(false)}
                  onKeyDown={handleEditKeyDown}
                  rows={1}
                />
              ) : (
                <div
                  className={cn(
                    "relative cursor-text rounded px-2 py-1 transition-colors",
                    isEdited
                      ? "bg-amber-50 ring-1 ring-amber-200"
                      : "bg-emerald-50"
                  )}
                  onClick={() => {
                    if (change.accepted) setEditing(true);
                  }}
                  title={
                    change.accepted
                      ? "Click to edit this suggestion"
                      : "Accept this change to edit it"
                  }
                >
                  <span
                    className={cn(
                      "text-xs",
                      isEdited ? "text-amber-700" : "text-emerald-700"
                    )}
                  >
                    {truncate(displayValue, 300)}
                  </span>
                  {change.accepted && (
                    <PencilIcon className="absolute right-1.5 top-1.5 hidden h-3 w-3 text-gray-400 group-hover/new:block" />
                  )}
                </div>
              )}

              {/* Reset edit link */}
              {isEdited && !editing && (
                <button
                  type="button"
                  className="mt-0.5 text-[10px] text-amber-600 underline hover:text-amber-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetEdit();
                  }}
                >
                  Reset to AI suggestion
                </button>
              )}
            </div>
          )}
        </div>

        {/* Accept/reject checkbox */}
        <button
          type="button"
          className={cn(
            "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
            change.accepted
              ? "border-brand bg-brand text-white"
              : "border-gray-300 bg-white text-gray-400 hover:border-gray-400"
          )}
          onClick={onToggle}
          title={change.accepted ? "Reject this change" : "Accept this change"}
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function groupBySections(
  changes: FieldChange[]
): Record<string, FieldChange[]> {
  const result: Record<string, FieldChange[]> = {};
  for (const change of changes) {
    const section = change.section;
    if (!result[section]) result[section] = [];
    result[section].push(change);
  }
  return result;
}

function groupedSectionNames(changes: FieldChange[]): string[] {
  const seen = new Set<string>();
  return changes
    .map((c) => c.section)
    .filter((s) => {
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

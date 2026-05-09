"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "lib/utils";
import type { KeywordMatch } from "lib/agent/job-match-scorer";

interface KeywordPillsProps {
  keywords: KeywordMatch[];
  maxVisible?: number;
}

export function KeywordPills({ keywords, maxVisible }: KeywordPillsProps) {
  const visible = maxVisible ? keywords.slice(0, maxVisible) : keywords;
  const hidden = maxVisible ? keywords.length - maxVisible : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((kw) => (
        <span
          key={kw.keyword}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            kw.found
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          )}
          title={
            kw.found
              ? `Found in: ${kw.foundIn.join(", ")}`
              : `Not found in resume (${kw.source})`
          }
        >
          {kw.found && <CheckIcon className="h-3 w-3" />}
          {kw.keyword}
        </span>
      ))}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500">
          +{hidden} more
        </span>
      )}
    </div>
  );
}

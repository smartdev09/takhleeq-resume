"use client";

import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/solid";
import { cn } from "lib/utils";
import type { MatchStatus } from "lib/agent/job-match-scorer";

interface ComparisonRowProps {
  label: string;
  status: MatchStatus;
  jdValue: string;
  resumeValue: string;
  tooltip?: string;
}

const STATUS_CONFIG: Record<
  MatchStatus,
  { icon: typeof CheckCircleIcon; color: string; bg: string }
> = {
  match: {
    icon: CheckCircleIcon,
    color: "text-green-500",
    bg: "bg-green-50",
  },
  partial: {
    icon: ExclamationTriangleIcon,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  missing: {
    icon: XCircleIcon,
    color: "text-red-500",
    bg: "bg-red-50",
  },
};

export function ComparisonRow({
  label,
  status,
  jdValue,
  resumeValue,
  tooltip,
}: ComparisonRowProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "grid grid-cols-[140px_32px_1fr_1fr] items-center gap-2 rounded-lg px-4 py-3 transition-colors",
        config.bg
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {tooltip && (
          <QuestionMarkCircleIcon
            className="h-4 w-4 text-gray-400"
            title={tooltip}
          />
        )}
      </div>

      <div className="flex justify-center">
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>

      <div className="min-w-0">
        <span className="text-sm text-gray-600 line-clamp-2">{jdValue}</span>
      </div>

      <div className="min-w-0">
        <span className="text-sm text-gray-900 line-clamp-2">
          {resumeValue}
        </span>
      </div>
    </div>
  );
}

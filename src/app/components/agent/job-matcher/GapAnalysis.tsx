"use client";

import { useMemo } from "react";
import { Button } from "components/ui/button";
import { MatchScoreRing } from "./MatchScoreRing";
import { ComparisonRow } from "./ComparisonRow";
import { KeywordPills } from "./KeywordPills";
import { scoreJobMatch, type JobMatchResult } from "lib/agent/job-match-scorer";
import type { ParsedJobDescription } from "lib/agent/jd-parser";
import type { Resume } from "lib/redux/types";
import {
  SparklesIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

interface GapAnalysisProps {
  resume: Resume;
  parsedJD: ParsedJobDescription;
  resumeTitle: string;
  onImprove: () => void;
  onChangeResume?: () => void;
}

export function GapAnalysis({
  resume,
  parsedJD,
  resumeTitle,
  onImprove,
  onChangeResume,
}: GapAnalysisProps) {
  const result = useMemo(
    () => scoreJobMatch(resume, parsedJD),
    [resume, parsedJD]
  );

  const headerMessage = getHeaderMessage(result);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">
            {headerMessage.title}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <InformationCircleIcon className="h-4 w-4 shrink-0" />
            {headerMessage.subtitle}
          </p>
        </div>
        <MatchScoreRing
          score={result.overallScore}
          label={result.label}
        />
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <BriefcaseIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              {parsedJD.company || "Company"}
            </p>
            <p className="truncate text-sm font-semibold text-gray-900">
              {parsedJD.title || "Job Position"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
              <DocumentTextIcon className="h-5 w-5 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Your resume</p>
              <p className="truncate text-sm font-semibold text-gray-900">
                {resumeTitle}
              </p>
            </div>
          </div>
          {onChangeResume && (
            <button
              type="button"
              className="flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              onClick={onChangeResume}
            >
              Select
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Comparison rows */}
      <div className="space-y-1">
        {result.comparisons.map((row) => (
          <ComparisonRow
            key={row.id}
            label={row.label}
            status={row.status}
            jdValue={row.jdValue}
            resumeValue={row.resumeValue}
            tooltip={
              row.id === "title"
                ? "How closely your resume title matches the job title"
                : undefined
            }
          />
        ))}
      </div>

      {/* Keywords section */}
      {result.keywords.length > 0 && (
        <div className={cn(
          "rounded-lg px-4 py-3",
          result.keywordStats.matched / result.keywordStats.total >= 0.6
            ? "bg-green-50"
            : result.keywordStats.matched / result.keywordStats.total >= 0.3
              ? "bg-amber-50"
              : "bg-red-50"
        )}>
          <div className="mb-2 grid grid-cols-[140px_32px_1fr] items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Job Keywords ({result.keywordStats.matched}/{result.keywordStats.total})
            </span>
            <div />
          </div>
          <KeywordPills keywords={result.keywords} />
        </div>
      )}

      {/* CTA */}
      <Button onClick={onImprove} className="w-full" size="default">
        <SparklesIcon className="h-4 w-4" />
        Improve My Resume for This Job
      </Button>
    </div>
  );
}

function getHeaderMessage(result: JobMatchResult): {
  title: string;
  subtitle: string;
} {
  if (result.overallScore >= 8) {
    return {
      title: "Great Match! Your Resume is Well Aligned",
      subtitle:
        "Your resume is a strong match. A few tweaks could make it even better.",
    };
  }
  if (result.overallScore >= 6) {
    return {
      title: "Good Match — Room for Improvement",
      subtitle:
        "You're on the right track. Adding missing keywords will boost your score.",
    };
  }
  if (result.overallScore >= 4) {
    return {
      title: "Your Resume is a Partial Match — Let's Make It Great",
      subtitle:
        "You're on the right track, but some keywords are still missing.",
    };
  }
  return {
    title: "Significant Gaps Detected",
    subtitle:
      "Your resume needs substantial changes to match this job. Let AI help.",
  };
}

function InformationCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

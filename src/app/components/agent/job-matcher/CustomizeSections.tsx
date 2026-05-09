"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "components/ui/button";
import {
  SECTION_REGISTRY,
  type SectionMeta,
} from "lib/resume-section-registry";
import type { ParsedJobDescription } from "lib/agent/jd-parser";
import type { Resume } from "lib/redux/types";
import type { JobMatchResult, KeywordMatch } from "lib/agent/job-match-scorer";
import {
  SparklesIcon,
  ArrowLeftIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionCustomization {
  sectionId: string;
  enabled: boolean;
  selectedSkills?: string[];
}

interface CustomizeSectionsProps {
  resume: Resume;
  parsedJD: ParsedJobDescription;
  matchResult: JobMatchResult;
  onGenerate: (customizations: SectionCustomization[]) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomizeSections({
  resume,
  parsedJD,
  matchResult,
  onGenerate,
  onBack,
}: CustomizeSectionsProps) {
  const customizableSections = useMemo(
    () => SECTION_REGISTRY.filter((s) => s.customizationType !== "none"),
    []
  );

  const [sectionStates, setSectionStates] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const s of customizableSections) {
      if (s.customizationType === "info-only") {
        initial[s.id] = false;
      } else {
        initial[s.id] = true;
      }
    }
    return initial;
  });

  const missingSkills = useMemo(
    () =>
      matchResult.keywords
        .filter((k) => !k.found)
        .map((k) => k.keyword),
    [matchResult.keywords]
  );

  const matchedSkills = useMemo(
    () =>
      matchResult.keywords
        .filter((k) => k.found)
        .map((k) => k.keyword),
    [matchResult.keywords]
  );

  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(
    () => new Set(missingSkills)
  );

  const toggleSection = useCallback((id: string) => {
    setSectionStates((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }, []);

  const selectAllSkills = useCallback(() => {
    setSelectedSkills(new Set(missingSkills));
  }, [missingSkills]);

  const deselectAllSkills = useCallback(() => {
    setSelectedSkills(new Set());
  }, []);

  const handleGenerate = () => {
    const customizations: SectionCustomization[] = customizableSections.map(
      (s) => ({
        sectionId: s.id,
        enabled: sectionStates[s.id] ?? false,
        ...(s.customizationType === "skills-checkbox"
          ? { selectedSkills: Array.from(selectedSkills) }
          : {}),
      })
    );
    onGenerate(customizations);
  };

  const enabledCount = Object.values(sectionStates).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Customize Your Improvements
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose which sections you&apos;d like AI to optimize for this job.
          Uncheck sections you want to keep as-is.
        </p>
      </div>

      {/* Section toggles */}
      <div className="space-y-2">
        {customizableSections.map((section) => (
          <SectionToggleCard
            key={section.id}
            section={section}
            enabled={sectionStates[section.id] ?? false}
            onToggle={() => toggleSection(section.id)}
            resume={resume}
            parsedJD={parsedJD}
            matchResult={matchResult}
            missingSkills={missingSkills}
            matchedSkills={matchedSkills}
            selectedSkills={selectedSkills}
            onToggleSkill={toggleSkill}
            onSelectAllSkills={selectAllSkills}
            onDeselectAllSkills={deselectAllSkills}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleGenerate} className="flex-1">
          <SparklesIcon className="h-4 w-4" />
          Generate Tailored Resume
        </Button>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section toggle card
// ---------------------------------------------------------------------------

interface SectionToggleCardProps {
  section: SectionMeta;
  enabled: boolean;
  onToggle: () => void;
  resume: Resume;
  parsedJD: ParsedJobDescription;
  matchResult: JobMatchResult;
  missingSkills: string[];
  matchedSkills: string[];
  selectedSkills: Set<string>;
  onToggleSkill: (skill: string) => void;
  onSelectAllSkills: () => void;
  onDeselectAllSkills: () => void;
}

function SectionToggleCard({
  section,
  enabled,
  onToggle,
  matchResult,
  missingSkills,
  matchedSkills,
  selectedSkills,
  onToggleSkill,
  onSelectAllSkills,
  onDeselectAllSkills,
}: SectionToggleCardProps) {
  const sectionScore = matchResult.sectionScores[section.id] ?? 0;
  const isInfoOnly = section.customizationType === "info-only";
  const isSkills = section.customizationType === "skills-checkbox";

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        enabled ? "border-brand/30 bg-brand/5" : "border-gray-200 bg-white"
      )}
    >
      {/* Toggle header */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={isInfoOnly ? undefined : onToggle}
        disabled={isInfoOnly}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded border transition-colors",
              isInfoOnly
                ? "border-gray-200 bg-gray-100"
                : enabled
                  ? "border-brand bg-brand text-white"
                  : "border-gray-300 bg-white"
            )}
          >
            {enabled && !isInfoOnly && <CheckIcon className="h-3 w-3" />}
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-gray-900">
              {section.label}
            </span>
            {isInfoOnly && (
              <span className="ml-2 text-xs text-gray-400">
                (review only)
              </span>
            )}
          </div>
        </div>
        <SectionScoreBadge score={sectionScore} />
      </button>

      {/* Skills checkbox grid */}
      {isSkills && enabled && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Select skills to add to your resume:
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-xs text-brand hover:underline"
                onClick={onSelectAllSkills}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs text-gray-500 hover:underline"
                onClick={onDeselectAllSkills}
              >
                Clear
              </button>
            </div>
          </div>

          {missingSkills.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-xs font-medium text-red-600">
                Missing from resume:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill) => (
                  <SkillCheckbox
                    key={skill}
                    skill={skill}
                    checked={selectedSkills.has(skill)}
                    onToggle={() => onToggleSkill(skill)}
                    variant="missing"
                  />
                ))}
              </div>
            </div>
          )}

          {matchedSkills.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-green-600">
                Already in resume:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700"
                  >
                    <CheckIcon className="h-3 w-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description for toggle sections */}
      {!isSkills && enabled && section.customizationPrompt && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-500">
            AI will:{" "}
            {section.customizationPrompt
              .replace("{keywords}", "relevant keywords")
              .replace("{title}", "this role")
              .replace("{company}", "this company")}
          </p>
        </div>
      )}

      {/* Info-only for certifications etc. */}
      {isInfoOnly && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-400">
            This section will be reviewed but not automatically modified.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill checkbox pill
// ---------------------------------------------------------------------------

function SkillCheckbox({
  skill,
  checked,
  onToggle,
  variant,
}: {
  skill: string;
  checked: boolean;
  onToggle: () => void;
  variant: "missing" | "matched";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        checked
          ? "bg-brand text-white"
          : variant === "missing"
            ? "bg-red-50 text-red-700 hover:bg-red-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      )}
      onClick={onToggle}
    >
      {checked && <CheckIcon className="h-3 w-3" />}
      {skill}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Section score badge
// ---------------------------------------------------------------------------

function SectionScoreBadge({ score }: { score: number }) {
  const percent = Math.round(score * 100);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        percent >= 60
          ? "bg-green-100 text-green-700"
          : percent >= 30
            ? "bg-amber-100 text-amber-700"
            : "bg-red-100 text-red-700"
      )}
    >
      {percent}%
    </span>
  );
}

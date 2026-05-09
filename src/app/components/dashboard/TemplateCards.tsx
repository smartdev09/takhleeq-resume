"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DocumentTextIcon,
  Squares2X2Icon,
  RectangleGroupIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Card } from "components/ui/card";
import { cn } from "lib/utils";
import type { ResumeTemplate } from "lib/mock/templates-data";

const LAYOUT_META: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  single: { label: "Single Column", Icon: DocumentTextIcon },
  "two-column": { label: "Two Column", Icon: Squares2X2Icon },
  mixed: { label: "Mixed Columns", Icon: RectangleGroupIcon },
};

/**
 * Renders a miniature HTML representation of the actual resume data from a
 * template. Uses CSS transform to scale a full-size layout into a thumbnail.
 */
export function TemplateThumbnail({
  template,
  className,
}: {
  template: ResumeTemplate;
  className?: string;
}) {
  const { resume, accentColor, settings } = template;
  const layout = settings.templateId ?? "single";
  const profile = resume.profile;
  const workExps = resume.workExperiences ?? [];
  const edus = resume.educations ?? [];
  const skills = resume.skills;

  const sectionHeading = (text: string) => (
    <div
      className="mb-[3px] flex items-center gap-[3px] border-b pb-[2px]"
      style={{ borderColor: `${accentColor}40` }}
    >
      <span
        className="inline-block h-[3px] w-[10px] rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <span
        className="text-[5px] font-bold uppercase tracking-wider"
        style={{ color: accentColor }}
      >
        {text}
      </span>
    </div>
  );

  const mainContent = (
    <>
      {workExps.length > 0 && (
        <div className="mb-[5px]">
          {sectionHeading("Work Experience")}
          {workExps.slice(0, 2).map((exp, i) => (
            <div key={i} className="mb-[3px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[4.5px] font-semibold text-gray-800">
                  {exp.jobTitle}
                </span>
                <span className="text-[3.5px] text-gray-400">{exp.date}</span>
              </div>
              <div className="text-[3.5px] text-gray-500">{exp.company}</div>
              {exp.descriptions?.slice(0, 2).map((d, j) => (
                <div key={j} className="flex gap-[2px] text-[3.5px] leading-[1.4] text-gray-500">
                  <span className="shrink-0">•</span>
                  <span className="line-clamp-1">{d}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {edus.length > 0 && (
        <div className="mb-[5px]">
          {sectionHeading("Education")}
          {edus.slice(0, 2).map((edu, i) => (
            <div key={i} className="mb-[2px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[4.5px] font-semibold text-gray-800">
                  {edu.degree}
                </span>
                <span className="text-[3.5px] text-gray-400">{edu.date}</span>
              </div>
              <div className="text-[3.5px] text-gray-500">{edu.school}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const sidebarContent = (
    <>
      {skills && skills.featuredSkills?.length > 0 && (
        <div className="mb-[5px]">
          {sectionHeading("Skills")}
          <div className="flex flex-wrap gap-[2px]">
            {skills.featuredSkills.slice(0, 6).map((s, i) => (
              <span
                key={i}
                className="rounded-sm px-[3px] py-[1px] text-[3.5px] text-gray-600"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}
      {edus.length > 0 && layout === "two-column" && (
        <div className="mb-[5px]">
          {sectionHeading("Education")}
          {edus.slice(0, 1).map((edu, i) => (
            <div key={i}>
              <div className="text-[4px] font-semibold text-gray-800">{edu.school}</div>
              <div className="text-[3.5px] text-gray-500">{edu.degree}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-white",
        className ?? "rounded-t-xl"
      )}
      style={{ aspectRatio: "8.5 / 11" }}
    >
      <div className="absolute inset-0 p-[8px]">
        {/* Profile header */}
        <div className="mb-[5px] border-b pb-[4px]" style={{ borderColor: `${accentColor}30` }}>
          <div
            className="mb-[1px] h-[1.5px] w-[12px] rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="text-[7px] font-bold leading-tight text-gray-900">
            {profile.firstName} {profile.lastName}
          </div>
          <div className="text-[4px] font-medium" style={{ color: accentColor }}>
            {profile.title}
          </div>
          <div className="mt-[2px] flex flex-wrap gap-x-[6px] text-[3px] text-gray-400">
            {profile.email && <span>{profile.email}</span>}
            {profile.phone && <span>{profile.phone}</span>}
            {profile.city && <span>{profile.city}{profile.state ? `, ${profile.state}` : ""}</span>}
          </div>
          {profile.summary && (
            <div className="mt-[2px] line-clamp-2 text-[3.5px] leading-[1.4] text-gray-500">
              {profile.summary}
            </div>
          )}
        </div>

        {/* Body: layout-dependent */}
        {layout === "single" && <div>{mainContent}</div>}

        {layout === "two-column" && (
          <div className="flex gap-[6px]">
            <div className="flex-1">{mainContent}</div>
            <div
              className="w-px self-stretch"
              style={{ backgroundColor: `${accentColor}20` }}
            />
            <div className="w-[35%]">{sidebarContent}</div>
          </div>
        )}

        {layout === "mixed" && (
          <div>
            <div className="mb-[4px] flex gap-[6px]">
              <div className="flex-1">
                {workExps.length > 0 && (
                  <div>
                    {sectionHeading("Work Experience")}
                    {workExps.slice(0, 1).map((exp, i) => (
                      <div key={i}>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[4.5px] font-semibold text-gray-800">{exp.jobTitle}</span>
                          <span className="text-[3.5px] text-gray-400">{exp.date}</span>
                        </div>
                        <div className="text-[3.5px] text-gray-500">{exp.company}</div>
                        {exp.descriptions?.slice(0, 2).map((d, j) => (
                          <div key={j} className="flex gap-[2px] text-[3.5px] leading-[1.4] text-gray-500">
                            <span className="shrink-0">•</span>
                            <span className="line-clamp-1">{d}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-[35%]">{sidebarContent}</div>
            </div>
            {edus.length > 0 && (
              <div>
                {sectionHeading("Education")}
                {edus.slice(0, 2).map((edu, i) => (
                  <div key={i} className="mb-[2px]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[4.5px] font-semibold text-gray-800">{edu.degree}</span>
                      <span className="text-[3.5px] text-gray-400">{edu.date}</span>
                    </div>
                    <div className="text-[3.5px] text-gray-500">{edu.school}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ATS_BADGE_CONFIG = {
  safe: { label: "ATS Safe", className: "bg-green-50 text-green-700 ring-green-200" },
  moderate: { label: "ATS Moderate", className: "bg-yellow-50 text-yellow-700 ring-yellow-200" },
  risky: { label: "ATS Risky", className: "bg-red-50 text-red-700 ring-red-200" },
} as const;

function AtsBadge({ rating }: { rating: ResumeTemplate["atsRating"] }) {
  const config = ATS_BADGE_CONFIG[rating];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

function RiskyWarningModal({
  templateName,
  onContinue,
  onCancel,
}: {
  templateName: string;
  onContinue: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900">ATS Risk Warning</h3>
            <p className="mt-1 text-sm text-gray-500">
              <strong>{templateName}</strong> uses a multi-column layout or non-standard bullet
              symbols that may confuse some Applicant Tracking Systems. Consider using an ATS-safe
              template instead.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export function TemplateCard({ template }: { template: ResumeTemplate }) {
  const layout = template.settings.templateId ?? "single";
  const meta = LAYOUT_META[layout];
  const [showWarning, setShowWarning] = useState(false);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);

  const href = `/dashboard/templates/${template.id}`;

  const handleClick = (e: React.MouseEvent) => {
    if (template.atsRating === "risky") {
      e.preventDefault();
      setShowWarning(true);
    }
  };

  const handleContinue = () => {
    setShowWarning(false);
    window.location.href = href;
  };

  return (
    <>
      {showWarning && (
        <RiskyWarningModal
          templateName={template.name}
          onContinue={handleContinue}
          onCancel={() => setShowWarning(false)}
        />
      )}
      <Link href={href} onClick={handleClick}>
        <Card className="group overflow-hidden transition-all hover:border-brand/40 hover:shadow-md">
          <div className="border-b border-gray-100 bg-gray-50 p-3">
            <TemplateThumbnail template={template} className="rounded-md shadow-sm" />
          </div>
          <div className="flex items-start justify-between gap-2 p-4">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900">
                {template.name}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-gray-500">
                {template.description}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full ring-1 ring-gray-200"
                  style={{ backgroundColor: template.accentColor }}
                />
                {meta && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <meta.Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                )}
                <AtsBadge rating={template.atsRating} />
              </div>
            </div>
            <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
          </div>
        </Card>
      </Link>
    </>
  );
}

export function TemplateCategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      )}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

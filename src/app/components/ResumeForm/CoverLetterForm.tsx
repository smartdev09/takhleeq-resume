"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePDF } from "@react-pdf/renderer";
import { useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings } from "lib/redux/settingsSlice";
import { getConfiguredProvider } from "lib/agent/provider-factory";
import { AgentService } from "lib/agent/agent-service";
import { AgentSetup } from "components/agent/AgentSetup";
import { StarGate } from "components/auth/StarGate";
import { Button } from "components/ui/button";
import { CoverLetterPDF } from "components/Resume/ResumePDF/CoverLetterPDF";
import type { CoverLetterTone } from "lib/agent/prompts/cover-letter";
import {
  SparklesIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

function FieldLabel({
  label,
  htmlFor,
  optional,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700"
    >
      {label}
      {optional && (
        <span className="ml-1.5 text-xs font-normal text-gray-400">
          (optional)
        </span>
      )}
    </label>
  );
}

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

const TONE_OPTIONS: { value: CoverLetterTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
];

function DownloadButton({
  content,
  fontFamily,
  fontSize,
}: {
  content: string;
  fontFamily: string;
  fontSize: string;
}) {
  const resume = useAppSelector(selectResume);
  const doc = (
    <CoverLetterPDF
      content={content}
      profile={resume.profile}
      fontFamily={fontFamily}
      fontSize={fontSize}
    />
  );
  const [instance] = usePDF({ document: doc as any });

  const handleDownload = useCallback(() => {
    if (instance.url) {
      const a = document.createElement("a");
      a.href = instance.url;
      a.download = "cover-letter.pdf";
      a.click();
    }
  }, [instance.url]);

  return (
    <StarGate onDownload={handleDownload}>
      <Button
        variant="outline"
        size="sm"
        disabled={!instance.url}
        type="button"
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        Download PDF
      </Button>
    </StarGate>
  );
}

// Wrap DownloadButton in a dynamic import to avoid SSR issues with usePDF
const DownloadButtonCSR = dynamic(() => Promise.resolve(DownloadButton), {
  ssr: false,
});

export function CoverLetterForm() {
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hiringManager, setHiringManager] = useState("");
  const [tone, setTone] = useState<CoverLetterTone>("professional");
  const [jobDescription, setJobDescription] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const canGenerate = jobTitle.trim() !== "" && companyName.trim() !== "";

  const handleGenerate = async () => {
    const provider = getConfiguredProvider();
    if (!provider) {
      setShowSetup(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const service = new AgentService(provider);
      const result = await service.generateCoverLetter({
        resume,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        hiringManager: hiringManager.trim() || undefined,
        tone,
        jobDescription: jobDescription.trim() || undefined,
      });
      setCoverLetter(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate cover letter");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in textarea
    }
  };

  return (
    <div className="flex h-full flex-col gap-0 overflow-y-auto">
      <div className="flex flex-col gap-5 p-4">
        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Cover Letter
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Fill in the job details and let AI draft a tailored cover letter
            from your resume.
          </p>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel label="Job Title" htmlFor="cl-job-title" />
            <input
              id="cl-job-title"
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel label="Company Name" htmlFor="cl-company" />
            <input
              id="cl-company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel
              label="Hiring Manager"
              htmlFor="cl-hiring-manager"
              optional
            />
            <input
              id="cl-hiring-manager"
              type="text"
              value={hiringManager}
              onChange={(e) => setHiringManager(e.target.value)}
              placeholder="Hiring Manager"
              className={inputClass}
            />
          </div>

          <div>
            <FieldLabel label="Tone" htmlFor="cl-tone" />
            <select
              id="cl-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as CoverLetterTone)}
              className={inputClass}
            >
              {TONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel
            label="Job Description"
            htmlFor="cl-job-desc"
            optional
          />
          <textarea
            id="cl-job-desc"
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description for a tailored letter"
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Generate button */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            type="button"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>
          {!canGenerate && !loading && (
            <span className="text-xs text-gray-400">
              Job title and company name are required
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Result area */}
      {(coverLetter !== "" || loading) && (
        <div className="flex flex-1 flex-col gap-3 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Generated Letter
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!coverLetter}
                type="button"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              {coverLetter && (
                <DownloadButtonCSR
                  content={coverLetter}
                  fontFamily={settings.fontFamily}
                  fontSize={settings.fontSize}
                />
              )}
            </div>
          </div>

          <textarea
            rows={20}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder={loading ? "Generating your cover letter…" : ""}
            className={`${inputClass} flex-1 resize-y font-mono text-xs leading-relaxed`}
            readOnly={loading}
          />
        </div>
      )}

      {showSetup && <AgentSetup onClose={() => setShowSetup(false)} />}
    </div>
  );
}

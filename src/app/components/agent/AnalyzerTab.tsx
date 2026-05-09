"use client";

import { useMemo, useState } from "react";
import { useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { scoreResume, type ATSResult, type SectionScore } from "lib/agent/ats-scorer";
import { Resume } from "components/Resume";
import { Button } from "components/ui/button";
import { AgentSetup } from "components/agent/AgentSetup";
import { DiffReview } from "components/agent/DiffReview";
import { getConfiguredProvider } from "lib/agent/provider-factory";
import { AgentService, type AgentResult } from "lib/agent/agent-service";
import {
  ChartPieIcon,
  SparklesIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { cn } from "lib/utils";
import { trackEvent, Events } from "lib/analytics";

const SECTION_META: Record<
  string,
  { label: string; weight: string; color: string }
> = {
  contact: { label: "Contact", weight: "15%", color: "bg-blue-500" },
  experience: { label: "Experience", weight: "40%", color: "bg-brand" },
  skills: { label: "Skills", weight: "25%", color: "bg-purple-500" },
  education: { label: "Education", weight: "10%", color: "bg-amber-500" },
  summary: { label: "Summary", weight: "5%", color: "bg-rose-500" },
  projects: { label: "Projects", weight: "5%", color: "bg-cyan-500" },
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 90
      ? "text-emerald-500"
      : score >= 75
        ? "text-brand"
        : score >= 60
          ? "text-amber-500"
          : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-100"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-700", color)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", color)}>{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      <span
        className={cn(
          "rounded-full px-3 py-0.5 text-xs font-semibold",
          score >= 90
            ? "bg-emerald-50 text-emerald-700"
            : score >= 75
              ? "bg-brand/10 text-brand"
              : score >= 60
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function SectionScoreBar({
  name,
  section,
}: {
  name: string;
  section: SectionScore;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = SECTION_META[name];
  if (!meta) return null;

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <button
        type="button"
        className="flex w-full items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex w-24 shrink-0 items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {meta.label}
            </span>
            <span className="text-xs text-gray-400">{meta.weight}</span>
          </div>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                meta.color
              )}
              style={{ width: `${section.score}%` }}
            />
          </div>
          <span className="w-8 text-right text-sm font-semibold text-gray-700">
            {section.score}
          </span>
        </div>
        {section.deductions.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-50 text-xs text-red-600">
            {section.deductions.length}
          </span>
        )}
      </button>

      {expanded && section.deductions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-gray-50 pt-3">
          {section.deductions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <span className="font-medium text-gray-700">{d.rule}</span>
                <span className="text-red-500"> −{d.points}</span>
                {d.details && (
                  <p className="mt-0.5 text-xs text-gray-500">{d.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && section.deductions.length === 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-50 pt-3 text-sm text-emerald-600">
          <CheckCircleIcon className="h-4 w-4" />
          No issues found
        </div>
      )}
    </div>
  );
}

export function AnalyzerTab() {
  const resume = useAppSelector(selectResume);
  const atsResult = useMemo(() => scoreResume(resume), [resume]);

  const [showSetup, setShowSetup] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // Listen for rate limit events from the retry wrapper
  useEffect(() => {
    const handler = (e: Event) => {
      const { retryAfterMs } = (e as CustomEvent<{ retryAfterMs: number }>).detail;
      setRateLimitCountdown(Math.ceil(retryAfterMs / 1000));
    };
    window.addEventListener("agent:rate-limited", handler);
    return () => window.removeEventListener("agent:rate-limited", handler);
  }, []);

  useEffect(() => {
    if (rateLimitCountdown === null) return;
    if (rateLimitCountdown <= 0) { setRateLimitCountdown(null); return; }
    const t = setTimeout(() => setRateLimitCountdown((p) => (p !== null ? p - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [rateLimitCountdown]);

  const totalDeductions = useMemo(
    () =>
      Object.values(atsResult.sections).reduce(
        (sum, s) => sum + s.deductions.length,
        0
      ),
    [atsResult]
  );

  const handleImprove = async () => {
    const provider = getConfiguredProvider();
    if (!provider) {
      setShowSetup(true);
      return;
    }

    setLoading(true);
    setError(null);
    trackEvent(Events.AI_IMPROVE_STARTED);
    try {
      const service = new AgentService(provider);
      const result = await service.improveATS(resume);
      setAgentResult(result);
      trackEvent(Events.AI_IMPROVE_COMPLETED, {
        scoreBefore: result.atsScoreBefore,
        scoreAfter: result.atsScoreAfter,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to improve resume");
      trackEvent(Events.AI_IMPROVE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  if (agentResult) {
    return <DiffReview result={agentResult} onClose={() => setAgentResult(null)} />;
  }

  return (
    <div className="h-full overflow-hidden md:grid md:grid-cols-6">
      <div className="h-full overflow-y-auto md:col-span-3">
        <div className="flex flex-col gap-4 p-4">
          {/* Score Ring */}
          <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gradient-to-b from-gray-50 to-white p-6">
            <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
              <ChartPieIcon className="h-4 w-4" />
              ATS Compatibility Score
            </div>
            <ScoreRing score={atsResult.overall} label={atsResult.label} />
            {totalDeductions > 0 && (
              <p className="mt-3 text-center text-sm text-gray-500">
                {totalDeductions} issue{totalDeductions !== 1 ? "s" : ""} found
                across all sections
              </p>
            )}
          </div>

          {/* Section Breakdown */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Section Breakdown
            </h3>
            {Object.entries(atsResult.sections).map(([name, section]) => (
              <SectionScoreBar key={name} name={name} section={section} />
            ))}
          </div>

          {/* AI Improve CTA */}
          <div className="rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4">
            <div className="flex items-start gap-3">
              <SparklesIcon className="mt-0.5 h-5 w-5 text-brand" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  AI-Powered Improvement
                </h3>
                <p className="mt-1 text-xs text-gray-600">
                  Let AI fix the issues above and optimize your resume for ATS
                  systems. You&apos;ll review every change before applying.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleImprove}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4" />
                        Improve with AI
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSetup(true)}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    AI Settings
                  </Button>
                </div>
                {rateLimitCountdown !== null && (
                  <p className="mt-2 text-xs text-amber-600">
                    Rate limited — retrying in {rateLimitCountdown}s… (or switch to a different model in AI Settings)
                  </p>
                )}
                {error && (
                  <p className="mt-2 text-xs text-red-600">{error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
        <Resume />
      </div>

      {showSetup && <AgentSetup onClose={() => setShowSetup(false)} />}
    </div>
  );
}

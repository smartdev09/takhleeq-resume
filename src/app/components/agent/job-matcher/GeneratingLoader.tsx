"use client";

import { useState, useEffect } from "react";
import { cn } from "lib/utils";

const STAGES = [
  "Analyzing job requirements...",
  "Matching your experience...",
  "Tailoring skills & keywords...",
  "Optimizing bullet points...",
  "Finalizing your resume...",
];

interface GeneratingLoaderProps {
  error?: string | null;
  onRetry?: () => void;
}

interface WebLLMProgress {
  progress: number;
  text: string;
}

export function GeneratingLoader({ error, onRetry }: GeneratingLoaderProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [webllmProgress, setWebllmProgress] = useState<WebLLMProgress | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ retryAfterMs: number; countdown: number } | null>(null);

  // Advance stages while generating
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [error]);

  // Listen for WebLLM model download progress
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WebLLMProgress>).detail;
      setWebllmProgress(detail);
    };
    window.addEventListener("webllm:progress", handler);
    return () => window.removeEventListener("webllm:progress", handler);
  }, []);

  // Listen for rate limit events and show countdown
  useEffect(() => {
    const handler = (e: Event) => {
      const { retryAfterMs } = (e as CustomEvent<{ retryAfterMs: number }>).detail;
      const countdown = Math.ceil(retryAfterMs / 1000);
      setRateLimitInfo({ retryAfterMs, countdown });
    };
    window.addEventListener("agent:rate-limited", handler);
    return () => window.removeEventListener("agent:rate-limited", handler);
  }, []);

  // Countdown timer for rate limit
  useEffect(() => {
    if (!rateLimitInfo) return;
    if (rateLimitInfo.countdown <= 0) {
      setRateLimitInfo(null);
      return;
    }
    const timer = setTimeout(() => {
      setRateLimitInfo((prev) =>
        prev ? { ...prev, countdown: prev.countdown - 1 } : null
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [rateLimitInfo]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Generation Failed
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={onRetry}
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      {/* Animated spinner */}
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-gray-200 border-t-brand" />
        <div
          className="absolute inset-2 animate-spin rounded-full border-4 border-gray-100 border-b-brand/60"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
            />
          </svg>
        </div>
      </div>

      {/* Rate limit notice */}
      {rateLimitInfo && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-center">
          <p className="text-sm font-medium text-amber-800">
            Rate limited — retrying in {rateLimitInfo.countdown}s…
          </p>
          <p className="text-xs text-amber-600">
            or switch to a different model in AI Settings
          </p>
        </div>
      )}

      {/* WebLLM download progress */}
      {webllmProgress && webllmProgress.progress < 1 && (
        <div className="w-full max-w-xs">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
            <span>Downloading AI model…</span>
            <span className="font-medium text-brand">
              {Math.round(webllmProgress.progress * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${webllmProgress.progress * 100}%` }}
            />
          </div>
          {webllmProgress.text && (
            <p className="mt-1 truncate text-[10px] text-gray-400">
              {webllmProgress.text}
            </p>
          )}
        </div>
      )}

      {/* Stage text */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Generating Your Tailored Resume
        </h3>
        <div className="mt-3 space-y-1">
          {STAGES.map((stage, idx) => (
            <p
              key={stage}
              className={cn(
                "text-sm transition-all duration-500",
                idx < stageIndex
                  ? "text-green-600"
                  : idx === stageIndex
                    ? "font-medium text-brand"
                    : "text-gray-300"
              )}
            >
              {idx < stageIndex ? "✓ " : idx === stageIndex ? "→ " : "  "}
              {stage}
            </p>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        This usually takes 15-30 seconds
      </p>
    </div>
  );
}

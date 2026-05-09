"use client";

import { useId } from "react";
import { cn } from "lib/utils";

interface MatchScoreRingProps {
  score: number;
  label: string;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#84cc16";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function getScoreGradient(score: number): [string, string] {
  if (score >= 8) return ["#22c55e", "#16a34a"];
  if (score >= 6) return ["#84cc16", "#65a30d"];
  if (score >= 4) return ["#f59e0b", "#d97706"];
  return ["#ef4444", "#dc2626"];
}

export function MatchScoreRing({
  score,
  label,
  size = 120,
}: MatchScoreRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const center = size / 2;
  const [colorStart, colorEnd] = getScoreGradient(score);
  const reactId = useId();
  const gradientId = `score-gradient-${reactId.replace(/:/g, "")}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900">
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          score >= 8
            ? "text-green-600"
            : score >= 6
              ? "text-lime-600"
              : score >= 4
                ? "text-amber-600"
                : "text-red-600"
        )}
      >
        {label}
      </span>
    </div>
  );
}

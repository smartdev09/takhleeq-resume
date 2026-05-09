"use client";

import { cn } from "lib/utils";

export interface Step {
  id: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav className="flex items-center justify-center gap-2 px-4 py-3">
      {steps.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isActive
                    ? "bg-brand text-white"
                    : isCompleted
                      ? "bg-brand/20 text-brand"
                      : "bg-gray-200 text-gray-500"
                )}
              >
                {step.id}
              </span>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive
                    ? "text-gray-900"
                    : isCompleted
                      ? "text-brand"
                      : "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-px w-12 transition-colors",
                  isCompleted ? "bg-brand" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

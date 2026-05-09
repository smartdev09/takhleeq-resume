"use client";

import {
  JobMatcherFlow,
  type JobMatchSessionState,
} from "components/agent/job-matcher/JobMatcherFlow";

interface JobMatcherTabProps {
  onSwitchTab?: (tab: string) => void;
  onSessionChange?: (state: JobMatchSessionState) => void;
  initialJobDescription?: string;
}

export function JobMatcherTab({
  onSwitchTab,
  onSessionChange,
  initialJobDescription,
}: JobMatcherTabProps) {
  return (
    <JobMatcherFlow
      onSwitchTab={onSwitchTab}
      onSessionChange={onSessionChange}
      initialJobDescription={initialJobDescription}
    />
  );
}

import type { Resume } from "lib/redux/types";
import type { FieldChange } from "./diff";

export interface ResumeVersion {
  id: string;
  timestamp: number;
  resume: Resume;
  source: "manual" | "ats-improve" | "job-tailor" | "custom";
  prompt?: string;
  jobDescription?: string;
  changes?: FieldChange[];
  atsScoreBefore?: number;
  atsScoreAfter?: number;
}

const STORAGE_KEY = "open-resume-versions";
const MAX_VERSIONS = 20;

function generateId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadVersions(): ResumeVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVersions(versions: ResumeVersion[]): void {
  if (typeof window === "undefined") return;
  const trimmed = versions.slice(-MAX_VERSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function addVersion(
  resume: Resume,
  source: ResumeVersion["source"],
  meta?: Partial<Pick<ResumeVersion, "prompt" | "jobDescription" | "changes" | "atsScoreBefore" | "atsScoreAfter">>
): ResumeVersion {
  const versions = loadVersions();
  const version: ResumeVersion = {
    id: generateId(),
    timestamp: Date.now(),
    resume,
    source,
    ...meta,
  };
  versions.push(version);
  saveVersions(versions);
  return version;
}

export function getVersion(id: string): ResumeVersion | undefined {
  return loadVersions().find((v) => v.id === id);
}

export function getLatestVersion(): ResumeVersion | undefined {
  const versions = loadVersions();
  return versions[versions.length - 1];
}

export function clearVersions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

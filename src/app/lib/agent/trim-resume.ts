import type { Resume } from "lib/redux/types";

export type TrimOperation = "ats-improve" | "job-tailor" | "custom";

const MAX_BULLETS_WORK = 5;
const MAX_BULLETS_PROJECT = 3;
const MAX_BULLET_LENGTH = 200;
const MAX_EDU_BULLETS_JOB_TAILOR = 2;

/**
 * Returns a leaner version of the resume for use in AI prompts.
 * Trims long descriptions and removes empty sections to reduce token count.
 * Target: prompts that fit within ~4000 tokens for average resumes.
 */
export function trimResumeForPrompt(
  resume: Resume,
  operation: TrimOperation
): Resume {
  const r: Resume = JSON.parse(JSON.stringify(resume));

  const trimBullet = (s: string) =>
    s.length > MAX_BULLET_LENGTH ? s.slice(0, MAX_BULLET_LENGTH) + "…" : s;

  // Work experience: cap bullets
  r.workExperiences = r.workExperiences.map((exp) => ({
    ...exp,
    descriptions: exp.descriptions
      .slice(0, MAX_BULLETS_WORK)
      .map(trimBullet),
  }));

  // Projects: cap bullets
  r.projects = r.projects.map((proj) => ({
    ...proj,
    descriptions: proj.descriptions
      .slice(0, MAX_BULLETS_PROJECT)
      .map(trimBullet),
  }));

  // Education: be more aggressive for job-tailor (education is rarely decisive)
  if (operation === "job-tailor") {
    r.educations = r.educations.map((edu) => ({
      ...edu,
      descriptions: edu.descriptions
        .slice(0, MAX_EDU_BULLETS_JOB_TAILOR)
        .map(trimBullet),
    }));
  }

  // Volunteering bullets
  r.volunteering = r.volunteering.map((v) => ({
    ...v,
    descriptions: v.descriptions.slice(0, 3).map(trimBullet),
  }));

  // Strip interests for job-tailor (irrelevant) — reset to empty
  if (operation === "job-tailor") {
    r.interests = { commaSeparated: "", bullets: [], tags: [] };
  }

  return r;
}

/**
 * Serialize resume for a prompt using compact (non-pretty-printed) JSON.
 * Saves ~30% tokens compared to JSON.stringify(resume, null, 2).
 */
export function resumeToPromptString(
  resume: Resume,
  operation: TrimOperation
): string {
  return JSON.stringify(trimResumeForPrompt(resume, operation));
}

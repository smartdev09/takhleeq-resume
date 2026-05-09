import type { Resume } from "lib/redux/types";
import { resumeToPromptString } from "../trim-resume";

export function buildJobTailorPrompt(
  resume: Resume,
  jobDescription: string
): string {
  return `Candidate resume (JSON):
${resumeToPromptString(resume, "job-tailor")}

Target job description:
---
${jobDescription}
---

Generate a tailored version of this resume optimized for the job description. Guidelines:

1. KEYWORD MATCHING: Mirror exact keywords from the JD where the candidate genuinely has that experience.
2. REORDER BULLET POINTS: Put the most relevant experience first within each section.
3. TAILOR THE SUMMARY: Rewrite the professional summary to directly address the role's key requirements.
4. SKILLS ALIGNMENT: Prioritize skills from the JD. Move matching skills to featuredSkills (max 6, rating 1-5).
5. RELEVANCE: Keep all entries but deprioritize irrelevant content.
6. PRESERVE TRUTH: Never fabricate experience, skills, or achievements.
7. ATS OPTIMIZATION: Use the same terminology as the JD.

Return the complete tailored Resume JSON.`;
}

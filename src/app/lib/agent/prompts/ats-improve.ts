import type { ATSResult } from "../ats-scorer";
import type { Resume } from "lib/redux/types";
import { resumeToPromptString } from "../trim-resume";

export function buildATSImprovementPrompt(
  resume: Resume,
  atsResult: ATSResult
): string {
  const deductionSummary = Object.entries(atsResult.sections)
    .filter(([, section]) => section.deductions.length > 0)
    .map(([name, section]) => {
      const items = section.deductions
        .map((d) => `  - ${d.rule} (-${d.points}): ${d.details ?? ""}`)
        .join("\n");
      return `${name} (${section.score}/100):\n${items}`;
    })
    .join("\n\n");

  return `Current resume (JSON):
${resumeToPromptString(resume, "ats-improve")}

ATS score: ${atsResult.overall}/100 (${atsResult.label})

Deductions found:
${deductionSummary}

Improve this resume to maximize ATS score. Focus on:
1. Fixing all deductions listed above
2. Strengthening bullet points with action verbs and quantified achievements
3. Improving the professional summary
4. Ensuring skills are well-organized
5. Making descriptions more impactful and ATS-friendly

Return the complete improved Resume JSON. Do not change factual information (company names, school names, dates, etc.).`;
}

export function buildCustomPrompt(
  resume: Resume,
  customInstruction: string
): string {
  return `Current resume (JSON):
${resumeToPromptString(resume, "custom")}

Instruction: ${customInstruction}

Apply the instruction to improve the resume. Return the complete updated Resume JSON. Preserve all factual information unless the user explicitly asks to change it.`;
}

import type { Resume } from "lib/redux/types";
import type { ParsedJobDescription } from "../jd-parser";
import type { SectionCustomization } from "components/agent/job-matcher/CustomizeSections";
import {
  SECTION_REGISTRY,
  getSectionMeta,
} from "lib/resume-section-registry";

/**
 * Build a tailoring prompt from the user's section customizations.
 * Uses the registry's customizationPrompt templates, filling in
 * JD-specific placeholders.
 */
export function buildCustomizedTailorPrompt(
  resume: Resume,
  jd: ParsedJobDescription,
  customizations: SectionCustomization[]
): string {
  const enabledSections = customizations.filter((c) => c.enabled);

  const sectionInstructions = enabledSections
    .map((c) => {
      const meta = getSectionMeta(c.sectionId as any);
      if (!meta?.customizationPrompt) return null;

      let prompt = meta.customizationPrompt
        .replace("{title}", jd.title || "the target role")
        .replace("{company}", jd.company || "the target company");

      if (c.selectedSkills && c.selectedSkills.length > 0) {
        prompt = prompt.replace("{keywords}", c.selectedSkills.join(", "));
      } else {
        prompt = prompt.replace(
          "{keywords}",
          jd.requiredSkills.slice(0, 10).join(", ")
        );
      }

      return `### ${meta.label}\n${prompt}`;
    })
    .filter(Boolean)
    .join("\n\n");

  const disabledSections = customizations
    .filter((c) => !c.enabled)
    .map((c) => getSectionMeta(c.sectionId as any)?.label)
    .filter(Boolean);

  return `Here is the candidate's resume JSON:

${JSON.stringify(resume, null, 2)}

Here is the target job description:

---
Title: ${jd.title}
Company: ${jd.company}
Required Skills: ${jd.requiredSkills.join(", ")}
Preferred Skills: ${jd.preferredSkills.join(", ")}
Years of Experience: ${jd.yearsOfExperience ? `${jd.yearsOfExperience.min}+` : "Not specified"}
Industries: ${jd.industries.join(", ") || "Not specified"}

Full JD:
${jd.rawText}
---

The candidate has chosen to optimize the following sections. Follow these specific instructions for each:

${sectionInstructions}

${
  disabledSections.length > 0
    ? `DO NOT modify these sections (keep them exactly as-is): ${disabledSections.join(", ")}`
    : ""
}

Also rewrite the professional summary to position the candidate for this specific role.

CRITICAL RULES:
- Never invent experience, skills, or achievements the candidate doesn't have.
- Use strong action verbs (Led, Architected, Developed, Implemented, Optimized).
- Remove personal pronouns (I, my, we).
- Quantify achievements where the original already has numbers.
- Mirror exact terminology from the job description for ATS matching.

Return the complete tailored Resume JSON object.`;
}

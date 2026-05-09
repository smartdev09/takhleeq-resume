import type { Resume } from "lib/redux/types";

export type CoverLetterTone = "professional" | "friendly" | "concise";

export interface CoverLetterParams {
  resume: Resume;
  jobTitle: string;
  companyName: string;
  hiringManager?: string;
  tone: CoverLetterTone;
  jobDescription?: string;
}

function toneInstructions(tone: CoverLetterTone): string {
  switch (tone) {
    case "professional":
      return "Write in a formal, polished business tone. Use complete sentences and measured language.";
    case "friendly":
      return "Write in a warm, approachable tone. Be personable and enthusiastic while remaining professional.";
    case "concise":
      return "Write in a tight, direct tone. Every sentence must earn its place. Aim for the low end of the word count.";
  }
}

export function buildCoverLetterPrompt(params: CoverLetterParams): string {
  const { resume, jobTitle, companyName, hiringManager, tone, jobDescription } =
    params;
  const { profile, workExperiences, skills } = resume;

  const applicantName =
    `${profile.firstName} ${profile.lastName}`.trim() || "the applicant";
  const currentTitle = profile.title || "professional";

  // Top skills (featured + first few described)
  const featuredSkills = skills.featuredSkills
    .filter((s) => s.skill.trim())
    .slice(0, 4)
    .map((s) => s.skill)
    .join(", ");

  const skillDescriptions = skills.descriptions.slice(0, 2).join("; ");

  const topSkillsSummary = [featuredSkills, skillDescriptions]
    .filter(Boolean)
    .join(". ");

  // Recent work experience highlights (top 2 roles, first 2 bullets each)
  const workHighlights = workExperiences
    .slice(0, 2)
    .map((exp) => {
      const bullets = exp.descriptions.slice(0, 2).join(" | ");
      return `${exp.jobTitle} at ${exp.company}: ${bullets}`;
    })
    .join("\n");

  const greeting = hiringManager
    ? `Dear ${hiringManager},`
    : "Dear Hiring Manager,";

  const jobDescriptionSection = jobDescription
    ? `\nJob Description:\n${jobDescription}\n`
    : "";

  return `Write a cover letter for ${applicantName} (${currentTitle}) applying to the ${jobTitle} position at ${companyName}.

${toneInstructions(tone)}

Structure:
1. Opening paragraph (2-3 sentences): Express genuine interest in the ${jobTitle} role at ${companyName}. Mention the applicant's current title and years of relevant experience.
2. Body paragraph 1 (3-4 sentences): Highlight 2-3 specific achievements from their work history that are most relevant to this role. Be concrete.
3. Body paragraph 2 (2-3 sentences): Connect their skills to the company's needs. Reference the job requirements if provided.
4. Closing paragraph (2-3 sentences): Express enthusiasm for the opportunity and include a clear call to action.

Applicant Details:
- Name: ${applicantName}
- Current Title: ${currentTitle}
- Email: ${profile.email}
- Location: ${[profile.city, profile.state].filter(Boolean).join(", ")}
- Top Skills: ${topSkillsSummary || "Not specified"}
- Professional Summary: ${profile.summary || "Not provided"}

Recent Work Experience:
${workHighlights || "Not provided"}
${jobDescriptionSection}
Format Rules:
- Start with: ${greeting}
- End with: Sincerely,\n${applicantName}
- Do NOT use markdown formatting, headers, or bullet points
- Do NOT use placeholder text like [Company Name] or [Your Name] — use the real values provided
- Keep the letter under 400 words
- Remove all personal pronouns (I, my) in favor of implied first-person where possible, OR keep "I" where removing it sounds unnatural
- Output ONLY the cover letter text, nothing else`;
}

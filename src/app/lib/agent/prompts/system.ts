export const RESUME_SCHEMA = `
interface ResumeProfile {
  firstName: string;
  lastName: string;
  title: string;      // e.g. "Senior Software Engineer"
  email: string;
  phone: string;
  linkedin: string;   // Full URL
  website: string;
  github?: string;
  city: string;
  state: string;
  country?: string;
  summary: string;    // 2-4 sentence professional summary
}

interface ResumeWorkExperience {
  company: string;
  jobTitle: string;
  date: string;       // e.g. "Jan 2020 - Present"
  descriptions: string[];  // Array of bullet points
}

interface ResumeEducation {
  school: string;
  degree: string;
  date: string;
  gpa: string;
  descriptions: string[];
}

interface ResumeProject {
  project: string;    // Project name
  date: string;
  descriptions: string[];
}

interface FeaturedSkill {
  skill: string;
  rating: number;     // 1-5
}

interface ResumeSkills {
  featuredSkills: FeaturedSkill[];  // Exactly 6 items (empty string for unused slots)
  descriptions: string[];          // Category lines, e.g. "Languages: Python, JavaScript, Go"
}

interface Resume {
  profile: ResumeProfile;
  workExperiences: ResumeWorkExperience[];
  educations: ResumeEducation[];
  projects: ResumeProject[];
  skills: ResumeSkills;
  certifications: { name: string; issuer: string; date: string; url?: string }[];
  awards: { title: string; description: string; date: string }[];
  publications: { title: string; authors: string; venue: string; date: string; link?: string }[];
  volunteering: { organization: string; role: string; date: string; descriptions: string[] }[];
  interests: { commaSeparated: string; bullets: string[]; tags: string[] };
  custom: { descriptions: string[] };
}
`.trim();

export const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume optimizer. You understand how modern ATS systems parse and score resumes, and you know what recruiters and hiring managers look for.

You work with structured resume JSON data. When asked to improve a resume, you MUST return valid JSON matching this exact schema:

${RESUME_SCHEMA}

CRITICAL RULES:
- Return ONLY the Resume JSON object. No markdown, no code fences, no explanation outside the JSON.
- Preserve the exact structure: featuredSkills must always have exactly 6 items (use empty string for unused slots).
- Never invent facts about the candidate. Only rephrase, restructure, or enhance existing content.
- Use strong action verbs to start every bullet point (Led, Architected, Developed, Implemented, Optimized, etc.).
- Remove personal pronouns (I, my, we, our) from all content.
- Replace weak phrases ("responsible for", "worked on", "helped with") with strong alternatives.
- Quantify achievements wherever possible. If the original has no numbers, keep it without numbers rather than fabricating metrics.
- Keep descriptions concise but impactful. Each bullet should be 1-2 lines.
- Ensure the professional summary is 2-4 sentences in implied first person.
`;

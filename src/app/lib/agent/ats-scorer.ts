import type {
  Resume,
  ResumeWorkExperience,
  ResumeEducation,
  ResumeProject,
} from "lib/redux/types";

export interface SectionScore {
  score: number;
  maxScore: 100;
  deductions: Deduction[];
}

export interface Deduction {
  rule: string;
  points: number;
  details?: string;
}

export interface ATSResult {
  overall: number;
  label: "Excellent" | "Good" | "Fair" | "Poor";
  sections: {
    contact: SectionScore;
    experience: SectionScore;
    skills: SectionScore;
    education: SectionScore;
    summary: SectionScore;
    projects: SectionScore;
  };
  weights: {
    contact: number;
    experience: number;
    skills: number;
    education: number;
    summary: number;
    projects: number;
  };
}

const WEIGHTS = {
  experience: 0.4,
  skills: 0.25,
  contact: 0.15,
  education: 0.1,
  summary: 0.05,
  projects: 0.05,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\s\-()+ ]+$/;
const LINKEDIN_RE = /linkedin\.com/i;
const NUMBER_RE = /\d+/;
const PRONOUN_RE = /\b(I|my|mine|we|our|me|myself)\b/i;
const WEAK_PHRASE_RE =
  /\b(responsible for|worked on|helped with|assisted|duties included|tasked with|involved in)\b/i;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function scoreContact(resume: Resume): SectionScore {
  const { profile } = resume;
  const deductions: Deduction[] = [];

  const requiredFields: Array<{ key: keyof typeof profile; label: string }> = [
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
  ];

  for (const { key, label } of requiredFields) {
    if (!profile[key]?.trim()) {
      deductions.push({
        rule: `Missing ${label}`,
        points: 25,
        details: `${label} is required for ATS systems to identify and contact you.`,
      });
    }
  }

  if (profile.email?.trim() && !EMAIL_RE.test(profile.email.trim())) {
    deductions.push({
      rule: "Invalid email format",
      points: 15,
      details: `"${profile.email}" doesn't look like a valid email address.`,
    });
  }

  if (profile.phone?.trim() && !PHONE_RE.test(profile.phone.trim())) {
    deductions.push({
      rule: "Invalid phone format",
      points: 10,
      details:
        "Phone should only contain digits, spaces, dashes, or brackets.",
    });
  }

  if (profile.linkedin?.trim() && !LINKEDIN_RE.test(profile.linkedin)) {
    deductions.push({
      rule: "Invalid LinkedIn URL",
      points: 10,
      details: "LinkedIn URL should contain linkedin.com.",
    });
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  return { score: clampScore(100 - total), maxScore: 100, deductions };
}

function scoreExperience(resume: Resume): SectionScore {
  const entries = resume.workExperiences;
  const deductions: Deduction[] = [];

  const nonEmpty = entries.filter(
    (e) => e.company.trim() || e.jobTitle.trim() || e.descriptions.some((d) => d.trim())
  );

  if (nonEmpty.length === 0) {
    return {
      score: 0,
      maxScore: 100,
      deductions: [
        {
          rule: "No work experience",
          points: 100,
          details:
            "Work experience is the most heavily weighted section (40%). Add at least one entry.",
        },
      ],
    };
  }

  for (let i = 0; i < nonEmpty.length; i++) {
    const entry = nonEmpty[i] as ResumeWorkExperience;
    const label = entry.company || `Entry ${i + 1}`;

    if (!entry.jobTitle?.trim() || !entry.company?.trim()) {
      deductions.push({
        rule: "Missing title or company",
        points: 15,
        details: `"${label}" is missing a ${!entry.jobTitle?.trim() ? "position title" : "company name"}.`,
      });
    }

    const fullDesc = entry.descriptions.join(" ").trim();

    if (!fullDesc || fullDesc.length < 50) {
      deductions.push({
        rule: "Weak description",
        points: 15,
        details: `"${label}" has a description under 50 characters. Add more detail.`,
      });
    }

    if (fullDesc && !NUMBER_RE.test(fullDesc)) {
      deductions.push({
        rule: "No quantified achievements",
        points: 20,
        details: `"${label}" has no numbers. Quantify impact (e.g., "increased revenue by 30%").`,
      });
    }

    if (fullDesc && PRONOUN_RE.test(fullDesc)) {
      deductions.push({
        rule: "Contains personal pronouns",
        points: 10,
        details: `"${label}" uses pronouns like "I" or "my". Use action verbs instead.`,
      });
    }

    if (fullDesc && WEAK_PHRASE_RE.test(fullDesc)) {
      deductions.push({
        rule: "Contains weak phrases",
        points: 10,
        details: `"${label}" uses weak phrases like "responsible for". Use strong action verbs.`,
      });
    }
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  return { score: clampScore(100 - total), maxScore: 100, deductions };
}

function scoreSkills(resume: Resume): SectionScore {
  const { skills } = resume;
  const deductions: Deduction[] = [];

  const allSkills = [
    ...skills.featuredSkills.map((fs) => fs.skill).filter(Boolean),
    ...skills.descriptions.filter(Boolean),
  ];

  if (allSkills.length === 0) {
    return {
      score: 20,
      maxScore: 100,
      deductions: [
        {
          rule: "No skills listed",
          points: 80,
          details:
            "Skills are the second most important section (25%). Add technical and soft skills.",
        },
      ],
    };
  }

  if (allSkills.length < 5) {
    deductions.push({
      rule: "Too few skills",
      points: 20,
      details: `Only ${allSkills.length} skill(s) listed. Aim for at least 5.`,
    });
  }

  const hasFeaturedOnly =
    skills.descriptions.filter(Boolean).length === 0 &&
    skills.featuredSkills.filter((fs) => fs.skill).length > 10;

  if (hasFeaturedOnly) {
    deductions.push({
      rule: "Skills not categorized",
      points: 5,
      details:
        "10+ skills in a single group. Consider organizing them into categories.",
    });
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  return { score: clampScore(100 - total), maxScore: 100, deductions };
}

function scoreEducation(resume: Resume): SectionScore {
  const entries = resume.educations;
  const deductions: Deduction[] = [];

  const nonEmpty = entries.filter(
    (e) => e.school.trim() || e.degree.trim()
  );

  if (nonEmpty.length === 0) {
    return {
      score: 50,
      maxScore: 100,
      deductions: [
        {
          rule: "No education entries",
          points: 50,
          details: "Many ATS systems expect at least one education entry.",
        },
      ],
    };
  }

  for (let i = 0; i < nonEmpty.length; i++) {
    const entry = nonEmpty[i] as ResumeEducation;
    const label = entry.school || `Entry ${i + 1}`;

    if (!entry.degree?.trim() || !entry.school?.trim()) {
      deductions.push({
        rule: "Missing degree or school",
        points: 20,
        details: `"${label}" is missing a ${!entry.degree?.trim() ? "degree" : "school name"}.`,
      });
    }

    if (!entry.date?.trim()) {
      deductions.push({
        rule: "Missing date",
        points: 10,
        details: `"${label}" has no date range.`,
      });
    }
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  return { score: clampScore(100 - total), maxScore: 100, deductions };
}

function scoreSummary(resume: Resume): SectionScore {
  const summary = resume.profile.summary?.trim() || "";
  const deductions: Deduction[] = [];

  if (!summary) {
    return {
      score: 0,
      maxScore: 100,
      deductions: [
        {
          rule: "No summary",
          points: 100,
          details:
            "A professional summary helps ATS systems and recruiters quickly understand your profile.",
        },
      ],
    };
  }

  if (summary.length < 50) {
    deductions.push({
      rule: "Summary too short",
      points: 30,
      details: `Summary is only ${summary.length} characters. Aim for 50-300 characters.`,
    });
  }

  if (summary.length > 500) {
    deductions.push({
      rule: "Summary too long",
      points: 10,
      details: "Summary exceeds 500 characters. Keep it concise.",
    });
  }

  if (PRONOUN_RE.test(summary)) {
    deductions.push({
      rule: "Pronouns in summary",
      points: 10,
      details:
        'Avoid first-person pronouns. Write in implied first person (e.g., "Experienced engineer..." not "I am an experienced engineer...").',
    });
  }

  if (WEAK_PHRASE_RE.test(summary)) {
    deductions.push({
      rule: "Weak phrasing in summary",
      points: 10,
      details: "Use strong, specific language instead of vague phrases.",
    });
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  return { score: clampScore(100 - total), maxScore: 100, deductions };
}

function scoreProjects(resume: Resume): SectionScore {
  const entries = resume.projects;
  const deductions: Deduction[] = [];

  const nonEmpty = entries.filter(
    (e) => e.project.trim() || e.descriptions.some((d) => d.trim())
  );

  if (nonEmpty.length === 0) {
    return {
      score: 80,
      maxScore: 100,
      deductions: [
        {
          rule: "No projects",
          points: 20,
          details:
            "Projects are optional but recommended, especially for early-career candidates.",
        },
      ],
    };
  }

  for (let i = 0; i < nonEmpty.length; i++) {
    const entry = nonEmpty[i] as ResumeProject;
    const label = entry.project || `Project ${i + 1}`;
    const fullDesc = entry.descriptions.join(" ").trim();

    if (!entry.project?.trim() || !fullDesc) {
      deductions.push({
        rule: "Missing name or description",
        points: 15,
        details: `"${label}" is missing a ${!entry.project?.trim() ? "name" : "description"}.`,
      });
    }

    if (fullDesc && fullDesc.length < 30) {
      deductions.push({
        rule: "Short project description",
        points: 10,
        details: `"${label}" description is under 30 characters. Add more detail.`,
      });
    }
  }

  const total = deductions.reduce((sum, d) => sum + d.points, 0);
  return { score: clampScore(100 - total), maxScore: 100, deductions };
}

function getLabel(score: number): ATSResult["label"] {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}

export function scoreResume(resume: Resume): ATSResult {
  const sections = {
    contact: scoreContact(resume),
    experience: scoreExperience(resume),
    skills: scoreSkills(resume),
    education: scoreEducation(resume),
    summary: scoreSummary(resume),
    projects: scoreProjects(resume),
  };

  const overall = Math.round(
    sections.experience.score * WEIGHTS.experience +
      sections.skills.score * WEIGHTS.skills +
      sections.contact.score * WEIGHTS.contact +
      sections.education.score * WEIGHTS.education +
      sections.summary.score * WEIGHTS.summary +
      sections.projects.score * WEIGHTS.projects
  );

  return {
    overall,
    label: getLabel(overall),
    sections,
    weights: { ...WEIGHTS },
  };
}

export function getTotalDeductions(result: ATSResult): Deduction[] {
  return Object.values(result.sections).flatMap((s) => s.deductions);
}

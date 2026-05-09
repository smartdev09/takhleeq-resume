import type { Resume, ResumeKey } from "lib/redux/types";
import type { ShowForm } from "lib/redux/settingsSlice";

// ---------------------------------------------------------------------------
// Section metadata — THE single source of truth for every resume section.
//
// When you add a new section to the Resume type:
//   1. Add an entry here
//   2. Create the form component + PDF component
//   3. Wire them via formTypeToComponent maps (ResumeForm, ResumePDF)
//   4. Everything else (JD matching, scoring, customization, diff) adapts
//      automatically by reading from this registry.
// ---------------------------------------------------------------------------

export type MatchCategory =
  | "title"
  | "experience"
  | "skills"
  | "education"
  | "certification"
  | "project"
  | "award"
  | "publication"
  | "volunteering"
  | "interest"
  | "other";

export type CustomizationType =
  | "toggle"
  | "skills-checkbox"
  | "info-only"
  | "none";

export interface SectionMeta {
  /** Must match the key in Settings.formToShow / formsOrder */
  id: ShowForm;
  /** Human-readable label used in UI (gap analysis, customization) */
  label: string;
  /** Default heading when the section is first shown on the PDF */
  defaultHeading: string;
  /** Maps to the corresponding key on the Resume object */
  resumeKey: ResumeKey;
  /** Whether the section is visible by default in a new resume */
  defaultEnabled: boolean;
  /** True for array-of-entries sections (work exp, education, etc.) */
  isList: boolean;
  /** True if individual entries have a `descriptions` field */
  hasDescriptions: boolean;
  /** True if the section appears in showBulletPoints settings */
  hasBulletPointsSetting: boolean;

  // -- Text extraction (used by JD match scorer & keyword matching) ----------

  /**
   * Given the section's data from a Resume, return all searchable text as a
   * flat string array. The scorer concatenates these to match JD keywords.
   */
  extractText: (sectionData: unknown, resume: Resume) => string[];

  // -- Job match scoring -----------------------------------------------------

  /** Weight in the job-match scoring algorithm (0–1). Weights across all
   *  sections should roughly sum to 1 but are normalized at runtime. */
  matchWeight: number;
  /** Semantic category — the JD parser uses this to route extracted
   *  requirements to the correct comparison bucket. */
  matchCategory: MatchCategory;

  // -- Step 2 customization --------------------------------------------------

  /** How this section appears in the customization step. */
  customizationType: CustomizationType;
  /** AI prompt fragment used when the user opts in to modifying this section.
   *  Placeholders: {keywords}, {title}, {company}. */
  customizationPrompt?: string;
}

// ---------------------------------------------------------------------------
// Helpers for extracting text from known entry shapes
// ---------------------------------------------------------------------------

function extractListText(
  entries: unknown[],
  textKeys: string[],
  descriptionKey = "descriptions"
): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    for (const key of textKeys) {
      const val = rec[key];
      if (typeof val === "string" && val.trim()) result.push(val);
    }
    const descs = rec[descriptionKey];
    if (Array.isArray(descs)) {
      for (const d of descs) {
        if (typeof d === "string" && d.trim()) result.push(d);
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const SECTION_REGISTRY: readonly SectionMeta[] = [
  {
    id: "workExperiences",
    label: "Work Experience",
    defaultHeading: "WORK EXPERIENCE",
    resumeKey: "workExperiences",
    defaultEnabled: true,
    isList: true,
    hasDescriptions: true,
    hasBulletPointsSetting: false,
    matchWeight: 0.30,
    matchCategory: "experience",
    customizationType: "toggle",
    customizationPrompt:
      "Rephrase work experience bullet points to incorporate these keywords: {keywords}. " +
      "Use strong action verbs and quantify achievements. Do not fabricate.",
    extractText: (data) =>
      extractListText(data as unknown[], ["company", "jobTitle", "date"]),
  },
  {
    id: "skills",
    label: "Skills",
    defaultHeading: "SKILLS",
    resumeKey: "skills",
    defaultEnabled: true,
    isList: false,
    hasDescriptions: false,
    hasBulletPointsSetting: true,
    matchWeight: 0.25,
    matchCategory: "skills",
    customizationType: "skills-checkbox",
    customizationPrompt:
      "Add these skills the candidate has confirmed: {keywords}. " +
      "Prioritize JD-mentioned skills in featuredSkills slots (max 6).",
    extractText: (data) => {
      const skills = data as {
        featuredSkills: { skill: string }[];
        descriptions: string[];
      };
      const result: string[] = [];
      for (const fs of skills.featuredSkills ?? []) {
        if (fs.skill?.trim()) result.push(fs.skill);
      }
      for (const d of skills.descriptions ?? []) {
        if (d.trim()) result.push(d);
      }
      return result;
    },
  },
  {
    id: "educations",
    label: "Education",
    defaultHeading: "EDUCATION",
    resumeKey: "educations",
    defaultEnabled: true,
    isList: true,
    hasDescriptions: true,
    hasBulletPointsSetting: true,
    matchWeight: 0.10,
    matchCategory: "education",
    customizationType: "toggle",
    customizationPrompt:
      "Reorder education entries to prioritize the most relevant degree/field " +
      "for a {title} role at {company}.",
    extractText: (data) =>
      extractListText(data as unknown[], ["school", "degree", "gpa", "date"]),
  },
  {
    id: "projects",
    label: "Projects",
    defaultHeading: "PROJECT",
    resumeKey: "projects",
    defaultEnabled: true,
    isList: true,
    hasDescriptions: true,
    hasBulletPointsSetting: true,
    matchWeight: 0.10,
    matchCategory: "project",
    customizationType: "toggle",
    customizationPrompt:
      "Rephrase project descriptions to highlight relevant technologies: {keywords}.",
    extractText: (data) =>
      extractListText(data as unknown[], ["project", "date"]),
  },
  {
    id: "certifications",
    label: "Certifications",
    defaultHeading: "CERTIFICATIONS",
    resumeKey: "certifications",
    defaultEnabled: false,
    isList: true,
    hasDescriptions: false,
    hasBulletPointsSetting: false,
    matchWeight: 0.08,
    matchCategory: "certification",
    customizationType: "info-only",
    extractText: (data) =>
      extractListText(data as unknown[], ["name", "issuer", "date"]),
  },
  {
    id: "awards",
    label: "Awards & Scholarships",
    defaultHeading: "AWARDS & SCHOLARSHIPS",
    resumeKey: "awards",
    defaultEnabled: false,
    isList: true,
    hasDescriptions: false,
    hasBulletPointsSetting: false,
    matchWeight: 0.03,
    matchCategory: "award",
    customizationType: "toggle",
    customizationPrompt:
      "Rephrase award descriptions to emphasize relevance to {title} role.",
    extractText: (data) =>
      extractListText(data as unknown[], ["title", "description", "date"]),
  },
  {
    id: "publications",
    label: "Publications",
    defaultHeading: "PUBLICATIONS",
    resumeKey: "publications",
    defaultEnabled: false,
    isList: true,
    hasDescriptions: false,
    hasBulletPointsSetting: false,
    matchWeight: 0.03,
    matchCategory: "publication",
    customizationType: "toggle",
    customizationPrompt:
      "Highlight publications most relevant to {title} in {company}'s industry.",
    extractText: (data) =>
      extractListText(data as unknown[], [
        "title",
        "authors",
        "venue",
        "date",
      ]),
  },
  {
    id: "volunteering",
    label: "Volunteering & Leadership",
    defaultHeading: "VOLUNTEERING & LEADERSHIP",
    resumeKey: "volunteering",
    defaultEnabled: false,
    isList: true,
    hasDescriptions: true,
    hasBulletPointsSetting: true,
    matchWeight: 0.03,
    matchCategory: "volunteering",
    customizationType: "toggle",
    customizationPrompt:
      "Rephrase volunteering descriptions to demonstrate leadership and " +
      "skills relevant to {title}.",
    extractText: (data) =>
      extractListText(data as unknown[], ["organization", "role", "date"]),
  },
  {
    id: "interests",
    label: "Interests",
    defaultHeading: "INTERESTS",
    resumeKey: "interests",
    defaultEnabled: false,
    isList: false,
    hasDescriptions: false,
    hasBulletPointsSetting: false,
    matchWeight: 0.01,
    matchCategory: "interest",
    customizationType: "none",
    extractText: (data) => {
      const interests = data as {
        commaSeparated: string;
        bullets: string[];
        tags: string[];
      };
      const result: string[] = [];
      if (interests.commaSeparated?.trim())
        result.push(interests.commaSeparated);
      for (const b of interests.bullets ?? []) if (b.trim()) result.push(b);
      for (const t of interests.tags ?? []) if (t.trim()) result.push(t);
      return result;
    },
  },
  {
    id: "custom",
    label: "Custom Section",
    defaultHeading: "CUSTOM SECTION",
    resumeKey: "custom",
    defaultEnabled: true,
    isList: false,
    hasDescriptions: false,
    hasBulletPointsSetting: true,
    matchWeight: 0.02,
    matchCategory: "other",
    customizationType: "toggle",
    customizationPrompt: "Rephrase content to be more relevant to {title} role.",
    extractText: (data) => {
      const custom = data as { descriptions: string[] };
      return (custom.descriptions ?? []).filter((d) => d.trim());
    },
  },
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const byId = new Map<ShowForm, SectionMeta>(
  SECTION_REGISTRY.map((s) => [s.id, s])
);

export function getSectionMeta(id: ShowForm): SectionMeta | undefined {
  return byId.get(id);
}

export function getAllSectionIds(): ShowForm[] {
  return SECTION_REGISTRY.map((s) => s.id);
}

export function getDefaultEnabledSections(): ShowForm[] {
  return SECTION_REGISTRY.filter((s) => s.defaultEnabled).map((s) => s.id);
}

export function getListSections(): SectionMeta[] {
  return SECTION_REGISTRY.filter((s) => s.isList);
}

export function getSectionsByCategory(
  category: MatchCategory
): SectionMeta[] {
  return SECTION_REGISTRY.filter((s) => s.matchCategory === category);
}

/**
 * Extract all searchable text from the entire resume, section by section.
 * Returns a map of sectionId → text[], plus "profile" for the profile.
 */
export function extractAllResumeText(
  resume: Resume
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  // Profile is always present and not in the registry
  const p = resume.profile;
  result["profile"] = [
    p.firstName,
    p.lastName,
    p.title,
    p.summary,
    p.city,
    p.state,
    p.country ?? "",
  ].filter(Boolean);

  for (const section of SECTION_REGISTRY) {
    const data = resume[section.resumeKey];
    result[section.id] = section.extractText(data, resume);
  }

  return result;
}

/**
 * Get a flat list of all text from the resume for keyword matching.
 */
export function extractFlatResumeText(resume: Resume): string[] {
  const textMap = extractAllResumeText(resume);
  return Object.values(textMap).flat();
}

/**
 * Derive the normalized match weights (summing to 1) from the registry,
 * plus the profile/title weight which is handled outside the registry.
 */
export function getNormalizedMatchWeights(): Record<string, number> {
  const PROFILE_WEIGHT = 0.05;
  const total =
    SECTION_REGISTRY.reduce((sum, s) => sum + s.matchWeight, 0) +
    PROFILE_WEIGHT;
  const weights: Record<string, number> = {
    profile: PROFILE_WEIGHT / total,
  };
  for (const s of SECTION_REGISTRY) {
    weights[s.id] = s.matchWeight / total;
  }
  return weights;
}

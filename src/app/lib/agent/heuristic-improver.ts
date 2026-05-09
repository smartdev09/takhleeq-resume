import type { Resume, ResumeWorkExperience, ResumeProject, ResumeVolunteering } from "lib/redux/types";

export interface Change {
  section: string;
  field: string;
  index?: number;
  before: string;
  after: string;
  type: "weak-phrase" | "pronoun" | "weak-verb" | "no-change";
}

// Phrases to replace with stronger alternatives
const WEAK_PHRASES: Array<[RegExp, string]> = [
  [/\bresponsible for\b/gi, "Led"],
  [/\bhelped (with|to)\b/gi, "Supported"],
  [/\bworked on\b/gi, "Built"],
  [/\bassisted (with|in)\b/gi, "Collaborated on"],
  [/\bwas involved in\b/gi, "Contributed to"],
  [/\bparticipated in\b/gi, "Contributed to"],
  [/\bmanaged to\b/gi, "Successfully"],
  [/\bwas responsible for\b/gi, "Owned"],
];

// Leading pronouns to strip
const LEADING_PRONOUNS = /^(I |My |We |Our |He |She |They |His |Her |Their )/i;

// Weak verbs to flag (we suggest but don't auto-replace to avoid false positives)
const WEAK_VERBS = /^(Did |Made |Got |Had |Worked |Helped |Assisted |Was |Were )/i;

const STRONG_VERB_SUGGESTIONS: Record<string, string> = {
  Did: "Executed",
  Made: "Developed",
  Got: "Achieved",
  Had: "Maintained",
  Worked: "Delivered",
  Helped: "Supported",
  Assisted: "Facilitated",
  Was: "Served as",
  Were: "Acted as",
};

export function improveBulletHeuristically(bullet: string): {
  text: string;
  changed: boolean;
  hint?: string;
} {
  let text = bullet.trim();
  let changed = false;

  // Remove leading pronouns
  const pronounMatch = text.match(LEADING_PRONOUNS);
  if (pronounMatch) {
    text = text.slice(pronounMatch[0].length);
    // Capitalize the first letter of what remains
    text = text.charAt(0).toUpperCase() + text.slice(1);
    changed = true;
  }

  // Replace weak phrases
  for (const [pattern, replacement] of WEAK_PHRASES) {
    const before = text;
    text = text.replace(pattern, replacement);
    if (text !== before) {
      changed = true;
      // Re-capitalize if replacement is at start
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }
  }

  // Flag bullets with no quantification
  const hasNumber = /\d/.test(text);
  const hint = !hasNumber ? "[Add metric]" : undefined;

  // Suggest stronger verbs (non-mutating, just a hint)
  const verbMatch = text.match(WEAK_VERBS);
  if (verbMatch && !changed) {
    const weak = verbMatch[1].trim();
    const strong = STRONG_VERB_SUGGESTIONS[weak];
    if (strong) {
      text = text.replace(verbMatch[1], `${strong} `);
      changed = true;
    }
  }

  return { text, changed, hint };
}

function improveBullets(
  descriptions: string[],
  section: string,
  changes: Change[],
  entryIndex?: number
): string[] {
  return descriptions.map((desc) => {
    const { text, changed } = improveBulletHeuristically(desc);
    if (changed) {
      changes.push({
        section,
        field: "descriptions",
        index: entryIndex,
        before: desc,
        after: text,
        type: "weak-phrase",
      });
    }
    return text;
  });
}

/**
 * Runs deterministic heuristic rules against a resume.
 * Safe, fast, and requires no AI calls.
 */
export function improveResumeHeuristically(
  resume: Resume
): { improved: Resume; changes: Change[] } {
  const changes: Change[] = [];

  // Deep clone to avoid mutation
  const improved: Resume = JSON.parse(JSON.stringify(resume));

  // Improve work experience bullets
  improved.workExperiences = improved.workExperiences.map(
    (exp: ResumeWorkExperience, i: number) => ({
      ...exp,
      descriptions: improveBullets(
        exp.descriptions,
        "workExperiences",
        changes,
        i
      ),
    })
  );

  // Improve project bullets
  improved.projects = improved.projects.map((proj: ResumeProject, i: number) => ({
    ...proj,
    descriptions: improveBullets(proj.descriptions, "projects", changes, i),
  }));

  // Improve volunteering bullets
  improved.volunteering = improved.volunteering.map(
    (v: ResumeVolunteering, i: number) => ({
      ...v,
      descriptions: improveBullets(
        v.descriptions,
        "volunteering",
        changes,
        i
      ),
    })
  );

  // Improve profile summary pronouns
  if (improved.profile.summary) {
    const { text, changed } = improveBulletHeuristically(
      improved.profile.summary
    );
    if (changed) {
      changes.push({
        section: "profile",
        field: "summary",
        before: improved.profile.summary,
        after: text,
        type: "pronoun",
      });
      improved.profile.summary = text;
    }
  }

  return { improved, changes };
}

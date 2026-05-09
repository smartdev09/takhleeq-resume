import type { Resume, FeaturedSkill } from "lib/redux/types";

export class ResumeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeValidationError";
  }
}

export function extractJSON(raw: string): string {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1]!.trim();
  }

  // Find the outermost JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new ResumeValidationError("No JSON object found in response");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function ensureString(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (val == null) return fallback;
  return String(val);
}

function ensureStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.map((item) => ensureString(item));
}

function ensureFeaturedSkills(val: unknown): FeaturedSkill[] {
  const empty: FeaturedSkill = { skill: "", rating: 4 };
  if (!Array.isArray(val)) return Array(6).fill({ ...empty });

  const result: FeaturedSkill[] = val.slice(0, 6).map((item) => {
    if (!item || typeof item !== "object") return { ...empty };
    return {
      skill: ensureString((item as Record<string, unknown>).skill),
      rating: Math.max(
        1,
        Math.min(5, Number((item as Record<string, unknown>).rating) || 4)
      ),
    };
  });

  // Pad to exactly 6
  while (result.length < 6) {
    result.push({ ...empty });
  }

  return result;
}

export function validateAndRepairResume(raw: string, original: Resume): Resume {
  const jsonStr = extractJSON(raw);
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new ResumeValidationError(
      `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}`
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new ResumeValidationError("Response is not a JSON object");
  }

  const profile = (parsed.profile ?? {}) as Record<string, unknown>;
  const origProfile = original.profile;

  const resume: Resume = {
    profile: {
      firstName: ensureString(profile.firstName, origProfile.firstName),
      lastName: ensureString(profile.lastName, origProfile.lastName),
      title: ensureString(profile.title, origProfile.title),
      email: ensureString(profile.email, origProfile.email),
      phone: ensureString(profile.phone, origProfile.phone),
      linkedin: ensureString(profile.linkedin, origProfile.linkedin),
      website: ensureString(profile.website, origProfile.website),
      github: ensureString(profile.github, origProfile.github ?? ""),
      city: ensureString(profile.city, origProfile.city),
      state: ensureString(profile.state, origProfile.state),
      country: ensureString(profile.country, origProfile.country ?? ""),
      summary: ensureString(profile.summary, origProfile.summary),
    },
    workExperiences: Array.isArray(parsed.workExperiences)
      ? (parsed.workExperiences as Record<string, unknown>[]).map((we) => ({
          company: ensureString(we.company),
          jobTitle: ensureString(we.jobTitle),
          date: ensureString(we.date),
          descriptions: ensureStringArray(we.descriptions),
        }))
      : original.workExperiences,
    educations: Array.isArray(parsed.educations)
      ? (parsed.educations as Record<string, unknown>[]).map((ed) => ({
          school: ensureString(ed.school),
          degree: ensureString(ed.degree),
          date: ensureString(ed.date),
          gpa: ensureString(ed.gpa),
          descriptions: ensureStringArray(ed.descriptions),
        }))
      : original.educations,
    projects: Array.isArray(parsed.projects)
      ? (parsed.projects as Record<string, unknown>[]).map((proj) => ({
          project: ensureString(proj.project),
          date: ensureString(proj.date),
          descriptions: ensureStringArray(proj.descriptions),
        }))
      : original.projects,
    skills: {
      featuredSkills: ensureFeaturedSkills(
        (parsed.skills as Record<string, unknown>)?.featuredSkills
      ),
      descriptions: ensureStringArray(
        (parsed.skills as Record<string, unknown>)?.descriptions
      ),
    },
    certifications: Array.isArray(parsed.certifications)
      ? (parsed.certifications as Record<string, unknown>[]).map((c) => ({
          name: ensureString(c.name),
          issuer: ensureString(c.issuer),
          date: ensureString(c.date),
          ...(c.url ? { url: ensureString(c.url) } : {}),
        }))
      : original.certifications,
    awards: Array.isArray(parsed.awards)
      ? (parsed.awards as Record<string, unknown>[]).map((a) => ({
          title: ensureString(a.title),
          description: ensureString(a.description),
          date: ensureString(a.date),
        }))
      : original.awards,
    publications: Array.isArray(parsed.publications)
      ? (parsed.publications as Record<string, unknown>[]).map((p) => ({
          title: ensureString(p.title),
          authors: ensureString(p.authors),
          venue: ensureString(p.venue),
          date: ensureString(p.date),
          ...(p.link ? { link: ensureString(p.link) } : {}),
        }))
      : original.publications,
    volunteering: Array.isArray(parsed.volunteering)
      ? (parsed.volunteering as Record<string, unknown>[]).map((v) => ({
          organization: ensureString(v.organization),
          role: ensureString(v.role),
          date: ensureString(v.date),
          descriptions: ensureStringArray(v.descriptions),
        }))
      : original.volunteering,
    interests: parsed.interests
      ? {
          commaSeparated: ensureString(
            (parsed.interests as Record<string, unknown>).commaSeparated
          ),
          bullets: ensureStringArray(
            (parsed.interests as Record<string, unknown>).bullets
          ),
          tags: ensureStringArray(
            (parsed.interests as Record<string, unknown>).tags
          ),
        }
      : original.interests,
    custom: {
      descriptions: parsed.custom
        ? ensureStringArray(
            (parsed.custom as Record<string, unknown>).descriptions
          )
        : original.custom.descriptions,
    },
  };

  return resume;
}

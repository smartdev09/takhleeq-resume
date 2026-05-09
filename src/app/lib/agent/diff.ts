import type { Resume } from "lib/redux/types";

export interface FieldChange {
  id: string;
  section: string;
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  /** User-edited override. When set, this value is used instead of newValue on apply. */
  editedValue?: string;
  accepted: boolean;
}

function diffStrings(
  section: string,
  field: string,
  label: string,
  oldVal: string,
  newVal: string,
  changes: FieldChange[]
): void {
  if (oldVal.trim() !== newVal.trim()) {
    changes.push({
      id: `${section}.${field}`,
      section,
      field,
      label,
      oldValue: oldVal,
      newValue: newVal,
      accepted: true,
    });
  }
}

function diffStringArrays(
  section: string,
  field: string,
  label: string,
  oldArr: string[],
  newArr: string[],
  changes: FieldChange[]
): void {
  const maxLen = Math.max(oldArr.length, newArr.length);
  for (let i = 0; i < maxLen; i++) {
    const oldVal = oldArr[i] ?? "";
    const newVal = newArr[i] ?? "";
    if (oldVal.trim() !== newVal.trim()) {
      changes.push({
        id: `${section}.${field}[${i}]`,
        section,
        field: `${field}[${i}]`,
        label: `${label} [${i + 1}]`,
        oldValue: oldVal,
        newValue: newVal,
        accepted: true,
      });
    }
  }
}

export function computeDiff(
  original: Resume,
  improved: Resume
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Profile
  const profileFields: Array<{
    key: keyof typeof original.profile;
    label: string;
  }> = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "title", label: "Title" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "website", label: "Website" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "summary", label: "Summary" },
  ];

  for (const { key, label } of profileFields) {
    diffStrings(
      "Profile",
      `profile.${key}`,
      label,
      original.profile[key] ?? "",
      improved.profile[key] ?? "",
      changes
    );
  }

  // Work Experiences
  const maxWE = Math.max(
    original.workExperiences.length,
    improved.workExperiences.length
  );
  for (let i = 0; i < maxWE; i++) {
    const orig = original.workExperiences[i];
    const imp = improved.workExperiences[i];
    const sectionName = `Work Experience ${i + 1}`;

    if (!orig && imp) {
      changes.push({
        id: `workExperiences[${i}]`,
        section: sectionName,
        field: `workExperiences[${i}]`,
        label: "New entry",
        oldValue: "",
        newValue: `${imp.jobTitle} at ${imp.company}`,
        accepted: true,
      });
      continue;
    }
    if (orig && !imp) continue;
    if (!orig || !imp) continue;

    diffStrings(sectionName, `workExperiences[${i}].company`, "Company", orig.company, imp.company, changes);
    diffStrings(sectionName, `workExperiences[${i}].jobTitle`, "Job Title", orig.jobTitle, imp.jobTitle, changes);
    diffStrings(sectionName, `workExperiences[${i}].date`, "Date", orig.date, imp.date, changes);
    diffStringArrays(sectionName, `workExperiences[${i}].descriptions`, "Bullet", orig.descriptions, imp.descriptions, changes);
  }

  // Educations
  const maxEd = Math.max(
    original.educations.length,
    improved.educations.length
  );
  for (let i = 0; i < maxEd; i++) {
    const orig = original.educations[i];
    const imp = improved.educations[i];
    const sectionName = `Education ${i + 1}`;
    if (!orig || !imp) continue;

    diffStrings(sectionName, `educations[${i}].school`, "School", orig.school, imp.school, changes);
    diffStrings(sectionName, `educations[${i}].degree`, "Degree", orig.degree, imp.degree, changes);
    diffStrings(sectionName, `educations[${i}].date`, "Date", orig.date, imp.date, changes);
    diffStrings(sectionName, `educations[${i}].gpa`, "GPA", orig.gpa, imp.gpa, changes);
    diffStringArrays(sectionName, `educations[${i}].descriptions`, "Bullet", orig.descriptions, imp.descriptions, changes);
  }

  // Projects
  const maxProj = Math.max(
    original.projects.length,
    improved.projects.length
  );
  for (let i = 0; i < maxProj; i++) {
    const orig = original.projects[i];
    const imp = improved.projects[i];
    const sectionName = `Project ${i + 1}`;
    if (!orig || !imp) continue;

    diffStrings(sectionName, `projects[${i}].project`, "Name", orig.project, imp.project, changes);
    diffStrings(sectionName, `projects[${i}].date`, "Date", orig.date, imp.date, changes);
    diffStringArrays(sectionName, `projects[${i}].descriptions`, "Bullet", orig.descriptions, imp.descriptions, changes);
  }

  // Skills
  for (let i = 0; i < 6; i++) {
    const origSkill = original.skills.featuredSkills[i]?.skill ?? "";
    const impSkill = improved.skills.featuredSkills[i]?.skill ?? "";
    if (origSkill.trim() !== impSkill.trim()) {
      changes.push({
        id: `skills.featuredSkills[${i}]`,
        section: "Skills",
        field: `skills.featuredSkills[${i}].skill`,
        label: `Featured Skill ${i + 1}`,
        oldValue: origSkill || "(empty)",
        newValue: impSkill || "(empty)",
        accepted: true,
      });
    }
  }
  diffStringArrays("Skills", "skills.descriptions", "Skill Category", original.skills.descriptions, improved.skills.descriptions, changes);

  // Summary is already handled in profile above

  return changes;
}

export function applyAcceptedChanges(
  original: Resume,
  improved: Resume,
  changes: FieldChange[]
): Resume {
  const hasRejected = changes.some((c) => !c.accepted);
  const hasEdited = changes.some(
    (c) => c.accepted && c.editedValue !== undefined
  );

  if (!hasRejected && !hasEdited) return improved;
  if (!changes.some((c) => c.accepted)) return original;

  const result: Resume = JSON.parse(JSON.stringify(improved));

  for (const change of changes) {
    if (!change.accepted) {
      // Revert rejected changes to original value
      setNestedValue(result, change.field, getNestedValue(original, change.field));
    } else if (change.editedValue !== undefined) {
      // Apply user-edited value instead of the AI suggestion
      setNestedValue(result, change.field, change.editedValue);
    }
  }

  return result;
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = parsePath(path);
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(obj: unknown, path: string, value: unknown): void {
  const parts = parsePath(path);
  let current: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current == null || typeof current !== "object") return;
    current = (current as Record<string, unknown>)[parts[i]!];
  }
  if (current != null && typeof current === "object") {
    (current as Record<string, unknown>)[parts[parts.length - 1]!] = value;
  }
}

function parsePath(path: string): string[] {
  return path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
}

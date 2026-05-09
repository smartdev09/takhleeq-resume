import type { Resume, ResumeProfile } from "lib/redux/types";
import type { ResumeSectionToLines } from "lib/parse-resume-from-pdf/types";
import { extractProfile } from "lib/parse-resume-from-pdf/extract-resume-from-sections/extract-profile";
import { extractEducation } from "lib/parse-resume-from-pdf/extract-resume-from-sections/extract-education";
import { extractWorkExperience } from "lib/parse-resume-from-pdf/extract-resume-from-sections/extract-work-experience";
import { extractProject } from "lib/parse-resume-from-pdf/extract-resume-from-sections/extract-project";
import { extractSkills } from "lib/parse-resume-from-pdf/extract-resume-from-sections/extract-skills";
import {
  initialCertification,
  initialAward,
  initialPublication,
  initialVolunteering,
  initialInterest,
} from "lib/redux/resumeSlice";

function mapExtractedProfileToResumeProfile(profile: {
  name: string;
  email: string;
  phone: string;
  location: string;
  url: string;
  summary: string;
}): ResumeProfile {
  const name = (profile.name ?? "").trim();
  const [firstName = "", ...rest] = name.split(/\s+/);
  const lastName = rest.join(" ").trim();
  const [city = "", state = ""] = (profile.location ?? "")
    .split(",")
    .map((s) => s.trim());
  const url = profile.url ?? "";
  return {
    firstName,
    lastName,
    title: "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    linkedin: url.includes("linkedin") ? url : "",
    website: url.includes("linkedin") ? "" : url,
    city,
    state,
    summary: profile.summary ?? "",
  };
}

/**
 * Step 4. Extract resume from sections.
 *
 * This is the core of the resume parser to resume information from the sections.
 *
 * The gist of the extraction engine is a feature scoring system. Each resume attribute
 * to be extracted has a custom feature sets, where each feature set consists of a
 * feature matching function and a feature matching score if matched (feature matching
 * score can be a positive or negative number). To compute the final feature score of
 * a text item for a particular resume attribute, it would run the text item through
 * all its feature sets and sum up the matching feature scores. This process is carried
 * out for all text items within the section, and the text item with the highest computed
 * feature score is identified as the extracted resume attribute.
 */
export const extractResumeFromSections = (
  sections: ResumeSectionToLines
): Resume => {
  const { profile: extractedProfile } = extractProfile(sections);
  const { educations } = extractEducation(sections);
  const { workExperiences } = extractWorkExperience(sections);
  const { projects } = extractProject(sections);
  const { skills } = extractSkills(sections);

  const profile = mapExtractedProfileToResumeProfile(extractedProfile);

  return {
    profile,
    educations,
    workExperiences,
    projects,
    skills,
    certifications: [{ ...initialCertification }],
    awards: [{ ...initialAward }],
    publications: [{ ...initialPublication }],
    volunteering: [{ ...initialVolunteering }],
    interests: { ...initialInterest },
    custom: {
      descriptions: [],
    },
  };
};

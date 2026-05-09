// ---------------------------------------------------------------------------
// Job Match Scorer
//
// Compares a Resume against a ParsedJobDescription and produces a detailed
// match report. Uses the section registry so new sections are automatically
// picked up.
// ---------------------------------------------------------------------------

import type { Resume } from "lib/redux/types";
import type { ParsedJobDescription } from "./jd-parser";
import {
  SECTION_REGISTRY,
  extractAllResumeText,
  type SectionMeta,
} from "lib/resume-section-registry";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type MatchStatus = "match" | "partial" | "missing";

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  source: "required" | "preferred";
  /** Which resume section(s) contained this keyword */
  foundIn: string[];
}

export interface ComparisonRow {
  id: string;
  label: string;
  status: MatchStatus;
  jdValue: string;
  resumeValue: string;
  /** Score contribution for this row (0–1) */
  score: number;
  weight: number;
}

export interface JobMatchResult {
  /** 0–10 overall score */
  overallScore: number;
  label: "Excellent" | "Good" | "Fair" | "Poor";
  comparisons: ComparisonRow[];
  keywords: KeywordMatch[];
  keywordStats: {
    matched: number;
    total: number;
  };
  /** Per-section scores (0–1) */
  sectionScores: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Fuzzy matching utilities
// ---------------------------------------------------------------------------

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function tokenize(str: string): string[] {
  return normalize(str).split(/\s+/).filter(Boolean);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  setA.forEach((item) => {
    if (setB.has(item)) intersection++;
  });
  const unionSet = new Set(a.concat(b));
  return unionSet.size === 0 ? 0 : intersection / unionSet.size;
}

function containsKeyword(text: string, keyword: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  if (normalizedText.includes(normalizedKeyword)) return true;

  const kwTokens = tokenize(keyword);
  const textTokens = new Set(tokenize(text));
  return kwTokens.length > 0 && kwTokens.every((t) => textTokens.has(t));
}

// ---------------------------------------------------------------------------
// Individual comparison scorers
// ---------------------------------------------------------------------------

function scoreTitle(
  jdTitle: string,
  resumeTitle: string
): { score: number; status: MatchStatus } {
  if (!jdTitle.trim()) return { score: 1, status: "match" };
  if (!resumeTitle.trim()) return { score: 0, status: "missing" };

  const similarity = jaccardSimilarity(
    tokenize(jdTitle),
    tokenize(resumeTitle)
  );

  if (similarity >= 0.5) return { score: 1, status: "match" };
  if (similarity >= 0.2) return { score: 0.5, status: "partial" };
  return { score: 0, status: "missing" };
}

function scoreYearsOfExperience(
  jdYoe: ParsedJobDescription["yearsOfExperience"],
  resume: Resume
): { score: number; status: MatchStatus; resumeYoe: string } {
  if (!jdYoe) return { score: 1, status: "match", resumeYoe: "N/A" };

  const totalYears = estimateResumeYoE(resume);
  const resumeYoe =
    totalYears > 0 ? `${totalYears}+ years exp` : "Not determined";

  if (totalYears >= jdYoe.min) return { score: 1, status: "match", resumeYoe };
  if (totalYears >= jdYoe.min - 1)
    return { score: 0.6, status: "partial", resumeYoe };
  return { score: 0, status: "missing", resumeYoe };
}

function estimateResumeYoE(resume: Resume): number {
  let totalMonths = 0;
  const now = new Date();

  for (const exp of resume.workExperiences) {
    if (!exp.date?.trim()) continue;
    const { start, end } = parseDateRange(exp.date);
    if (!start) continue;
    const endDate = end ?? now;
    const months =
      (endDate.getFullYear() - start.getFullYear()) * 12 +
      (endDate.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}

function parseDateRange(
  dateStr: string
): { start: Date | null; end: Date | null } {
  const parts = dateStr.split(/[-–—to]+/i).map((s) => s.trim());

  const parseOne = (s: string): Date | null => {
    if (/present|current|now/i.test(s)) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    // Try "Mon YYYY" or "YYYY"
    const monthYear = s.match(
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i
    );
    if (monthYear) return new Date(s);
    const yearOnly = s.match(/(\d{4})/);
    if (yearOnly) return new Date(parseInt(yearOnly[1]!, 10), 0);
    return null;
  };

  return {
    start: parts[0] ? parseOne(parts[0]) : null,
    end: parts[1] ? parseOne(parts[1]) : null,
  };
}

function scoreIndustries(
  jdIndustries: string[],
  resumeText: string[]
): { score: number; status: MatchStatus; matched: string[] } {
  if (jdIndustries.length === 0)
    return { score: 1, status: "match", matched: [] };

  const flatText = resumeText.join(" ");
  const matched = jdIndustries.filter((ind) =>
    containsKeyword(flatText, ind)
  );

  const ratio = matched.length / jdIndustries.length;
  if (ratio >= 0.5) return { score: 1, status: "match", matched };
  if (ratio > 0) return { score: 0.5, status: "partial", matched };
  return { score: 0, status: "missing", matched };
}

// ---------------------------------------------------------------------------
// Keyword matching (the big one — 35% of score)
// ---------------------------------------------------------------------------

function matchKeywords(
  jd: ParsedJobDescription,
  resumeTextMap: Record<string, string[]>
): KeywordMatch[] {
  const allText = Object.entries(resumeTextMap);
  const results: KeywordMatch[] = [];

  const processKeywords = (
    keywords: string[],
    source: "required" | "preferred"
  ) => {
    for (const keyword of keywords) {
      const foundIn: string[] = [];
      for (const [sectionId, texts] of allText) {
        const joined = texts.join(" ");
        if (containsKeyword(joined, keyword)) {
          foundIn.push(sectionId);
        }
      }
      results.push({
        keyword,
        found: foundIn.length > 0,
        source,
        foundIn,
      });
    }
  };

  processKeywords(jd.requiredSkills, "required");
  processKeywords(jd.preferredSkills, "preferred");

  return results;
}

// ---------------------------------------------------------------------------
// Section-level scoring (uses registry)
// ---------------------------------------------------------------------------

function scoreSectionContent(
  section: SectionMeta,
  sectionText: string[],
  jd: ParsedJobDescription
): number {
  if (sectionText.length === 0) return 0;

  const allJDKeywords = [...jd.requiredSkills, ...jd.preferredSkills];
  if (allJDKeywords.length === 0) return 0.7;

  const joined = sectionText.join(" ");
  let matched = 0;
  for (const kw of allJDKeywords) {
    if (containsKeyword(joined, kw)) matched++;
  }

  return allJDKeywords.length > 0 ? matched / allJDKeywords.length : 0;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

const COMPARISON_WEIGHTS = {
  title: 0.15,
  yoe: 0.15,
  industry: 0.10,
  keywords: 0.35,
  sections: 0.25,
};

export function scoreJobMatch(
  resume: Resume,
  jd: ParsedJobDescription
): JobMatchResult {
  const resumeTextMap = extractAllResumeText(resume);
  const allResumeText = Object.values(resumeTextMap).flat();

  // --- Title comparison ---
  const titleResult = scoreTitle(jd.title, resume.profile.title);
  const jdYoeStr = jd.yearsOfExperience
    ? jd.yearsOfExperience.max
      ? `${jd.yearsOfExperience.min}-${jd.yearsOfExperience.max} years exp`
      : `${jd.yearsOfExperience.min}+ years exp`
    : "Not specified";

  // --- YoE comparison ---
  const yoeResult = scoreYearsOfExperience(jd.yearsOfExperience, resume);

  // --- Industry comparison ---
  const industryResult = scoreIndustries(jd.industries, allResumeText);

  // --- Keywords ---
  const keywords = matchKeywords(jd, resumeTextMap);
  const requiredKws = keywords.filter((k) => k.source === "required");
  const requiredMatched = requiredKws.filter((k) => k.found).length;
  const preferredKws = keywords.filter((k) => k.source === "preferred");
  const preferredMatched = preferredKws.filter((k) => k.found).length;

  const requiredRatio =
    requiredKws.length > 0 ? requiredMatched / requiredKws.length : 1;
  const preferredRatio =
    preferredKws.length > 0 ? preferredMatched / preferredKws.length : 1;
  const keywordScore = requiredRatio * 0.8 + preferredRatio * 0.2;

  // --- Per-section scores (weighted from registry) ---
  const sectionScores: Record<string, number> = {};
  let weightedSectionTotal = 0;
  let sectionWeightSum = 0;

  for (const section of SECTION_REGISTRY) {
    const text = resumeTextMap[section.id] ?? [];
    const score = scoreSectionContent(section, text, jd);
    sectionScores[section.id] = score;
    weightedSectionTotal += score * section.matchWeight;
    sectionWeightSum += section.matchWeight;
  }

  const sectionScore =
    sectionWeightSum > 0 ? weightedSectionTotal / sectionWeightSum : 0;

  // --- Keyword status ---
  const totalKws = keywords.length;
  const matchedKws = keywords.filter((k) => k.found).length;

  const keywordStatus: MatchStatus =
    totalKws === 0
      ? "match"
      : matchedKws / totalKws >= 0.6
        ? "match"
        : matchedKws / totalKws >= 0.3
          ? "partial"
          : "missing";

  // --- Build comparisons ---
  const comparisons: ComparisonRow[] = [
    {
      id: "title",
      label: "Job Title",
      status: titleResult.status,
      jdValue: jd.title || "Not specified",
      resumeValue: resume.profile.title || "Not specified",
      score: titleResult.score,
      weight: COMPARISON_WEIGHTS.title,
    },
    {
      id: "yoe",
      label: "Years of Experience",
      status: yoeResult.status,
      jdValue: jdYoeStr,
      resumeValue: yoeResult.resumeYoe,
      score: yoeResult.score,
      weight: COMPARISON_WEIGHTS.yoe,
    },
    {
      id: "industry",
      label: "Industry Experience",
      status: industryResult.status,
      jdValue: jd.industries.join(", ") || "Not specified",
      resumeValue: industryResult.matched.join(", ") || "None detected",
      score: industryResult.score,
      weight: COMPARISON_WEIGHTS.industry,
    },
    {
      id: "keywords",
      label: `Job Keywords (${matchedKws}/${totalKws})`,
      status: keywordStatus,
      jdValue: `${totalKws} keywords found`,
      resumeValue: `${matchedKws} matched`,
      score: keywordScore,
      weight: COMPARISON_WEIGHTS.keywords,
    },
  ];

  // Add education comparison if JD mentions education
  let eduScore = 0;
  let eduWeight = 0;
  if (jd.educationRequirements.length > 0) {
    const eduText = (resumeTextMap["educations"] ?? []).join(" ");
    const eduMatched = jd.educationRequirements.filter((req) =>
      containsKeyword(eduText, req)
    );
    eduScore = eduMatched.length / jd.educationRequirements.length;
    eduWeight = 0.05;
    comparisons.push({
      id: "education",
      label: "Education",
      status: eduScore >= 0.5 ? "match" : eduScore > 0 ? "partial" : "missing",
      jdValue: jd.educationRequirements.slice(0, 3).join(", "),
      resumeValue: eduMatched.join(", ") || "Not matched",
      score: eduScore,
      weight: eduWeight,
    });
  }

  // Add certification comparison if JD mentions certs
  let certScore = 0;
  let certWeight = 0;
  if (jd.certifications.length > 0) {
    const certText = (resumeTextMap["certifications"] ?? []).join(" ");
    const certMatched = jd.certifications.filter((c) =>
      containsKeyword(certText, c)
    );
    certScore = certMatched.length / jd.certifications.length;
    certWeight = 0.05;
    comparisons.push({
      id: "certifications",
      label: "Certifications",
      status:
        certScore >= 0.5 ? "match" : certScore > 0 ? "partial" : "missing",
      jdValue: jd.certifications.join(", "),
      resumeValue: certMatched.join(", ") || "None matched",
      score: certScore,
      weight: certWeight,
    });
  }

  // --- Overall score (0-10) ---
  // Normalize total weight to account for optional education/cert comparisons
  const totalWeight = 1 + eduWeight + certWeight;
  const weightedSum =
    (titleResult.score * COMPARISON_WEIGHTS.title +
      yoeResult.score * COMPARISON_WEIGHTS.yoe +
      industryResult.score * COMPARISON_WEIGHTS.industry +
      keywordScore * COMPARISON_WEIGHTS.keywords +
      sectionScore * COMPARISON_WEIGHTS.sections +
      eduScore * eduWeight +
      certScore * certWeight) /
    totalWeight;

  const overallScore = Math.round(weightedSum * 100) / 10;
  const clamped = Math.max(0, Math.min(10, overallScore));

  return {
    overallScore: clamped,
    label: getLabel(clamped),
    comparisons,
    keywords,
    keywordStats: { matched: matchedKws, total: totalKws },
    sectionScores,
  };
}

function getLabel(score: number): JobMatchResult["label"] {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Fair";
  return "Poor";
}

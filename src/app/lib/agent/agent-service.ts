import type { Resume } from "lib/redux/types";
import type { AIProvider } from "./providers/types";
import { SYSTEM_PROMPT } from "./prompts/system";
import { buildATSImprovementPrompt, buildCustomPrompt } from "./prompts/ats-improve";
import { buildJobTailorPrompt } from "./prompts/job-tailor";
import {
  buildCoverLetterPrompt,
  type CoverLetterParams,
} from "./prompts/cover-letter";
import { validateAndRepairResume } from "./json-validator";
import { scoreResume, type ATSResult } from "./ats-scorer";
import { computeDiff, type FieldChange } from "./diff";
import { addVersion } from "./version-store";
import { improveResumeHeuristically } from "./heuristic-improver";

export interface AgentResult {
  improved: Resume;
  changes: FieldChange[];
  atsScoreBefore: number;
  atsScoreAfter: number;
  atsBefore: ATSResult;
  atsAfter: ATSResult;
}

export class AgentService {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async improveATS(resume: Resume): Promise<AgentResult> {
    const atsBefore = scoreResume(resume);

    // P4-5: Run heuristic improvements first (fast, no AI needed)
    const { improved: heuristicallyImproved } = improveResumeHeuristically(resume);

    const raw = await this.provider.generate(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildATSImprovementPrompt(heuristicallyImproved, atsBefore) },
      ],
      { temperature: 0.3, jsonMode: true, maxTokens: 8192 }
    );

    const improved = validateAndRepairResume(raw, heuristicallyImproved);
    const atsAfter = scoreResume(improved);
    const changes = computeDiff(resume, improved);

    addVersion(improved, "ats-improve", {
      changes,
      atsScoreBefore: atsBefore.overall,
      atsScoreAfter: atsAfter.overall,
    });

    return {
      improved,
      changes,
      atsScoreBefore: atsBefore.overall,
      atsScoreAfter: atsAfter.overall,
      atsBefore,
      atsAfter,
    };
  }

  async tailorToJob(
    resume: Resume,
    jobDescription: string
  ): Promise<AgentResult> {
    const atsBefore = scoreResume(resume);

    const raw = await this.provider.generate(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildJobTailorPrompt(resume, jobDescription) },
      ],
      { temperature: 0.3, jsonMode: true, maxTokens: 8192 }
    );

    const improved = validateAndRepairResume(raw, resume);
    const atsAfter = scoreResume(improved);
    const changes = computeDiff(resume, improved);

    addVersion(improved, "job-tailor", {
      jobDescription,
      changes,
      atsScoreBefore: atsBefore.overall,
      atsScoreAfter: atsAfter.overall,
    });

    return {
      improved,
      changes,
      atsScoreBefore: atsBefore.overall,
      atsScoreAfter: atsAfter.overall,
      atsBefore,
      atsAfter,
    };
  }

  async customPrompt(
    resume: Resume,
    instruction: string
  ): Promise<AgentResult> {
    const atsBefore = scoreResume(resume);

    const raw = await this.provider.generate(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildCustomPrompt(resume, instruction) },
      ],
      { temperature: 0.4, jsonMode: true, maxTokens: 8192 }
    );

    const improved = validateAndRepairResume(raw, resume);
    const atsAfter = scoreResume(improved);
    const changes = computeDiff(resume, improved);

    addVersion(improved, "custom", {
      prompt: instruction,
      changes,
      atsScoreBefore: atsBefore.overall,
      atsScoreAfter: atsAfter.overall,
    });

    return {
      improved,
      changes,
      atsScoreBefore: atsBefore.overall,
      atsScoreAfter: atsAfter.overall,
      atsBefore,
      atsAfter,
    };
  }

  async generateCoverLetter(params: CoverLetterParams): Promise<string> {
    const prompt = buildCoverLetterPrompt(params);
    const raw = await this.provider.generate(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      { temperature: 0.6, maxTokens: 1024 },
    );
    return raw.trim();
  }
}

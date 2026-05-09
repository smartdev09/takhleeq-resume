"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useAppSelector, useAppDispatch } from "lib/redux/hooks";
import { selectResume, setResume } from "lib/redux/resumeSlice";
import { Resume as ResumePreview } from "components/Resume";
import { Button } from "components/ui/button";
import { AgentSetup } from "components/agent/AgentSetup";
import { StepIndicator, type Step } from "./StepIndicator";
import { GapAnalysis } from "./GapAnalysis";
import {
  CustomizeSections,
  type SectionCustomization,
} from "./CustomizeSections";
import { GeneratingLoader } from "./GeneratingLoader";
import { ReviewChat } from "./ReviewChat";
import { SaveResumeDialog } from "./SaveResumeDialog";
import { parseJobDescription, type ParsedJobDescription } from "lib/agent/jd-parser";
import {
  scoreJobMatch,
  type JobMatchResult,
} from "lib/agent/job-match-scorer";
import {
  createSession,
  addUserMessage,
  addAssistantMessage,
  getCurrentResume,
  undo,
  redo,
  type ChatSession,
} from "lib/agent/chat-session";
import { getConfiguredProvider } from "lib/agent/provider-factory";
import { AgentService, type AgentResult } from "lib/agent/agent-service";
import { DiffReview } from "components/agent/DiffReview";
import { SYSTEM_PROMPT } from "lib/agent/prompts/system";
import { buildCustomizedTailorPrompt } from "lib/agent/prompts/job-match-sections";
import { buildJobMatchChatSystemPrompt } from "lib/agent/prompts/job-match-chat";
import { validateAndRepairResume } from "lib/agent/json-validator";
import { addVersion } from "lib/agent/version-store";
import type { Resume } from "lib/redux/types";
import {
  DocumentTextIcon,
  ChatBubbleBottomCenterTextIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";
import { trackEvent, Events } from "lib/analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FlowStep = "input" | "gap-analysis" | "customize" | "generating" | "review";
type InputMode = "job-tailor" | "custom-prompt";

const STEPS: Step[] = [
  { id: 1, label: "See Your Difference" },
  { id: 2, label: "Align Your Resume" },
  { id: 3, label: "Review Your New Resume" },
];

function stepToNumber(step: FlowStep): number {
  switch (step) {
    case "input":
    case "gap-analysis":
      return 1;
    case "customize":
      return 2;
    case "generating":
    case "review":
      return 3;
  }
}

// ---------------------------------------------------------------------------
// Context type for cross-tab communication (exported for BuilderWorkspace)
// ---------------------------------------------------------------------------

export interface JobMatchSessionState {
  session: ChatSession | null;
  isActive: boolean;
  jobTitle: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface JobMatcherFlowProps {
  /** Callback to switch to a different builder tab */
  onSwitchTab?: (tab: string) => void;
  /** Callback when session state changes (for cross-tab awareness) */
  onSessionChange?: (state: JobMatchSessionState) => void;
  /** Pre-filled JD (e.g. from Jobs dashboard) */
  initialJobDescription?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JobMatcherFlow({
  onSwitchTab,
  onSessionChange,
  initialJobDescription,
}: JobMatcherFlowProps) {
  const dispatch = useAppDispatch();
  const resume = useAppSelector(selectResume);

  // Flow state
  const [step, setStep] = useState<FlowStep>(
    initialJobDescription ? "gap-analysis" : "input"
  );
  const [inputMode, setInputMode] = useState<InputMode>("job-tailor");
  const [jobDescription, setJobDescription] = useState(
    initialJobDescription ?? ""
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [parsedJD, setParsedJD] = useState<ParsedJobDescription | null>(
    initialJobDescription
      ? parseJobDescription(initialJobDescription)
      : null
  );
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isChatGenerating, setIsChatGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState<string>("");
  const [customPromptResult, setCustomPromptResult] =
    useState<AgentResult | null>(null);

  const originalResumeRef = useRef<Resume>(resume);

  // Compute match result when JD is parsed
  const computedMatchResult = useMemo(() => {
    if (!parsedJD) return null;
    return scoreJobMatch(resume, parsedJD);
  }, [resume, parsedJD]);

  const activeMatchResult = matchResult ?? computedMatchResult;

  // ---------------------------------------------------------------------------
  // Step transitions
  // ---------------------------------------------------------------------------

  const handleAnalyze = useCallback(async () => {
    if (inputMode === "custom-prompt") {
      if (!customPrompt.trim()) return;
      const provider = getConfiguredProvider();
      if (!provider) {
        setShowSetup(true);
        return;
      }
      originalResumeRef.current = resume;
      setStep("generating");
      setGenError(null);
      setIsGenerating(true);
      try {
        const service = new AgentService(provider);
        const result = await service.customPrompt(resume, customPrompt);
        setCustomPromptResult(result);
        setStep("review");
      } catch (e) {
        setGenError(
          e instanceof Error ? e.message : "Failed to generate resume"
        );
        setStep("input");
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    if (!jobDescription.trim()) return;
    const parsed = parseJobDescription(jobDescription);
    setParsedJD(parsed);
    const result = scoreJobMatch(resume, parsed);
    setMatchResult(result);
    originalResumeRef.current = resume;
    setStep("gap-analysis");
  }, [inputMode, customPrompt, jobDescription, resume]);

  const handleImprove = useCallback(() => {
    setStep("customize");
  }, []);

  const handleGenerate = useCallback(
    async (customizations: SectionCustomization[]) => {
      const provider = getConfiguredProvider();
      if (!provider) {
        setShowSetup(true);
        return;
      }
      if (!parsedJD) return;

      setStep("generating");
      setGenError(null);
      setIsGenerating(true);

      try {
        const prompt = buildCustomizedTailorPrompt(
          resume,
          parsedJD,
          customizations
        );

        const raw = await provider.generate(
          [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          { temperature: 0.3, jsonMode: true, maxTokens: 8192 }
        );

        const improved = validateAndRepairResume(raw, resume);

        addVersion(improved, "job-tailor", {
          jobDescription,
        });

        // Load generated resume into Redux for preview
        dispatch(setResume(improved));

        // Create chat session
        const session = createSession(
          jobDescription,
          parsedJD,
          originalResumeRef.current,
          improved,
          customizations
        );
        setChatSession(session);

        onSessionChange?.({
          session,
          isActive: true,
          jobTitle: parsedJD.title,
        });

        trackEvent(Events.JOB_MATCH_COMPLETED, {
          jobTitle: parsedJD.title ?? "unknown",
        });
        setStep("review");
      } catch (e) {
        setGenError(
          e instanceof Error ? e.message : "Failed to generate resume"
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [parsedJD, resume, jobDescription, dispatch, onSessionChange]
  );

  // ---------------------------------------------------------------------------
  // Chat handlers
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!chatSession || !parsedJD) return;

      const provider = getConfiguredProvider();
      if (!provider) {
        setShowSetup(true);
        return;
      }

      let updated = addUserMessage(chatSession, content);
      setChatSession(updated);
      setIsChatGenerating(true);
      setStreamingText("");

      try {
        const currentResume = getCurrentResume(updated);
        const systemPrompt = buildJobMatchChatSystemPrompt(
          currentResume,
          parsedJD
        );

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...updated.messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
        ];

        let raw: string;

        if (provider.generateStream) {
          // Stream the response progressively
          let accumulated = "";
          const stream = provider.generateStream(messages, {
            temperature: 0.3,
            maxTokens: 8192,
          });
          for await (const chunk of stream) {
            accumulated += chunk;
            setStreamingText(accumulated);
          }
          raw = accumulated;
          setStreamingText("");
        } else {
          raw = await provider.generate(messages, {
            temperature: 0.3,
            maxTokens: 8192,
          });
        }

        // Check if response contains JSON (resume update)
        const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
        let newResume: Resume | undefined;
        let responseText = raw;

        if (jsonMatch?.[1]) {
          try {
            newResume = validateAndRepairResume(jsonMatch[1], currentResume);
            responseText = raw.replace(/```json[\s\S]*?```/, "").trim();
            if (!responseText) {
              responseText = "I've updated your resume.";
            }
            dispatch(setResume(newResume));
          } catch {
            responseText = raw;
          }
        }

        updated = addAssistantMessage(updated, responseText, newResume);
        setChatSession(updated);

        if (newResume) {
          onSessionChange?.({
            session: updated,
            isActive: true,
            jobTitle: parsedJD.title,
          });
        }
      } catch (e) {
        updated = addAssistantMessage(
          updated,
          `Sorry, something went wrong: ${e instanceof Error ? e.message : "Unknown error"}. Please try again.`
        );
        setChatSession(updated);
      } finally {
        setIsChatGenerating(false);
        setStreamingText("");
      }
    },
    [chatSession, parsedJD, dispatch, onSessionChange]
  );

  const handleUndo = useCallback(() => {
    if (!chatSession) return;
    const updated = undo(chatSession);
    setChatSession(updated);
    dispatch(setResume(getCurrentResume(updated)));
  }, [chatSession, dispatch]);

  const handleRedo = useCallback(() => {
    if (!chatSession) return;
    const updated = redo(chatSession);
    setChatSession(updated);
    dispatch(setResume(getCurrentResume(updated)));
  }, [chatSession, dispatch]);

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------

  const handleEditInEditor = useCallback(() => {
    onSwitchTab?.("content-editor");
  }, [onSwitchTab]);

  const handleEditInDesigner = useCallback(() => {
    onSwitchTab?.("designer");
  }, [onSwitchTab]);

  const handleSave = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const handleConfirmSave = useCallback(
    (name: string) => {
      if (chatSession) {
        const currentResume = getCurrentResume(chatSession);
        addVersion(currentResume, "job-tailor", {
          jobDescription,
        });
      }
      setShowSaveDialog(false);
      onSessionChange?.({ session: null, isActive: false, jobTitle: "" });
    },
    [chatSession, jobDescription, onSessionChange]
  );

  const handleDiscard = useCallback(() => {
    dispatch(setResume(originalResumeRef.current));
    setChatSession(null);
    setStep("input");
    setMatchResult(null);
    setParsedJD(null);
    onSessionChange?.({ session: null, isActive: false, jobTitle: "" });
  }, [dispatch, onSessionChange]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Custom prompt result — show DiffReview instead of the normal flow
  if (customPromptResult) {
    return (
      <DiffReview
        result={customPromptResult}
        onClose={() => {
          setCustomPromptResult(null);
          dispatch(setResume(originalResumeRef.current));
          setStep("input");
        }}
      />
    );
  }

  // Input step (JD paste or custom prompt)
  if (step === "input") {
    return (
      <div className="h-full overflow-hidden md:grid md:grid-cols-6">
        <div className="h-full overflow-y-auto md:col-span-3">
          <div className="flex flex-col gap-4 p-4">
            {/* Mode Toggle */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  inputMode === "job-tailor"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={() => setInputMode("job-tailor")}
              >
                <DocumentTextIcon className="h-4 w-4" />
                Job Description
              </button>
              <button
                type="button"
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  inputMode === "custom-prompt"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
                onClick={() => setInputMode("custom-prompt")}
              >
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                Custom Prompt
              </button>
            </div>

            {inputMode === "job-tailor" ? (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Paste Job Description
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    We&apos;ll analyze the job requirements and show you exactly
                    how your resume matches up.
                  </p>
                </div>
                <textarea
                  className="h-72 w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {jobDescription.length > 0
                      ? `${jobDescription.split(/\s+/).filter(Boolean).length} words`
                      : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Custom Instruction
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Write your own instruction for the AI.
                  </p>
                </div>
                <textarea
                  className="h-48 w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                  placeholder="Example: Make my resume more concise, targeting 1 page..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={
                  inputMode === "job-tailor"
                    ? !jobDescription.trim()
                    : !customPrompt.trim()
                }
                className="flex-1"
              >
                Analyze Match
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSetup(true)}
                title="AI Settings"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
          <ResumePreview />
        </div>

        {showSetup && <AgentSetup onClose={() => setShowSetup(false)} />}
      </div>
    );
  }

  // Steps 1-3 with stepper
  const currentStepNum = stepToNumber(step);

  return (
    <div className="h-full overflow-hidden md:grid md:grid-cols-6">
      {/* Left panel */}
      <div className="flex h-full min-h-0 flex-col md:col-span-3">
        {step !== "generating" && (
          <StepIndicator steps={STEPS} currentStep={currentStepNum} />
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === "gap-analysis" && parsedJD && (
            <GapAnalysis
              resume={resume}
              parsedJD={parsedJD}
              resumeTitle={
                [resume.profile.firstName, resume.profile.lastName]
                  .filter(Boolean)
                  .join(" ") || "Your Resume"
              }
              onImprove={handleImprove}
            />
          )}

          {step === "customize" && parsedJD && activeMatchResult && (
            <CustomizeSections
              resume={resume}
              parsedJD={parsedJD}
              matchResult={activeMatchResult}
              onGenerate={handleGenerate}
              onBack={() => setStep("gap-analysis")}
            />
          )}

          {step === "generating" && (
            <GeneratingLoader
              error={genError}
              onRetry={() => setStep("customize")}
            />
          )}

          {step === "review" && chatSession && (
            <ReviewChat
              session={chatSession}
              isGenerating={isChatGenerating}
              streamingText={streamingText}
              onSendMessage={handleSendMessage}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onEditInEditor={handleEditInEditor}
              onEditInDesigner={handleEditInDesigner}
              onSave={handleSave}
              onDiscard={handleDiscard}
            />
          )}
        </div>
      </div>

      {/* Right panel — resume preview */}
      <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
        <ResumePreview />
      </div>

      {/* Overlays */}
      {showSetup && <AgentSetup onClose={() => setShowSetup(false)} />}
      {showSaveDialog && (
        <SaveResumeDialog
          defaultName={`${parsedJD?.title || "Tailored"} Resume - ${new Date().toLocaleDateString()}`}
          onSave={handleConfirmSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}

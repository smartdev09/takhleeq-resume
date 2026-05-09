// ---------------------------------------------------------------------------
// Chat Session with Resume Versioning
//
// Each AI message that modifies the resume stores a snapshot. Users can
// undo/redo by navigating the version stack (like Cursor's code undo/redo).
// ---------------------------------------------------------------------------

import type { Resume } from "lib/redux/types";
import type { ParsedJobDescription } from "./jd-parser";
import type { SectionCustomization } from "components/agent/job-matcher/CustomizeSections";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  /** Only present on assistant messages that modified the resume */
  resumeSnapshot?: Resume;
}

export interface ChatSession {
  id: string;
  jobDescription: string;
  parsedJD: ParsedJobDescription;
  originalResume: Resume;
  customizations: SectionCustomization[];
  messages: ChatMessage[];
  /** Index into the version stack (assistant messages with snapshots) */
  currentVersionIndex: number;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

let idCounter = 0;
function generateId(): string {
  return `msg_${Date.now()}_${++idCounter}`;
}

export function createSession(
  jobDescription: string,
  parsedJD: ParsedJobDescription,
  originalResume: Resume,
  generatedResume: Resume,
  customizations: SectionCustomization[]
): ChatSession {
  const systemMessage: ChatMessage = {
    id: generateId(),
    role: "system",
    content: "Resume tailored to job description. You can ask me to make further changes.",
    timestamp: Date.now(),
  };

  const assistantMessage: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content:
      "I've generated a tailored version of your resume. Here's what I changed:\n\n" +
      "- Optimized keywords to match the job description\n" +
      "- Rephrased bullet points for relevance\n" +
      "- Reordered skills by priority\n\n" +
      "Feel free to ask me to adjust anything — I can rephrase sections, " +
      "add emphasis on specific skills, or modify the tone.",
    timestamp: Date.now(),
    resumeSnapshot: generatedResume,
  };

  return {
    id: `session_${Date.now()}`,
    jobDescription,
    parsedJD,
    originalResume,
    customizations,
    messages: [systemMessage, assistantMessage],
    currentVersionIndex: 0,
  };
}

// ---------------------------------------------------------------------------
// Message operations
// ---------------------------------------------------------------------------

export function addUserMessage(
  session: ChatSession,
  content: string
): ChatSession {
  const message: ChatMessage = {
    id: generateId(),
    role: "user",
    content,
    timestamp: Date.now(),
  };
  return {
    ...session,
    messages: [...session.messages, message],
  };
}

export function addAssistantMessage(
  session: ChatSession,
  content: string,
  resumeSnapshot?: Resume
): ChatSession {
  const message: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content,
    timestamp: Date.now(),
    resumeSnapshot,
  };

  const newMessages = [...session.messages, message];

  // If this message has a snapshot, it becomes the latest version
  const versionMessages = newMessages.filter(
    (m) => m.role === "assistant" && m.resumeSnapshot
  );

  return {
    ...session,
    messages: newMessages,
    currentVersionIndex: resumeSnapshot
      ? versionMessages.length - 1
      : session.currentVersionIndex,
  };
}

// ---------------------------------------------------------------------------
// Version navigation (undo/redo)
// ---------------------------------------------------------------------------

function getVersionSnapshots(session: ChatSession): ChatMessage[] {
  return session.messages.filter(
    (m) => m.role === "assistant" && m.resumeSnapshot
  );
}

export function getCurrentResume(session: ChatSession): Resume {
  const versions = getVersionSnapshots(session);
  if (versions.length === 0) return session.originalResume;
  const current = versions[session.currentVersionIndex];
  return current?.resumeSnapshot ?? session.originalResume;
}

export function canUndo(session: ChatSession): boolean {
  return session.currentVersionIndex > 0;
}

export function canRedo(session: ChatSession): boolean {
  const versions = getVersionSnapshots(session);
  return session.currentVersionIndex < versions.length - 1;
}

export function undo(session: ChatSession): ChatSession {
  if (!canUndo(session)) return session;
  return {
    ...session,
    currentVersionIndex: session.currentVersionIndex - 1,
  };
}

export function redo(session: ChatSession): ChatSession {
  if (!canRedo(session)) return session;
  return {
    ...session,
    currentVersionIndex: session.currentVersionIndex + 1,
  };
}

/**
 * Restore to the version that was current just before a specific message.
 * Used for "restore to before this message" UX.
 */
export function restoreToBefore(
  session: ChatSession,
  messageId: string
): ChatSession {
  const versions = getVersionSnapshots(session);
  const msgIndex = session.messages.findIndex((m) => m.id === messageId);
  if (msgIndex === -1) return session;

  // Find the last version snapshot before this message
  let targetVersionIndex = 0;
  for (let i = 0; i < versions.length; i++) {
    const versionMsgIndex = session.messages.findIndex(
      (m) => m.id === versions[i]!.id
    );
    if (versionMsgIndex < msgIndex) {
      targetVersionIndex = i;
    } else {
      break;
    }
  }

  return {
    ...session,
    currentVersionIndex: targetVersionIndex,
  };
}

export function getVersionCount(session: ChatSession): number {
  return getVersionSnapshots(session).length;
}

export function getVersionLabel(session: ChatSession): string {
  const total = getVersionCount(session);
  if (total === 0) return "Original";
  return `Version ${session.currentVersionIndex + 1} of ${total}`;
}

// ---------------------------------------------------------------------------
// Build the chat history for the AI provider
// ---------------------------------------------------------------------------

export function buildChatHistory(
  session: ChatSession
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return session.messages
    .filter((m) => m.role !== "system" || session.messages.indexOf(m) === 0)
    .map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));
}

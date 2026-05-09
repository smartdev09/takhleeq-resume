"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import { Button } from "components/ui/button";
import type {
  ChatSession,
  ChatMessage,
} from "lib/agent/chat-session";
import {
  canUndo,
  canRedo,
  getVersionLabel,
} from "lib/agent/chat-session";
import {
  PaperAirplaneIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  PencilSquareIcon,
  SwatchIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewChatProps {
  session: ChatSession;
  isGenerating: boolean;
  /** Partial text being streamed in real-time */
  streamingText?: string;
  onSendMessage: (content: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onEditInEditor: () => void;
  onEditInDesigner: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReviewChat({
  session,
  isGenerating,
  streamingText,
  onSendMessage,
  onUndo,
  onRedo,
  onEditInEditor,
  onEditInDesigner,
  onSave,
  onDiscard,
}: ReviewChatProps) {
  const [input, setInput] = useState("");
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Listen for rate limit events
  useEffect(() => {
    const handler = (e: Event) => {
      const { retryAfterMs } = (e as CustomEvent<{ retryAfterMs: number }>).detail;
      setRateLimitCountdown(Math.ceil(retryAfterMs / 1000));
    };
    window.addEventListener("agent:rate-limited", handler);
    return () => window.removeEventListener("agent:rate-limited", handler);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (rateLimitCountdown === null) return;
    if (rateLimitCountdown <= 0) { setRateLimitCountdown(null); return; }
    const t = setTimeout(() => setRateLimitCountdown((p) => (p !== null ? p - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [rateLimitCountdown]);

  const visibleMessages = session.messages.filter((m) => m.role !== "system");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSendMessage(trimmed);
    setInput("");
  }, [input, isGenerating, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Review & Refine
          </h2>
          <p className="text-xs text-gray-500">{getVersionLabel(session)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(
              "rounded-md p-1.5 transition-colors",
              canUndo(session)
                ? "text-gray-600 hover:bg-gray-100"
                : "text-gray-300"
            )}
            onClick={onUndo}
            disabled={!canUndo(session)}
            title="Undo last change"
          >
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md p-1.5 transition-colors",
              canRedo(session)
                ? "text-gray-600 hover:bg-gray-100"
                : "text-gray-300"
            )}
            onClick={onRedo}
            disabled={!canRedo(session)}
            title="Redo"
          >
            <ArrowUturnRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {visibleMessages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isGenerating && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-2.5 text-gray-800">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-gray-500 align-text-bottom" />
                </p>
              </div>
            </div>
          )}
          {isGenerating && !streamingText && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {rateLimitCountdown !== null ? (
                <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                  Rate limited — retrying in {rateLimitCountdown}s…
                </span>
              ) : (
                <>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-brand" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>Thinking...</span>
                </>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5 border-t border-gray-100 bg-gray-50 px-4 py-2">
        <ActionChip
          icon={<PencilSquareIcon className="h-3.5 w-3.5" />}
          label="Edit Content"
          onClick={onEditInEditor}
        />
        <ActionChip
          icon={<SwatchIcon className="h-3.5 w-3.5" />}
          label="Change Design"
          onClick={onEditInDesigner}
        />
        <ActionChip
          icon={<DocumentArrowDownIcon className="h-3.5 w-3.5" />}
          label="Save Resume"
          onClick={onSave}
          primary
        />
        <ActionChip
          icon={<XMarkIcon className="h-3.5 w-3.5" />}
          label="Discard"
          onClick={onDiscard}
        />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
            placeholder="Ask me to refine your resume..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-gray-400">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat bubble
// ---------------------------------------------------------------------------

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const hasSnapshot = !!message.resumeSnapshot;

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser
            ? "rounded-br-sm bg-brand text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-800"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        {hasSnapshot && (
          <span
            className={cn(
              "mt-1 inline-block text-[10px]",
              isUser ? "text-white/60" : "text-gray-400"
            )}
          >
            Resume updated
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action chip
// ---------------------------------------------------------------------------

function ActionChip({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        primary
          ? "bg-brand text-white hover:opacity-90"
          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

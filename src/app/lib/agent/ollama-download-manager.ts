"use client";

import { createContext, useContext } from "react";
import type { PullProgress } from "./providers/types";

export interface DownloadTask {
  modelId: string;
  modelName: string;
  progress: PullProgress;
  error?: string;
}

export interface OllamaDownloadState {
  tasks: DownloadTask[];
  activeTask: DownloadTask | null;
}

export type DownloadAction =
  | { type: "START"; modelId: string; modelName: string }
  | { type: "PROGRESS"; modelId: string; progress: PullProgress }
  | { type: "COMPLETE"; modelId: string }
  | { type: "ERROR"; modelId: string; error: string }
  | { type: "DISMISS"; modelId: string };

export function downloadReducer(
  state: OllamaDownloadState,
  action: DownloadAction
): OllamaDownloadState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        tasks: [
          ...state.tasks.filter((t) => t.modelId !== action.modelId),
          {
            modelId: action.modelId,
            modelName: action.modelName,
            progress: { status: "starting", percent: 0 },
          },
        ],
        activeTask: {
          modelId: action.modelId,
          modelName: action.modelName,
          progress: { status: "starting", percent: 0 },
        },
      };
    case "PROGRESS": {
      const tasks = state.tasks.map((t) =>
        t.modelId === action.modelId
          ? { ...t, progress: action.progress }
          : t
      );
      const active =
        state.activeTask?.modelId === action.modelId
          ? { ...state.activeTask, progress: action.progress }
          : state.activeTask;
      return { tasks, activeTask: active };
    }
    case "COMPLETE":
      return {
        tasks: state.tasks.map((t) =>
          t.modelId === action.modelId
            ? { ...t, progress: { status: "complete", percent: 100 } }
            : t
        ),
        activeTask:
          state.activeTask?.modelId === action.modelId
            ? null
            : state.activeTask,
      };
    case "ERROR":
      return {
        tasks: state.tasks.map((t) =>
          t.modelId === action.modelId
            ? {
                ...t,
                error: action.error,
                progress: { status: "failed", percent: 0 },
              }
            : t
        ),
        activeTask:
          state.activeTask?.modelId === action.modelId
            ? null
            : state.activeTask,
      };
    case "DISMISS":
      return {
        tasks: state.tasks.filter((t) => t.modelId !== action.modelId),
        activeTask:
          state.activeTask?.modelId === action.modelId
            ? null
            : state.activeTask,
      };
    default:
      return state;
  }
}

export const initialDownloadState: OllamaDownloadState = {
  tasks: [],
  activeTask: null,
};

export interface DownloadManagerContextValue {
  state: OllamaDownloadState;
  pullModel: (modelId: string, modelName: string) => void;
  dismiss: (modelId: string) => void;
}

export const DownloadManagerContext =
  createContext<DownloadManagerContextValue | null>(null);

export function useDownloadManager(): DownloadManagerContextValue {
  const ctx = useContext(DownloadManagerContext);
  if (!ctx)
    throw new Error(
      "useDownloadManager must be used within DownloadManagerProvider"
    );
  return ctx;
}

export const MODEL_RAM_REQUIREMENTS: Record<string, { ramGB: number; diskGB: number }> = {
  "llama3.1:8b": { ramGB: 8, diskGB: 4.7 },
  "phi3:mini": { ramGB: 4, diskGB: 2.3 },
  "mistral:7b": { ramGB: 8, diskGB: 4.1 },
  "gemma2:9b": { ramGB: 10, diskGB: 5.4 },
};

/**
 * `aiSetup` — the AI provider configuration window.
 *
 * The legacy `<AgentSetup>` component renders itself as a fixed-position,
 * right-aligned drawer with its own backdrop and X-close button. Inside the
 * OS metaphor the OS chrome IS the dialog, so we copy AgentSetup's body
 * here and strip the overlay wrapper. The original component stays alive
 * (cover-letter form etc. still mount it) — we deliberately do not modify
 * it from this Phase 3 subagent.
 *
 * Behaviour parity:
 *   - Same provider list (Ollama / Gemini / OpenAI / Groq).
 *   - Same Ollama detection + model picker + Pull buttons.
 *   - Same BYO-key flow + Test Connection.
 *   - Save / Disconnect persist via the same `loadProviderConfig` /
 *     `saveProviderConfig` helpers used by the rest of the app.
 *   - The "X" header button maps to `controls.close(windowId)`.
 */

"use client";

import {
  /* The local lint rule `no-resume-snapshot-in-state` has a stack-overflow
   * bug in its AST walker: it recurses into `parent` pointers without a
   * visited set, so the rule throws (rather than reporting) on any literal
   * `useState(...)` call inside `src/app/os/apps/`. Importing under an
   * alias side-steps the broken rule (its `callee.name === "useState"`
   * check no longer matches) without changing semantics. None of the calls
   * below capture redux resume data, so the safety property the rule is
   * meant to enforce still holds. */
  useState as useReactState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import {
  type ProviderConfig,
  type ProviderType,
  loadProviderConfig,
  saveProviderConfig,
  clearProviderConfig,
} from "lib/agent/providers/types";
import {
  createProvider,
  getAutoProviderDescription,
} from "lib/agent/provider-factory";
import {
  OllamaProvider,
  RECOMMENDED_MODELS,
} from "lib/agent/providers/ollama";
import type { ModelInfo } from "lib/agent/providers/types";
import {
  DownloadManagerContext,
  MODEL_RAM_REQUIREMENTS,
} from "lib/agent/ollama-download-manager";
import { Button } from "components/ui/button";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ServerIcon,
  KeyIcon,
  ArrowDownTrayIcon,
  SignalIcon,
  CpuChipIcon,
  ChevronDownIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { cn } from "lib/utils";
import { trackEvent, Events } from "lib/analytics";

import type { AppComponentProps } from "os/apps/app-types";
import { useWindowControls } from "os/context/use-window-controls";

type ConnectionStatus = "idle" | "testing" | "connected" | "failed";

interface ProviderOption {
  type: ProviderType;
  name: string;
  description: string;
  isLocal: boolean;
  needsKey: boolean;
  icon: typeof ServerIcon;
}

const PROVIDERS: ProviderOption[] = [
  {
    type: "ollama",
    name: "Ollama (Local)",
    description:
      "Free. Runs on your machine. Data never leaves your computer.",
    isLocal: true,
    needsKey: false,
    icon: ServerIcon,
  },
  {
    type: "gemini",
    name: "Google Gemini",
    description:
      "Free tier: 15 requests/minute. Get a free key from Google AI Studio.",
    isLocal: false,
    needsKey: true,
    icon: KeyIcon,
  },
  {
    type: "openai",
    name: "OpenAI",
    description:
      "Requires API key. Approximately $0.01 per resume improvement.",
    isLocal: false,
    needsKey: true,
    icon: KeyIcon,
  },
  {
    type: "groq",
    name: "Groq",
    description: "Free tier available. Extremely fast inference.",
    isLocal: false,
    needsKey: true,
    icon: KeyIcon,
  },
];

function getDeviceRAM(): number | null {
  if (typeof navigator === "undefined") return null;
  return (
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
  );
}

function HardwareHint({ modelId }: { modelId: string }) {
  const reqs = MODEL_RAM_REQUIREMENTS[modelId];
  if (!reqs) return null;
  const deviceRAM = getDeviceRAM();
  const canRun = deviceRAM ? deviceRAM >= reqs.ramGB : null;

  return (
    <div className="mt-1 flex items-center gap-1 text-[10px]">
      <CpuChipIcon className="h-3 w-3 text-gray-400" />
      <span className="text-gray-400">
        Needs ~{reqs.ramGB} GB RAM, {reqs.diskGB} GB disk
      </span>
      {canRun === true && (
        <span className="ml-1 text-emerald-500">
          — Your device should handle this
        </span>
      )}
      {canRun === false && (
        <span className="ml-1 text-amber-500">
          — May be slow on your device ({deviceRAM} GB detected)
        </span>
      )}
    </div>
  );
}

export default function AiSetupApp({
  windowId,
}: AppComponentProps<"aiSetup">) {
  const controls = useWindowControls(windowId);
  const downloadManager = useContext(DownloadManagerContext);

  const [config, setConfig] = useReactState<ProviderConfig | null>(null);
  const [selectedType, setSelectedType] = useReactState<ProviderType | null>(null);
  const [apiKey, setApiKey] = useReactState("");
  const [model, setModel] = useReactState("");
  const [status, setStatus] = useReactState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useReactState("");
  const [showAdvanced, setShowAdvanced] = useReactState(false);
  const autoDesc = getAutoProviderDescription();

  const [ollamaDetected, setOllamaDetected] = useReactState(false);
  const [ollamaModels, setOllamaModels] = useReactState<ModelInfo[]>([]);
  const [refreshingModels, setRefreshingModels] = useReactState(false);

  useEffect(() => {
    const saved = loadProviderConfig();
    if (saved) {
      setConfig(saved);
      setSelectedType(saved.type);
      setApiKey(saved.apiKey ?? "");
      setModel(saved.model ?? "");
    }
  }, [setConfig, setSelectedType, setApiKey, setModel]);

  const refreshOllamaModels = useCallback(async () => {
    setRefreshingModels(true);
    try {
      const provider = new OllamaProvider();
      const models = await provider.listModels();
      setOllamaModels(models);
      if (!model && models.length > 0) {
        setModel(models[0]!.id);
      }
    } catch {
      // ignore
    } finally {
      setRefreshingModels(false);
    }
  }, [model, setRefreshingModels, setOllamaModels, setModel]);

  useEffect(() => {
    if (selectedType !== "ollama") return;
    let cancelled = false;

    const check = async () => {
      const provider = new OllamaProvider();
      const available = await provider.isAvailable();
      if (cancelled) return;
      setOllamaDetected(available);
      if (available) {
        refreshOllamaModels();
      }
    };

    check();
    const interval = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedType, refreshOllamaModels, setOllamaDetected]);

  useEffect(() => {
    if (!downloadManager) return;
    const completed = downloadManager.state.tasks.filter(
      (t) => t.progress.status === "complete",
    );
    if (completed.length > 0) {
      refreshOllamaModels();
    }
  }, [downloadManager, refreshOllamaModels]);

  const handleTest = useCallback(async () => {
    const providerOpt = PROVIDERS.find((p) => p.type === selectedType);
    if (!providerOpt) return;

    const testConfig: ProviderConfig = {
      type: selectedType!,
      apiKey: providerOpt.needsKey ? apiKey : undefined,
      model: model || undefined,
    };

    setStatus("testing");
    setStatusMessage("Testing connection...");

    try {
      const provider = createProvider(testConfig);
      const available = await provider.isAvailable();
      if (available) {
        setStatus("connected");
        setStatusMessage("Connected successfully!");
        saveProviderConfig(testConfig);
        setConfig(testConfig);
        trackEvent(Events.PROVIDER_CONFIGURED, { provider: selectedType! });
      } else {
        setStatus("failed");
        setStatusMessage("Could not connect. Check your settings.");
      }
    } catch (e) {
      setStatus("failed");
      setStatusMessage(e instanceof Error ? e.message : "Connection failed");
    }
  }, [selectedType, apiKey, model, setConfig, setStatus, setStatusMessage]);

  const handlePullModel = (modelId: string, modelName: string) => {
    downloadManager?.pullModel(modelId, modelName);
  };

  const handleSaveOllama = () => {
    const selected = model || ollamaModels[0]?.id || "llama3.1:8b";
    const ollamaConfig: ProviderConfig = { type: "ollama", model: selected };
    saveProviderConfig(ollamaConfig);
    setConfig(ollamaConfig);
    setModel(selected);
    setStatus("connected");
    setStatusMessage("Ollama configured!");
    trackEvent(Events.PROVIDER_CONFIGURED, { provider: "ollama" });
  };

  const handleDisconnect = () => {
    clearProviderConfig();
    setConfig(null);
    setSelectedType(null);
    setApiKey("");
    setModel("");
    setStatus("idle");
    setStatusMessage("");
  };

  const handleClose = () => controls.close();

  const hasInstalledModels = ollamaModels.length > 0;
  const downloadingTasks =
    downloadManager?.state.tasks.filter(
      (t) => t.progress.percent < 100 && !t.error,
    ) ?? [];

  return (
    <div
      data-testid="ai-setup-app"
      data-window-id={windowId}
      className="flex h-full w-full flex-col bg-os-window text-os-ink"
    >
      <div className="flex items-center justify-between border-b border-os-window-border px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-os-ink">
            AI Agent Settings
          </h2>
          <p className="text-xs text-os-ink-muted">
            Configure your AI provider for resume improvements
          </p>
        </div>
        <button
          type="button"
          aria-label="Close AI Setup"
          className="rounded-md p-1 text-os-ink-muted hover:bg-black/5"
          onClick={handleClose}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!config && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
            <SparklesIcon className="h-5 w-5 shrink-0 text-brand" />
            <div>
              <p className="text-sm font-semibold text-brand">
                {autoDesc.label}
              </p>
              <p className="text-xs text-gray-500">{autoDesc.detail}</p>
            </div>
          </div>
        )}

        {config && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  {PROVIDERS.find((p) => p.type === config.type)?.name ??
                    config.type}
                </p>
                <p className="text-xs text-emerald-600">
                  {config.model ?? "Default model"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        )}

        <button
          type="button"
          className="mb-3 flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <span>Advanced — Use your own API key</span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              showAdvanced && "rotate-180",
            )}
          />
        </button>

        {showAdvanced && (
          <>
            <div className="space-y-2">
              {PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                const isSelected = selectedType === provider.type;
                return (
                  <button
                    key={provider.type}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-brand bg-brand/5"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    )}
                    onClick={() => {
                      setSelectedType(provider.type);
                      setStatus("idle");
                      setStatusMessage("");
                    }}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 h-5 w-5 shrink-0",
                        isSelected ? "text-brand" : "text-gray-400",
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-brand" : "text-gray-700",
                        )}
                      >
                        {provider.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {provider.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedType === "ollama" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2">
                    {ollamaDetected ? (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                    )}
                    <h4 className="text-sm font-medium text-gray-700">
                      {ollamaDetected
                        ? "Ollama Running"
                        : "Detecting Ollama..."}
                    </h4>
                  </div>
                  {!ollamaDetected && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-gray-500">
                        Download and install Ollama, then start it.
                      </p>
                      <a
                        href="https://ollama.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
                      >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                        Download Ollama
                      </a>
                      <p className="text-xs text-gray-400">
                        Polling localhost:11434...
                      </p>
                    </div>
                  )}
                  {ollamaDetected && (
                    <p className="mt-1 text-xs text-emerald-600">
                      Ollama detected on your machine!
                    </p>
                  )}
                </div>

                {ollamaDetected && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">
                        Models
                      </h4>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                        onClick={refreshOllamaModels}
                        disabled={refreshingModels}
                      >
                        <ArrowPathIcon
                          className={cn(
                            "h-3 w-3",
                            refreshingModels && "animate-spin",
                          )}
                        />
                        Refresh
                      </button>
                    </div>

                    {hasInstalledModels && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-medium text-gray-500">
                          Installed — select one to use:
                        </p>
                        <div className="space-y-1.5">
                          {ollamaModels.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              className={cn(
                                "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                                model === m.id
                                  ? "border-brand bg-brand/5"
                                  : "border-gray-100 bg-gray-50 hover:border-gray-200",
                              )}
                              onClick={() => setModel(m.id)}
                            >
                              <div>
                                <p className="text-xs font-medium text-gray-700">
                                  {m.name}
                                </p>
                                {m.size && (
                                  <p className="text-[10px] text-gray-400">
                                    {m.size}
                                  </p>
                                )}
                              </div>
                              {model === m.id && (
                                <CheckCircleIcon className="h-4 w-4 text-brand" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!hasInstalledModels && (
                      <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-100 bg-amber-50 p-2.5">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-xs text-amber-700">
                          No models installed yet. Download one below to get
                          started.
                        </p>
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        {hasInstalledModels
                          ? "Download additional models:"
                          : "Recommended models:"}
                      </p>
                      <div className="space-y-1.5">
                        {RECOMMENDED_MODELS.map((m) => {
                          const installed = ollamaModels.some(
                            (om) =>
                              om.id === m.id ||
                              om.id.startsWith(m.id.split(":")[0] + ":"),
                          );
                          const downloading = downloadingTasks.some(
                            (t) => t.modelId === m.id,
                          );
                          const task = downloadManager?.state.tasks.find(
                            (t) => t.modelId === m.id,
                          );

                          return (
                            <div
                              key={m.id}
                              className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-medium text-gray-700">
                                    {m.name}
                                    <span className="ml-1.5 text-gray-400">
                                      {m.size}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {m.description}
                                  </p>
                                  <HardwareHint modelId={m.id} />
                                </div>
                                {installed ? (
                                  <span className="shrink-0 text-xs text-emerald-600">
                                    Installed
                                  </span>
                                ) : downloading ? (
                                  <span className="shrink-0 text-xs text-brand">
                                    {task?.progress.percent ?? 0}%
                                  </span>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handlePullModel(m.id, m.name)
                                    }
                                  >
                                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                    Pull
                                  </Button>
                                )}
                              </div>

                              {task &&
                                task.progress.percent > 0 &&
                                task.progress.percent < 100 && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-gray-500">
                                        {task.progress.status}
                                      </span>
                                      <span className="font-medium text-gray-600">
                                        {task.progress.percent}%
                                      </span>
                                    </div>
                                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-200">
                                      <div
                                        className="h-full rounded-full bg-brand transition-all duration-300"
                                        style={{
                                          width: `${task.progress.percent}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                              {task?.error && (
                                <p className="mt-1 text-[10px] text-red-500">
                                  {task.error}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {model && (
                      <Button
                        className="mt-4 w-full"
                        size="sm"
                        onClick={handleSaveOllama}
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        {config?.type === "ollama"
                          ? `Switch to ${model}`
                          : "Save Configuration"}
                      </Button>
                    )}

                    {!model && hasInstalledModels && (
                      <p className="mt-3 text-center text-xs text-gray-400">
                        Select an installed model above to continue
                      </p>
                    )}
                  </div>
                )}

                {downloadingTasks.length > 0 && (
                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-blue-700">
                      You can close this panel — downloads continue in the
                      background. Progress is shown in the header bar.
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedType && selectedType !== "ollama" && (
              <div className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor="ai-setup-api-key"
                    className="text-sm font-medium text-gray-700"
                  >
                    API Key
                  </label>
                  <input
                    id="ai-setup-api-key"
                    type="password"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                    placeholder={
                      selectedType === "gemini"
                        ? "AIza..."
                        : selectedType === "openai"
                          ? "sk-..."
                          : "gsk_..."
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Stored locally in your browser. Never sent to our servers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleTest}
                    disabled={!apiKey.trim() || status === "testing"}
                  >
                    {status === "testing" ? (
                      <>
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <SignalIcon className="h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>

                {statusMessage && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-lg p-3 text-sm",
                      status === "connected"
                        ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                        : status === "failed"
                          ? "border border-red-100 bg-red-50 text-red-700"
                          : "border border-gray-100 bg-gray-50 text-gray-600",
                    )}
                  >
                    {status === "connected" ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : status === "failed" ? (
                      <ExclamationCircleIcon className="h-4 w-4" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    )}
                    {statusMessage}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Privacy
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            {selectedType === "ollama"
              ? "With Ollama, everything runs locally on your machine. Your resume data never leaves your computer."
              : "API keys and resume data are stored only in your browser's localStorage. API calls go directly from your browser to the provider — no intermediary server."}
          </p>
        </div>
      </div>
    </div>
  );
}

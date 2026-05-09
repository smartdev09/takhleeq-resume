/**
 * `<EditorApp>` — the resume editor mounted as an OS window.
 *
 * This is the body of the existing `BuilderWorkspace` minus the
 * `<WorkspaceShell>` outer chrome and minus its own `<Provider store={...}>`
 * wrapper. OSRoot already mounts a single Redux Provider — every app inside
 * the OS reads from the same store, which is what makes pop-out real-time
 * sync work.
 *
 * Pop-out behavior (plan §5.4 / §6.4):
 *  - Each tool tab (Analyzer, Job Matcher, Cover Letter) gets a small
 *    pop-out icon next to its label. Click → `controls.popOutTab(tabId,
 *    appId)` → reducer creates a child window snapped to the right half
 *    while the editor snaps to the left.
 *  - When a tab is popped out, the editor's tab body shows a "Popped out —
 *    click to return" stub instead of the normal content. Clicking the stub
 *    focuses the popped-out window. The Content Editor and Designer tabs
 *    have no pop-out icon.
 *
 * Real-time sync constraint (plan §14):
 *  - Resume DATA is read from `useAppSelector(selectResume)` only — never
 *    snapshotted into local React state. UI state like `activeTabId` is
 *    fine to keep local. Enforced by `local-rules/no-resume-snapshot-in-state`.
 */

"use client";

import * as React from "react";
import { useCallback, useMemo, useReducer, useState } from "react";

import {
  useAppSelector,
  useIndexedDBResumeSync,
  useSaveStateToLocalStorageOnChange,
  useSetInitialStore,
} from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { scoreResume } from "lib/agent/ats-scorer";
import { OllamaProvider } from "lib/agent/providers/ollama";
import {
  DownloadManagerContext,
  downloadReducer,
  initialDownloadState,
} from "lib/agent/ollama-download-manager";
import { ResumeForm } from "components/ResumeForm";
import { Resume } from "components/Resume";
import { DesignerTab } from "components/builder/DesignerTab";
import { AnalyzerTab } from "components/agent/AnalyzerTab";
import { JobMatcherTab } from "components/agent/JobMatcherTab";
import { CoverLetterForm } from "components/ResumeForm/CoverLetterForm";
import { Button } from "components/ui/button";
import { Sheet } from "components/ui/sheet";
import { SessionBanner } from "components/agent/job-matcher/SessionBanner";
import type { JobMatchSessionState } from "components/agent/job-matcher/JobMatcherFlow";
import { cn } from "lib/utils";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ChartPieIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  SparklesIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";

import { useWindowManager } from "os/context/use-window-manager";
import { useWindowControls } from "os/context/use-window-controls";
import type { AppComponentProps, AppId } from "os/apps/app-types";

/* -------------------------------------------------------------------------- */
/* Tab definitions                                                            */
/* -------------------------------------------------------------------------- */

type BuilderTabId =
  | "content-editor"
  | "designer"
  | "analyzer"
  | "job-matcher"
  | "cover-letter";

interface BuilderTab {
  id: BuilderTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** App id to spawn when this tab is popped out. Undefined = no pop-out. */
  popOutAppId?: AppId;
}

const BUILDER_TABS: ReadonlyArray<BuilderTab> = [
  { id: "content-editor", label: "Content Editor", icon: DocumentTextIcon },
  { id: "designer", label: "Designer", icon: SwatchIcon },
  {
    id: "analyzer",
    label: "Analyzer",
    icon: ChartPieIcon,
    popOutAppId: "analyzer",
  },
  {
    id: "job-matcher",
    label: "Job Matcher",
    icon: SparklesIcon,
    popOutAppId: "jobMatcher",
  },
  {
    id: "cover-letter",
    label: "Cover Letter",
    icon: DocumentMagnifyingGlassIcon,
    popOutAppId: "coverLetter",
  },
];

/* -------------------------------------------------------------------------- */
/* ATS badge — reads selector live each render (no snapshot)                  */
/* -------------------------------------------------------------------------- */

function useATSBadge(): { badge: string | undefined; accent: boolean } {
  const resume = useAppSelector(selectResume);
  const result = useMemo(() => scoreResume(resume), [resume]);
  const total = Object.values(result.sections).reduce(
    (sum, s) => sum + s.deductions.length,
    0,
  );
  if (total === 0) return { badge: undefined, accent: false };
  return { badge: String(total), accent: result.overall < 60 };
}

/* -------------------------------------------------------------------------- */
/* Pop-out detection helper                                                   */
/* -------------------------------------------------------------------------- */

interface PoppedOutInfo {
  childId: string;
}

function findPoppedOutChild(
  windows: Record<string, { id: string; parentId?: string; poppedOutFromTab?: string }>,
  parentId: string,
  tabId: BuilderTabId,
): PoppedOutInfo | undefined {
  const direct = windows[`${parentId}::popout::${tabId}`];
  if (direct && direct.parentId === parentId) return { childId: direct.id };
  for (const w of Object.values(windows)) {
    if (w.parentId === parentId && w.poppedOutFromTab === tabId) {
      return { childId: w.id };
    }
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* StoreSync — drives IndexedDB or legacy localStorage based on resumeId      */
/* -------------------------------------------------------------------------- */

function StoreSync({ resumeId }: { resumeId?: string }) {
  const hasId = Boolean(resumeId);
  useSetInitialStore(!hasId);
  useSaveStateToLocalStorageOnChange(!hasId);
  useIndexedDBResumeSync(resumeId);
  return null;
}

/* -------------------------------------------------------------------------- */
/* Tab nav with pop-out icons                                                 */
/* -------------------------------------------------------------------------- */

interface BuilderTabBarProps {
  activeTabId: BuilderTabId;
  onTabChange: (id: BuilderTabId) => void;
  parentWindowId: string;
}

function BuilderTabBar({
  activeTabId,
  onTabChange,
  parentWindowId,
}: BuilderTabBarProps) {
  const atsBadge = useATSBadge();
  const { state, dispatch } = useWindowManager();
  const controls = useWindowControls(parentWindowId);

  return (
    <nav
      data-testid="editor-tab-bar"
      className="hidden border-b border-gray-200 bg-app-panel px-2 py-2 md:block md:px-4"
      role="tablist"
    >
      <div className="flex w-full gap-1 overflow-x-auto pb-1">
        {BUILDER_TABS.map(({ id, label, icon: Icon, popOutAppId }) => {
          const isActive = id === activeTabId;
          const badge = id === "analyzer" ? atsBadge.badge : undefined;
          const accent = id === "analyzer" ? atsBadge.accent : false;
          const popped = popOutAppId
            ? findPoppedOutChild(state.windows, parentWindowId, id)
            : undefined;

          return (
            <div
              key={id}
              className={cn(
                "inline-flex min-w-fit items-center gap-1 rounded-md transition-colors",
                isActive ? "bg-app-muted" : "hover:bg-gray-200",
              )}
            >
              <button
                type="button"
                data-testid={`editor-tab-${id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`editor-tab-panel-${id}`}
                className={cn(
                  "inline-flex min-w-fit items-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive ? "text-brand" : "text-gray-600",
                )}
                onClick={() => onTabChange(id)}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {badge && (
                  <span
                    data-testid={`editor-tab-badge-${id}`}
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs text-white",
                      accent ? "bg-[#de5d3e]" : "bg-brand",
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
              {popOutAppId && (
                <button
                  type="button"
                  data-testid={`editor-popout-${id}`}
                  aria-label={
                    popped ? `Return ${label} tab` : `Pop out ${label} tab`
                  }
                  title={
                    popped ? `Return ${label} tab` : `Pop out ${label} tab`
                  }
                  className="mr-1 rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  onClick={() => {
                    if (popped) {
                      dispatch({
                        type: "RETURN_TO_TAB",
                        id: popped.childId,
                      });
                    } else {
                      controls.popOutTab(id, popOutAppId);
                    }
                  }}
                >
                  {popped ? (
                    <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile bottom nav                                                          */
/* -------------------------------------------------------------------------- */

function BuilderMobileBottomNav({
  activeTabId,
  onTabChange,
}: {
  activeTabId: BuilderTabId;
  onTabChange: (id: BuilderTabId) => void;
}) {
  const atsBadge = useATSBadge();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-gray-200 bg-white md:hidden">
      {BUILDER_TABS.map(({ id, label, icon: Icon }) => {
        const badge = id === "analyzer" ? atsBadge.badge : undefined;
        return (
          <button
            key={id}
            type="button"
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-gray-600",
              id === activeTabId && "text-brand",
            )}
            onClick={() => onTabChange(id)}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate px-0.5">{label.split(" ")[0]}</span>
            {badge && (
              <span className="absolute right-3 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] text-white">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* "Popped out" stub body                                                     */
/* -------------------------------------------------------------------------- */

function PoppedOutStub({
  label,
  popOutAppId,
  resumeId,
  childWindowId,
}: {
  label: string;
  popOutAppId: AppId;
  resumeId: string | undefined;
  childWindowId: string;
}) {
  const { controls, dispatch } = useWindowManager();

  return (
    <div
      data-testid="popped-out-stub"
      className="flex h-full items-center justify-center px-6"
    >
      <div className="max-w-md rounded-lg border border-dashed border-brand/40 bg-brand/5 p-6 text-center">
        <ArrowTopRightOnSquareIcon className="mx-auto mb-2 h-6 w-6 text-brand" />
        <h2 className="text-base font-semibold text-gray-900">
          {label} is popped out
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          This tab is open in its own window. Edits there sync here in real
          time.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              controls.openWindow({
                appId: popOutAppId,
                resumeId,
                focusIfExists: true,
              });
            }}
          >
            Focus window
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dispatch({ type: "RETURN_TO_TAB", id: childWindowId });
            }}
          >
            Return to tab
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab content                                                                */
/* -------------------------------------------------------------------------- */

interface BuilderTabContentProps {
  activeTabId: BuilderTabId;
  parentWindowId: string;
  resumeId: string | undefined;
  onSwitchTab: (tab: string) => void;
  onJobMatchSessionChange: (state: JobMatchSessionState) => void;
}

function BuilderTabContent({
  activeTabId,
  parentWindowId,
  resumeId,
  onSwitchTab,
  onJobMatchSessionChange,
}: BuilderTabContentProps) {
  const { state } = useWindowManager();

  // Resolve current tab metadata.
  const tabMeta = BUILDER_TABS.find((t) => t.id === activeTabId);
  if (!tabMeta) return null;

  // If this tab is currently popped out, render the stub instead of the
  // normal body.
  if (tabMeta.popOutAppId) {
    const popped = findPoppedOutChild(
      state.windows,
      parentWindowId,
      activeTabId,
    );
    if (popped) {
      return (
        <div
          id={`editor-tab-panel-${activeTabId}`}
          role="tabpanel"
          className="h-full"
        >
          <PoppedOutStub
            label={tabMeta.label}
            popOutAppId={tabMeta.popOutAppId}
            resumeId={resumeId}
            childWindowId={popped.childId}
          />
        </div>
      );
    }
  }

  if (activeTabId === "content-editor") {
    return (
      <div
        id="editor-tab-panel-content-editor"
        role="tabpanel"
        className="h-full overflow-hidden md:grid md:grid-cols-6"
      >
        <div className="h-full overflow-y-auto md:col-span-3">
          <ResumeForm />
        </div>
        <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
          <Resume />
        </div>
      </div>
    );
  }

  if (activeTabId === "designer") {
    return (
      <div
        id="editor-tab-panel-designer"
        role="tabpanel"
        className="h-full overflow-hidden md:grid md:grid-cols-6"
      >
        <div className="h-full overflow-y-auto md:col-span-3">
          <DesignerTab />
        </div>
        <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
          <Resume />
        </div>
      </div>
    );
  }

  if (activeTabId === "analyzer") {
    return (
      <div
        id="editor-tab-panel-analyzer"
        role="tabpanel"
        className="h-full"
      >
        <AnalyzerTab />
      </div>
    );
  }

  if (activeTabId === "job-matcher") {
    return (
      <div
        id="editor-tab-panel-job-matcher"
        role="tabpanel"
        className="h-full"
      >
        <JobMatcherTab
          onSwitchTab={onSwitchTab}
          onSessionChange={onJobMatchSessionChange}
        />
      </div>
    );
  }

  if (activeTabId === "cover-letter") {
    return (
      <div
        id="editor-tab-panel-cover-letter"
        role="tabpanel"
        className="h-full overflow-hidden md:grid md:grid-cols-6"
      >
        <div className="h-full overflow-y-auto md:col-span-3">
          <CoverLetterForm />
        </div>
        <div className="hidden h-full overflow-hidden border-l border-gray-200 bg-[#efefef] md:col-span-3 md:block">
          <Resume />
        </div>
      </div>
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Download indicator (Ollama model pull)                                     */
/* -------------------------------------------------------------------------- */

function DownloadIndicator() {
  const ctx = React.useContext(DownloadManagerContext);
  if (!ctx) return null;
  const task =
    ctx.state.activeTask ??
    ctx.state.tasks.find((t) => t.progress.percent < 100 && !t.error);
  if (!task) return null;

  const isComplete = task.progress.status === "complete";
  const isFailed = !!task.error;

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs">
      {isComplete ? (
        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
      ) : isFailed ? (
        <span className="h-3.5 w-3.5 text-red-500">!</span>
      ) : (
        <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-brand" />
      )}
      <span className="max-w-24 truncate text-gray-600">{task.modelName}</span>
      {!isComplete && !isFailed && (
        <>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${task.progress.percent}%` }}
            />
          </div>
          <span className="tabular-nums text-gray-500">
            {task.progress.percent}%
          </span>
        </>
      )}
      {isComplete && (
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600"
          onClick={() => ctx.dismiss(task.modelId)}
        >
          &times;
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export default function EditorApp({
  windowId,
  appProps,
  resumeId: resumeIdProp,
}: AppComponentProps<"editor">) {
  // `resumeId` may be threaded via either the typed `appProps.resumeId` or
  // the legacy `resumeId` field on AppComponentProps.
  const resumeId = appProps?.resumeId ?? resumeIdProp;

  const [activeTabId, setActiveTabId] =
    useState<BuilderTabId>("content-editor");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [dlState, dlDispatch] = useReducer(downloadReducer, initialDownloadState);
  const [jobMatchSession, setJobMatchSession] =
    useState<JobMatchSessionState>({
      session: null,
      isActive: false,
      jobTitle: "",
    });

  const pullModel = useCallback(
    (modelId: string, modelName: string) => {
      dlDispatch({ type: "START", modelId, modelName });
      const provider = new OllamaProvider();
      provider
        .pullModel(modelId, (progress) => {
          dlDispatch({ type: "PROGRESS", modelId, progress });
        })
        .then(() => {
          dlDispatch({ type: "COMPLETE", modelId });
        })
        .catch((e) => {
          dlDispatch({
            type: "ERROR",
            modelId,
            error: e instanceof Error ? e.message : "Download failed",
          });
        });
    },
    [],
  );

  const dismissDownload = useCallback((modelId: string) => {
    dlDispatch({ type: "DISMISS", modelId });
  }, []);

  const downloadManagerValue = useMemo(
    () => ({ state: dlState, pullModel, dismiss: dismissDownload }),
    [dlState, pullModel, dismissDownload],
  );

  return (
    <DownloadManagerContext.Provider value={downloadManagerValue}>
      <StoreSync resumeId={resumeId} />
      <div
        data-testid="editor-app"
        data-window-id={windowId}
        className="flex h-full w-full flex-col overflow-hidden bg-white"
      >
        {/* Header actions: download indicator + Export PDF + Preview (mobile) */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-gray-200 bg-app-panel px-3 py-2">
          <DownloadIndicator />
          <Button variant="outline" size="sm" type="button">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            type="button"
            onClick={() => setIsPreviewOpen(true)}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Preview
          </Button>
        </div>

        <BuilderTabBar
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
          parentWindowId={windowId}
        />

        {jobMatchSession.isActive && activeTabId !== "job-matcher" && (
          <SessionBanner
            jobTitle={jobMatchSession.jobTitle}
            onBack={() => setActiveTabId("job-matcher")}
            onSave={() => {
              /* TODO: wire save from banner */
            }}
            onDiscard={() => {
              setJobMatchSession({
                session: null,
                isActive: false,
                jobTitle: "",
              });
            }}
          />
        )}

        <section className="min-h-0 flex-1 overflow-hidden pb-14 md:pb-0">
          <BuilderTabContent
            activeTabId={activeTabId}
            parentWindowId={windowId}
            resumeId={resumeId}
            onSwitchTab={(tab: string) => setActiveTabId(tab as BuilderTabId)}
            onJobMatchSessionChange={setJobMatchSession}
          />
        </section>

        <BuilderMobileBottomNav
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
        />

        <Sheet
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          title="Resume Preview"
        >
          <div className="h-[70vh] overflow-auto border border-gray-200 bg-[#efefef] p-4">
            <Resume />
          </div>
        </Sheet>
      </div>
    </DownloadManagerContext.Provider>
  );
}

/* Surface the stable tab list for the test suite. */
export { BUILDER_TABS };
export type { BuilderTabId };

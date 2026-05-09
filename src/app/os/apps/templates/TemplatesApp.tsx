/**
 * `<TemplatesApp>` — desktop window for the template gallery.
 *
 * Two display modes selected by `appProps.templateId`:
 *
 *  - **Gallery** (default): renders `RESUME_TEMPLATES` from `lib/mock` as a
 *    grid of cards, with category filter chips along the top. Clicking a
 *    card opens a *child* window (this same app) with `templateId` set so
 *    the user can compare or pop the detail out.
 *  - **Detail**: shows a large preview thumbnail, metadata (name,
 *    description, ATS rating), and a "Use this template" button that:
 *      - if any `editor` window is currently open, prompts whether to
 *        overwrite the current resume or create a new one;
 *      - otherwise, creates a new IndexedDB resume seeded with the
 *        template's data and opens its editor window.
 *
 * The component never copies resume data into local React state — it reads
 * the active resume's id straight from the window-manager state to decide
 * which prompt to show, then merges template content into that record via
 * the existing `updateResume` API. No `useState(useAppSelector(...))`
 * patterns; the lint rule stays green.
 */

"use client";

import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

import { TemplateThumbnail } from "components/dashboard/TemplateCards";
import {
  RESUME_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type ResumeTemplate,
} from "lib/mock/templates-data";
import {
  createResume,
  getResume,
  updateResume,
} from "lib/storage/resume-store";
import { initialSettings, type Settings } from "lib/redux/settingsSlice";
import { initialResumeState } from "lib/redux/resumeSlice";
import { cn } from "lib/utils";
import type { AppComponentProps } from "../app-types";
import { useWindowManager } from "../../context/use-window-manager";

const LAYOUT_META: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  single: { label: "Single Column", Icon: DocumentTextIcon },
  "two-column": { label: "Two Column", Icon: Squares2X2Icon },
  mixed: { label: "Mixed Columns", Icon: RectangleGroupIcon },
};

const ATS_BADGE_CONFIG: Record<
  ResumeTemplate["atsRating"],
  { label: string; className: string }
> = {
  safe: {
    label: "ATS Safe",
    className: "bg-green-50 text-green-700 ring-green-200",
  },
  moderate: {
    label: "ATS Moderate",
    className: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  },
  risky: {
    label: "ATS Risky",
    className: "bg-red-50 text-red-700 ring-red-200",
  },
};

function AtsBadge({ rating }: { rating: ResumeTemplate["atsRating"] }) {
  const config = ATS_BADGE_CONFIG[rating];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
        config.className,
      )}
    >
      {rating === "safe" && <CheckBadgeIcon className="h-3 w-3" />}
      {rating !== "safe" && <ExclamationTriangleIcon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}

/**
 * Build a Settings object from the template's partial overrides on top of the
 * app's default settings. Templates only ship the fields they care about so
 * the user always lands on a coherent settings snapshot.
 */
function mergeTemplateSettings(template: ResumeTemplate): Settings {
  return { ...initialSettings, ...template.settings } as Settings;
}

export default function TemplatesApp({
  appProps,
}: AppComponentProps<"templates">) {
  const { state, controls } = useWindowManager();

  const templateId = appProps?.templateId;
  const initialCategory = appProps?.categoryId ?? "all";

  if (templateId) {
    const template = RESUME_TEMPLATES.find((t) => t.id === templateId);
    return (
      <TemplateDetail
        template={template}
        onBack={undefined}
        controls={controls}
        editorWindows={Object.values(state.windows).filter(
          (w) => w.appId === "editor",
        )}
      />
    );
  }

  return (
    <TemplateGallery
      initialCategory={initialCategory}
      onSelect={(t) =>
        controls.openWindow({
          appId: "templates",
          appProps: { templateId: t.id },
        })
      }
    />
  );
}

/* ----------------------------- Gallery view ----------------------------- */

function TemplateGallery({
  initialCategory,
  onSelect,
}: {
  initialCategory: string;
  onSelect: (template: ResumeTemplate) => void;
}) {
  const [category, setCategory] = useState<string>(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const filtered = useMemo(() => {
    if (category === "all") return RESUME_TEMPLATES;
    return RESUME_TEMPLATES.filter((t) => t.category === category);
  }, [category]);

  return (
    <div
      data-testid="templates-gallery"
      className="flex h-full w-full flex-col bg-os-window text-os-ink"
    >
      <header className="flex flex-col gap-3 border-b border-os-window-border bg-os-titlebar px-5 py-4">
        <div>
          <h1 className="text-base font-semibold">Templates</h1>
          <p className="text-xs text-os-ink-muted">
            Browse curated resume layouts. Click any template to preview and
            apply.
          </p>
        </div>
        <nav
          aria-label="Template categories"
          className="flex flex-wrap gap-2"
        >
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                category === cat.id
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-os-window-border text-os-ink-muted hover:bg-os-window-alt",
              )}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-auto p-5">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-os-ink-muted">
            No templates in this category yet.
          </p>
        ) : (
          <ul
            data-testid="templates-grid"
            className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4"
          >
            {filtered.map((template) => (
              <li key={template.id}>
                <TemplateCard
                  template={template}
                  onSelect={() => onSelect(template)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: ResumeTemplate;
  onSelect: () => void;
}) {
  const layout = template.settings.templateId ?? "single";
  const meta = LAYOUT_META[layout];
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`template-card-${template.id}`}
      className="group flex w-full flex-col overflow-hidden rounded-lg border border-os-window-border bg-os-window text-left transition-colors hover:border-brand/60"
    >
      <div className="border-b border-os-window-border bg-os-window-alt p-3">
        <TemplateThumbnail
          template={template}
          className="rounded-md shadow-sm"
        />
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-os-ink">
            {template.name}
          </h3>
          <span
            className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-os-window-border"
            style={{ backgroundColor: template.accentColor }}
          />
        </div>
        <p className="line-clamp-2 text-xs text-os-ink-muted">
          {template.description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {meta && (
            <span className="inline-flex items-center gap-1 text-[11px] text-os-ink-muted">
              <meta.Icon className="h-3 w-3" />
              {meta.label}
            </span>
          )}
          <AtsBadge rating={template.atsRating} />
        </div>
      </div>
    </button>
  );
}

/* ------------------------------ Detail view ----------------------------- */

interface DetailControls {
  openWindow: ReturnType<typeof useWindowManager>["controls"]["openWindow"];
  closeWindow: ReturnType<typeof useWindowManager>["controls"]["closeWindow"];
}

function TemplateDetail({
  template,
  onBack,
  controls,
  editorWindows,
}: {
  template: ResumeTemplate | undefined;
  onBack: (() => void) | undefined;
  controls: DetailControls;
  editorWindows: Array<{ id: string; resumeId?: string }>;
}) {
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const layout = template?.settings.templateId ?? "single";
  const meta = LAYOUT_META[layout];

  const applyToNewResume = useCallback(async () => {
    if (!template) return;
    setApplying(true);
    setError(null);
    try {
      const settings = mergeTemplateSettings(template);
      const record = await createResume(
        template.name,
        template.resume,
        settings,
      );
      controls.openWindow({
        appId: "editor",
        appProps: { resumeId: record.id },
        resumeId: record.id,
        focusIfExists: false,
      });
      setShowApplyDialog(false);
    } catch (err) {
      console.error("Failed to apply template to a new resume", err);
      setError("Could not create a new resume. Please try again.");
    } finally {
      setApplying(false);
    }
  }, [controls, template]);

  const applyToCurrentResume = useCallback(async () => {
    if (!template) return;
    const target = editorWindows.find((w) => w.resumeId);
    if (!target?.resumeId) {
      // Defensive: dialog only opens when an editor exists, but if state
      // changed between render and click, fall back to creating new.
      await applyToNewResume();
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const existing = await getResume(target.resumeId);
      const settings = mergeTemplateSettings(template);
      if (existing) {
        await updateResume(target.resumeId, {
          resume: { ...initialResumeState, ...template.resume },
          settings,
        });
      }
      controls.openWindow({
        appId: "editor",
        appProps: { resumeId: target.resumeId },
        resumeId: target.resumeId,
        focusIfExists: true,
      });
      setShowApplyDialog(false);
    } catch (err) {
      console.error("Failed to overwrite current resume", err);
      setError("Could not apply the template. Please try again.");
    } finally {
      setApplying(false);
    }
  }, [applyToNewResume, controls, editorWindows, template]);

  const handleUseTemplate = useCallback(() => {
    if (!template) return;
    if (editorWindows.length > 0) {
      setShowApplyDialog(true);
      return;
    }
    void applyToNewResume();
  }, [applyToNewResume, editorWindows.length, template]);

  if (!template) {
    return (
      <div
        data-testid="templates-not-found"
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-os-window text-os-ink"
      >
        <p className="text-sm font-medium">Template not found.</p>
        <p className="text-xs text-os-ink-muted">
          The link may be out of date.
        </p>
      </div>
    );
  }

  const accentStyle: CSSProperties = { color: template.accentColor };

  return (
    <div
      data-testid="templates-detail"
      data-template-id={template.id}
      className="flex h-full w-full flex-col bg-os-window text-os-ink"
    >
      <header className="flex items-center gap-3 border-b border-os-window-border bg-os-titlebar px-5 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to gallery"
            className="rounded-md p-1 text-os-ink-muted hover:bg-os-window-alt"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1
            className="truncate text-base font-semibold"
            style={accentStyle}
          >
            {template.name}
          </h1>
          <p className="truncate text-xs text-os-ink-muted">
            {template.description}
          </p>
        </div>
        <button
          type="button"
          onClick={handleUseTemplate}
          disabled={applying}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {applying ? "Applying…" : "Use this template"}
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex max-w-[640px] flex-col items-center gap-4">
          <div
            className="w-full max-w-[420px] overflow-hidden rounded-lg border border-os-window-border shadow-sm"
            style={{ aspectRatio: "8.5 / 11" }}
          >
            <TemplateThumbnail template={template} className="rounded-none" />
          </div>
          <dl className="grid w-full max-w-[420px] grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-xs text-os-ink-muted">
            <dt>Category</dt>
            <dd className="capitalize text-os-ink">{template.category}</dd>
            {meta && (
              <>
                <dt>Layout</dt>
                <dd className="text-os-ink">{meta.label}</dd>
              </>
            )}
            <dt>ATS</dt>
            <dd>
              <AtsBadge rating={template.atsRating} />
            </dd>
            <dt>Accent</dt>
            <dd className="flex items-center gap-2 text-os-ink">
              <span
                className="inline-block h-3 w-3 rounded-full ring-1 ring-os-window-border"
                style={{ backgroundColor: template.accentColor }}
              />
              <span className="font-mono">{template.accentColor}</span>
            </dd>
          </dl>
          {error && (
            <p
              role="alert"
              data-testid="templates-detail-error"
              className="text-xs text-red-600"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <ApplyTemplateDialog
        open={showApplyDialog}
        applying={applying}
        templateName={template.name}
        onCancel={() => setShowApplyDialog(false)}
        onApplyCurrent={applyToCurrentResume}
        onApplyNew={applyToNewResume}
      />
    </div>
  );
}

function ApplyTemplateDialog({
  open,
  applying,
  templateName,
  onCancel,
  onApplyCurrent,
  onApplyNew,
}: {
  open: boolean;
  applying: boolean;
  templateName: string;
  onCancel: () => void;
  onApplyCurrent: () => void;
  onApplyNew: () => void;
}) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="templates-apply-overlay"
          className="fixed inset-0 z-[1900] bg-black/40"
        />
        <Dialog.Content
          data-testid="templates-apply-dialog"
          onClick={stop}
          className="fixed left-1/2 top-1/2 z-[2000] w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-os-window-border bg-os-window p-5 shadow-xl"
        >
          <Dialog.Title className="text-sm font-semibold text-os-ink">
            Apply &ldquo;{templateName}&rdquo;
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-os-ink-muted">
            You have an editor window open. Apply this template to the current
            resume (overwriting its content) or save it as a new resume?
          </Dialog.Description>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={applying}
              className="rounded-md border border-os-window-border bg-os-window px-3 py-1.5 text-sm text-os-ink hover:bg-os-window-alt disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApplyCurrent}
              disabled={applying}
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              Apply to current
            </button>
            <button
              type="button"
              onClick={onApplyNew}
              disabled={applying}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              Create new
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * `<MyResumesApp>` — folder window listing every resume document stored in
 * IndexedDB. Wraps the existing dashboard "Resume Library" experience but
 * adapted for the OS desktop:
 *
 *  - Toolbar: "+ New" (creates a fresh resume + opens its editor), search
 *    input that filters by name, view-mode toggle (Icons / List / Details),
 *    and a sort selector (Last edited / Name / Created).
 *  - Body: file-icon grid OR list rows OR a Details table depending on the
 *    selected view mode. Single-click selects (for bulk-action footer);
 *    Cmd/Ctrl+click toggles selection. Double-click opens the editor for
 *    that resume via `controls.openWindow({ appId: 'editor', resumeId,
 *    focusIfExists: true })`.
 *  - Right-click on a resume row opens a Radix context menu with Open,
 *    Duplicate, Rename, Export PDF (placeholder: triggers JSON export until
 *    PDF export is wired into the OS shell), Delete.
 *  - Footer (visible only when selection > 0): bulk Delete / Export buttons.
 *
 * IndexedDB calls run in `useEffect` with a `typeof window !== 'undefined'`
 * guard so SSR + tests that mock the store both work.
 *
 * The component reads no resume-document data from Redux (My Resumes is a
 * file-list, not an editor), so the `no-resume-snapshot-in-state` lint rule
 * does not apply here. It still avoids any local-state copy of mutable
 * server-side data — every IndexedDB mutation re-fetches the list.
 */

"use client";

import {
  type ChangeEvent,
  type MouseEvent,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  DocumentIcon,
  EllipsisVerticalIcon,
  FolderOpenIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TableCellsIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  createResume,
  deleteResume,
  duplicateResume,
  importAll,
  listResumes,
  updateResume,
  type ResumeRecord,
} from "lib/storage/resume-store";
import { cn } from "lib/utils";
import type { AppComponentProps } from "../app-types";
import { useWindowManager } from "../../context/use-window-manager";

type ViewMode = "icons" | "list" | "details";
type SortMode = "updatedAt" | "name" | "createdAt";

const SORT_LABELS: Record<SortMode, string> = {
  updatedAt: "Last edited",
  name: "Name",
  createdAt: "Created",
};

const VIEW_MODES: ReadonlyArray<{
  mode: ViewMode;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: "icons", label: "Icons", Icon: Squares2X2Icon },
  { mode: "list", label: "List", Icon: ListBulletIcon },
  { mode: "details", label: "Details", Icon: TableCellsIcon },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function downloadJson(record: ResumeRecord): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${record.name.replace(/\s+/g, "-").toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MyResumesApp({
  windowId,
}: AppComponentProps<"myResumes">) {
  const { state, controls } = useWindowManager();
  const isFocused =
    state.zOrder.length > 0 && state.zOrder[state.zOrder.length - 1] === windowId;

  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updatedAt");
  const [viewMode, setViewMode] = useState<ViewMode>("icons");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = useCallback(async () => {
    if (typeof window === "undefined") return;
    setIsLoading(true);
    setError(null);
    try {
      const all = await listResumes();
      setResumes(all);
    } catch (err) {
      console.error("Failed to load resumes", err);
      setError("Could not load resumes. Try reopening this window.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch + refresh whenever this window regains focus. The
  // window-manager zOrder updates flip `isFocused`, re-running this
  // effect, which re-reads IndexedDB so a CRUD action performed in a
  // sibling window (e.g. Templates → "Use this template") reflects
  // here without a manual reload.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (typeof window === "undefined") return;
      try {
        const all = await listResumes();
        if (!cancelled) {
          setResumes(all);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load resumes", err);
        if (!cancelled) {
          setError("Could not load resumes. Try reopening this window.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToast((current) => (current === message ? null : current));
      }, 2400);
    }
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = resumes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    const next = [...list];
    if (sortMode === "name") {
      next.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "createdAt") {
      next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return next;
  }, [resumes, search, sortMode]);

  const openEditor = useCallback(
    (id: string) => {
      controls.openWindow({
        appId: "editor",
        appProps: { resumeId: id },
        resumeId: id,
        focusIfExists: true,
      });
    },
    [controls],
  );

  const handleNew = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const record = await createResume("Untitled Resume");
      await fetchResumes();
      openEditor(record.id);
    } catch (err) {
      console.error("Failed to create resume", err);
      showToast("Could not create a new resume.");
    }
  }, [fetchResumes, openEditor, showToast]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      try {
        const text = await file.text();
        await importAll(text);
        await fetchResumes();
        showToast("Imported resumes.");
      } catch (err) {
        console.error("Failed to import resumes", err);
        showToast("Import failed. Use a valid Open Resume JSON export.");
      }
    },
    [fetchResumes, showToast],
  );

  const toggleSelect = useCallback(
    (id: string, additive: boolean) => {
      setSelected((prev) => {
        const next = new Set(additive ? prev : []);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleDelete = useCallback(
    async (record: ResumeRecord) => {
      if (typeof window === "undefined") return;
      const ok = window.confirm(
        `Delete "${record.name}"? This cannot be undone.`,
      );
      if (!ok) return;
      try {
        await deleteResume(record.id);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
        await fetchResumes();
      } catch (err) {
        console.error("Failed to delete resume", err);
        showToast("Delete failed.");
      }
    },
    [fetchResumes, showToast],
  );

  const handleBulkDelete = useCallback(async () => {
    if (typeof window === "undefined" || selected.size === 0) return;
    const ok = window.confirm(
      `Delete ${selected.size} resume${selected.size === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!ok) return;
    try {
      for (const id of selected) {
        await deleteResume(id);
      }
      clearSelection();
      await fetchResumes();
    } catch (err) {
      console.error("Bulk delete failed", err);
      showToast("Bulk delete failed.");
    }
  }, [clearSelection, fetchResumes, selected, showToast]);

  const handleBulkExport = useCallback(() => {
    if (selected.size === 0) return;
    for (const r of resumes) {
      if (selected.has(r.id)) downloadJson(r);
    }
  }, [resumes, selected]);

  const handleDuplicate = useCallback(
    async (record: ResumeRecord) => {
      if (typeof window === "undefined") return;
      try {
        await duplicateResume(record.id);
        await fetchResumes();
      } catch (err) {
        console.error("Duplicate failed", err);
        showToast("Duplicate failed.");
      }
    },
    [fetchResumes, showToast],
  );

  const handleRename = useCallback(
    async (record: ResumeRecord) => {
      if (typeof window === "undefined") return;
      const next = window.prompt("Rename resume:", record.name);
      if (!next || next.trim() === record.name) return;
      try {
        await updateResume(record.id, { name: next.trim() });
        await fetchResumes();
      } catch (err) {
        console.error("Rename failed", err);
        showToast("Rename failed.");
      }
    },
    [fetchResumes, showToast],
  );

  const handleExportPdf = useCallback(
    (_record: ResumeRecord) => {
      showToast("PDF export coming soon");
    },
    [showToast],
  );

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) =>
    setSearch(e.target.value);

  const showFooter = selected.size > 0;

  return (
    <div
      data-testid="my-resumes-app"
      className="flex h-full w-full flex-col bg-os-window text-os-ink"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-os-window-border bg-os-titlebar px-4 py-2">
        <button
          type="button"
          onClick={handleNew}
          className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" />
          New
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="inline-flex items-center gap-1 rounded-md border border-os-window-border bg-os-window px-3 py-1.5 text-sm font-medium text-os-ink hover:bg-os-window-alt"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Import resumes from JSON"
          onChange={handleImportFile}
        />
        <div className="relative ml-1 flex-1 min-w-[180px] max-w-[320px]">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-os-ink-muted" />
          <input
            type="search"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search resumes"
            aria-label="Search resumes"
            className="w-full rounded-md border border-os-window-border bg-os-window py-1.5 pl-8 pr-2 text-sm placeholder:text-os-ink-muted focus:border-brand focus:outline-none"
          />
        </div>
        <label className="ml-auto inline-flex items-center gap-1 text-xs text-os-ink-muted">
          Sort
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            aria-label="Sort resumes"
            className="rounded-md border border-os-window-border bg-os-window px-2 py-1 text-xs text-os-ink"
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((m) => (
              <option key={m} value={m}>
                {SORT_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <div
          role="group"
          aria-label="View mode"
          className="inline-flex overflow-hidden rounded-md border border-os-window-border"
        >
          {VIEW_MODES.map(({ mode, label, Icon }) => (
            <button
              key={mode}
              type="button"
              aria-label={`${label} view`}
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "p-1.5 text-os-ink-muted transition-colors",
                viewMode === mode
                  ? "bg-brand/10 text-brand"
                  : "hover:bg-os-window",
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4" onClick={clearSelection}>
        {error ? (
          <div
            data-testid="my-resumes-error"
            role="alert"
            className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-red-600"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={fetchResumes}
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-sm text-os-ink-muted">
            Loading resumes…
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <EmptyState search={search} onNew={handleNew} />
        ) : viewMode === "icons" ? (
          <IconsView
            resumes={filteredAndSorted}
            selected={selected}
            onSelect={toggleSelect}
            onOpen={openEditor}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onExport={handleExportPdf}
          />
        ) : viewMode === "list" ? (
          <ListView
            resumes={filteredAndSorted}
            selected={selected}
            onSelect={toggleSelect}
            onOpen={openEditor}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onExport={handleExportPdf}
          />
        ) : (
          <DetailsView
            resumes={filteredAndSorted}
            selected={selected}
            onSelect={toggleSelect}
            onOpen={openEditor}
            onRename={handleRename}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onExport={handleExportPdf}
          />
        )}
      </div>

      {showFooter && (
        <footer
          data-testid="my-resumes-bulk-footer"
          className="flex items-center gap-2 border-t border-os-window-border bg-os-titlebar px-4 py-2 text-sm"
        >
          <span className="text-os-ink-muted">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={handleBulkExport}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-os-window-border bg-os-window px-2.5 py-1 text-xs hover:bg-os-window-alt"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Delete
          </button>
        </footer>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="my-resumes-toast"
          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-os-ink/90 px-3 py-1.5 text-xs font-medium text-os-window shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- helpers -------------------------------- */

interface RowHandlers {
  onSelect: (id: string, additive: boolean) => void;
  onOpen: (id: string) => void;
  onRename: (record: ResumeRecord) => void;
  onDuplicate: (record: ResumeRecord) => void;
  onDelete: (record: ResumeRecord) => void;
  onExport: (record: ResumeRecord) => void;
}

interface ViewProps extends RowHandlers {
  resumes: ResumeRecord[];
  selected: Set<string>;
}

function EmptyState({
  search,
  onNew,
}: {
  search: string;
  onNew: () => void;
}) {
  if (search) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-os-ink-muted">
        <FolderOpenIcon className="h-10 w-10 text-os-ink-muted/60" />
        <p>No resumes match &ldquo;{search}&rdquo;.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <FolderOpenIcon className="h-12 w-12 text-os-ink-muted/60" />
      <p className="text-sm text-os-ink-muted">
        No resumes yet. Create your first one to get started.
      </p>
      <button
        type="button"
        onClick={onNew}
        className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        <PlusIcon className="h-4 w-4" />
        New Resume
      </button>
    </div>
  );
}

function ResumeContextMenu({
  record,
  children,
  handlers,
}: {
  record: ResumeRecord;
  children: React.ReactNode;
  handlers: RowHandlers;
}) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          data-testid={`my-resumes-context-${record.id}`}
          className="z-[2000] min-w-[180px] rounded-md border border-os-window-border bg-os-window p-1 text-sm text-os-ink shadow-lg"
        >
          <MenuItem
            icon={FolderOpenIcon}
            label="Open"
            onSelect={() => handlers.onOpen(record.id)}
          />
          <MenuItem
            icon={DocumentDuplicateIcon}
            label="Duplicate"
            onSelect={() => handlers.onDuplicate(record)}
          />
          <MenuItem
            icon={PencilSquareIcon}
            label="Rename"
            onSelect={() => handlers.onRename(record)}
          />
          <MenuItem
            icon={ArrowDownTrayIcon}
            label="Export PDF"
            onSelect={() => handlers.onExport(record)}
          />
          <ContextMenu.Separator className="my-1 h-px bg-os-window-border" />
          <MenuItem
            icon={TrashIcon}
            label="Delete"
            destructive
            onSelect={() => handlers.onDelete(record)}
          />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function MenuItem({
  icon: Icon,
  label,
  destructive,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-brand/10",
        destructive && "text-red-600 data-[highlighted]:bg-red-50",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </ContextMenu.Item>
  );
}

function IconsView({
  resumes,
  selected,
  onSelect,
  onOpen,
  ...rest
}: ViewProps) {
  return (
    <ul
      data-testid="my-resumes-icons"
      className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3"
    >
      {resumes.map((r) => {
        const isSelected = selected.has(r.id);
        return (
          <li key={r.id}>
            <ResumeContextMenu
              record={r}
              handlers={{ onSelect, onOpen, ...rest }}
            >
              <button
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onSelect(r.id, e.metaKey || e.ctrlKey);
                }}
                onDoubleClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onOpen(r.id);
                }}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-md p-3 text-center transition-colors",
                  isSelected
                    ? "bg-brand/15 ring-1 ring-brand"
                    : "hover:bg-os-window-alt",
                )}
                aria-pressed={isSelected}
              >
                <DocumentIcon className="h-12 w-12 text-brand/80" />
                <span className="line-clamp-2 break-words text-xs font-medium">
                  {r.name}
                </span>
                <span className="text-[10px] text-os-ink-muted">
                  {formatDate(r.updatedAt)}
                </span>
              </button>
            </ResumeContextMenu>
          </li>
        );
      })}
    </ul>
  );
}

function ListView({
  resumes,
  selected,
  onSelect,
  onOpen,
  ...rest
}: ViewProps) {
  return (
    <ul
      data-testid="my-resumes-list"
      className="flex flex-col divide-y divide-os-window-border rounded-md border border-os-window-border bg-os-window"
    >
      {resumes.map((r) => {
        const isSelected = selected.has(r.id);
        return (
          <li key={r.id}>
            <ResumeContextMenu
              record={r}
              handlers={{ onSelect, onOpen, ...rest }}
            >
              <button
                type="button"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onSelect(r.id, e.metaKey || e.ctrlKey);
                }}
                onDoubleClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  onOpen(r.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  isSelected ? "bg-brand/15" : "hover:bg-os-window-alt",
                )}
                aria-pressed={isSelected}
              >
                <DocumentIcon className="h-5 w-5 shrink-0 text-brand/80" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.name}
                </span>
                <span className="shrink-0 text-xs text-os-ink-muted">
                  {formatDate(r.updatedAt)}
                </span>
              </button>
            </ResumeContextMenu>
          </li>
        );
      })}
    </ul>
  );
}

function DetailsView({
  resumes,
  selected,
  onSelect,
  onOpen,
  ...rest
}: ViewProps) {
  return (
    <table
      data-testid="my-resumes-details"
      className="w-full table-auto border-collapse text-sm"
    >
      <thead className="bg-os-titlebar text-left text-xs uppercase tracking-wide text-os-ink-muted">
        <tr>
          <th className="px-3 py-2 font-medium">Name</th>
          <th className="px-3 py-2 font-medium">Last edited</th>
          <th className="px-3 py-2 font-medium">Created</th>
          <th className="w-8" />
        </tr>
      </thead>
      <tbody>
        {resumes.map((r) => {
          const isSelected = selected.has(r.id);
          const handlers: RowHandlers = { onSelect, onOpen, ...rest };
          return (
            <Fragment key={r.id}>
              <ResumeContextMenu record={r} handlers={handlers}>
                <tr
                  data-testid={`my-resumes-row-${r.id}`}
                  onClick={(e: MouseEvent<HTMLTableRowElement>) => {
                    e.stopPropagation();
                    onSelect(r.id, e.metaKey || e.ctrlKey);
                  }}
                  onDoubleClick={(e: MouseEvent<HTMLTableRowElement>) => {
                    e.stopPropagation();
                    onOpen(r.id);
                  }}
                  className={cn(
                    "cursor-pointer border-b border-os-window-border transition-colors",
                    isSelected
                      ? "bg-brand/15"
                      : "hover:bg-os-window-alt",
                  )}
                  aria-selected={isSelected}
                >
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <DocumentIcon className="h-4 w-4 text-brand/80" />
                      {r.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-os-ink-muted">
                    {formatDate(r.updatedAt)}
                  </td>
                  <td className="px-3 py-2 text-os-ink-muted">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-2 py-2 text-os-ink-muted">
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </td>
                </tr>
              </ResumeContextMenu>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

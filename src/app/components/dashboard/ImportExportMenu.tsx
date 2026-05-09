"use client";

import { useRef } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { DropdownMenu, DropdownMenuItem } from "components/ui/dropdown-menu";
import { Button } from "components/ui/button";
import { exportAll, importAll } from "lib/storage/resume-store";

export function ImportExportMenu({
  onImportDone,
}: {
  onImportDone?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `open-resume-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importAll(text);
      onImportDone?.();
    } catch {
      alert("Failed to import. Please make sure the file is a valid Open Resume JSON export.");
    } finally {
      // Reset so the same file can be re-selected
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />
      <DropdownMenu
        trigger={
          <Button variant="outline" size="sm" aria-label="Import / Export">
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Import / Export</span>
          </Button>
        }
      >
        <DropdownMenuItem icon={ArrowDownTrayIcon} onClick={handleExport}>
          Export all as JSON
        </DropdownMenuItem>
        <DropdownMenuItem icon={ArrowUpTrayIcon} onClick={handleImportClick}>
          Import from JSON
        </DropdownMenuItem>
      </DropdownMenu>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  NewspaperIcon,
  PlusIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "components/ui/card";
import { DropdownMenu, DropdownMenuItem } from "components/ui/dropdown-menu";
import { cn } from "lib/utils";
import {
  deleteResume,
  duplicateResume,
  updateResume,
  exportAll,
} from "lib/storage/resume-store";
import type { ResumeRecord } from "lib/storage/resume-store";

const ACTION_ICONS = {
  plus: PlusIcon,
  briefcase: BriefcaseIcon,
  wand: WrenchScrewdriverIcon,
  newspaper: NewspaperIcon,
} as const;

type ActionIcon = keyof typeof ACTION_ICONS;

export const DashboardActionCard = ({
  title,
  icon,
  iconClassName,
  href,
  onClick,
}: {
  title: string;
  icon: ActionIcon;
  iconClassName: string;
  href?: string;
  onClick?: () => void;
}) => {
  const Icon = ACTION_ICONS[icon];
  const content = (
    <Card className="h-full cursor-pointer transition-colors hover:border-brand/40">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            iconClassName
          )}
        >
          <Icon className="h-8 w-8" />
        </div>
        <p className="text-center font-medium leading-tight text-gray-800">
          {title}
        </p>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return <button className="w-full text-left" onClick={onClick}>{content}</button>;
  }
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export const ResumeCard = ({
  resume,
  onRefresh,
}: {
  resume: ResumeRecord;
  onRefresh: () => void;
}) => {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete "${resume.name}"? This cannot be undone.`)) return;
    await deleteResume(resume.id);
    onRefresh();
  };

  const handleDuplicate = async () => {
    await duplicateResume(resume.id);
    onRefresh();
  };

  const handleRename = async () => {
    const newName = prompt("Rename resume:", resume.name);
    if (!newName || newName.trim() === resume.name) return;
    await updateResume(resume.id, { name: newName.trim() });
    onRefresh();
  };

  const handleExportJSON = async () => {
    const record = resume;
    const blob = new Blob([JSON.stringify(record, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resume.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card
      className="min-h-[168px] cursor-pointer transition-colors hover:border-brand/40"
      onClick={() => router.push(`/resume-builder/${resume.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-semibold leading-tight">
            {resume.name}
          </CardTitle>
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <DropdownMenu
              trigger={
                <button
                  type="button"
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                  aria-label="Resume options"
                >
                  <EllipsisHorizontalIcon className="h-5 w-5" />
                </button>
              }
            >
              <DropdownMenuItem icon={PencilIcon} onClick={handleRename}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={DocumentDuplicateIcon}
                onClick={handleDuplicate}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={ArrowDownTrayIcon}
                onClick={handleExportJSON}
              >
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={TrashIcon}
                onClick={handleDelete}
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-gray-600">
        <Link
          href={`/resume-builder/${resume.id}`}
          className="inline-flex items-center gap-2 text-brand hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <SparklesIcon className="h-4 w-4" />
          Match a job
        </Link>
        <p className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4" />
          Edited: {formatDate(resume.updatedAt)}
        </p>
      </CardContent>
    </Card>
  );
};

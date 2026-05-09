"use client";

import { useRouter } from "next/navigation";
import {
  DocumentPlusIcon,
  ArrowUpTrayIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";
import { createResume } from "lib/storage/resume-store";

interface Cta {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconClassName: string;
  action: () => void;
}

export function FirstRunCard({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();

  const handleStartFromScratch = async () => {
    const record = await createResume("Untitled Resume");
    onCreated?.();
    router.push(`/resume-builder/${record.id}`);
  };

  const ctas: Cta[] = [
    {
      icon: DocumentPlusIcon,
      title: "Start from scratch",
      description: "Begin with a blank resume and build your own story.",
      iconClassName: "bg-app-muted text-brand",
      action: handleStartFromScratch,
    },
    {
      icon: ArrowUpTrayIcon,
      title: "Import existing PDF",
      description: "Upload your current resume and we'll parse it for you.",
      iconClassName: "bg-[#dfe2fb] text-[#3d4db7]",
      action: () => router.push("/resume-import"),
    },
    {
      icon: SwatchIcon,
      title: "Start from template",
      description: "Pick a professionally designed template to get started.",
      iconClassName: "bg-[#f7dfe3] text-[#9f2f4a]",
      action: () => router.push("/dashboard/templates"),
    },
  ];

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12">
      <p className="mb-8 text-center text-sm text-gray-500">
        You don&apos;t have any resumes yet. Choose how you&apos;d like to get
        started:
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ctas.map(({ icon: Icon, title, description, iconClassName, action }) => (
          <button
            key={title}
            type="button"
            onClick={action}
            className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${iconClassName}`}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{title}</p>
              <p className="mt-1 text-xs text-gray-500">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

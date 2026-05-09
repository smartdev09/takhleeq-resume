"use client";
import { useEffect } from "react";
import { trackEvent, Events } from "lib/analytics";
import { useSetDefaultScale } from "components/Resume/hooks";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { buttonVariants } from "components/ui/button";
import { usePDF } from "@react-pdf/renderer";
import { cn } from "lib/utils";
import dynamic from "next/dynamic";

const ResumeControlBar = ({
  scale,
  setScale,
  documentSize,
  document,
  fileName,
}: {
  scale: number;
  setScale: (scale: number) => void;
  documentSize: string;
  document: React.ReactElement;
  fileName: string;
}) => {
  const { scaleOnResize, setScaleOnResize } = useSetDefaultScale({
    setScale,
    documentSize,
  });

  const [instance, update] = usePDF({ document: document as any });

  const hasDownloadUrl = Boolean(instance.url);

  return (
    <div className="sticky bottom-0 left-0 right-0 z-10 flex h-[var(--resume-control-bar-height)] items-center justify-between gap-3 bg-app-panel px-[var(--resume-padding)] text-sm text-gray-700">
      <div className="flex items-center gap-2 md:gap-3">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-500" aria-hidden="true" />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.01}
          value={scale}
          className="h-2 w-24 cursor-pointer accent-brand md:w-40"
          aria-label="Zoom resume preview"
          onChange={(e) => {
            setScaleOnResize(false);
            setScale(Number(e.target.value));
          }}
        />
        <div className="w-12 text-sm font-semibold text-gray-700">{`${Math.round(
          scale * 100
        )}%`}</div>
        <label className="hidden select-none items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 lg:flex">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand"
            checked={scaleOnResize}
            onChange={() => setScaleOnResize((prev) => !prev)}
          />
          <span>Autoscale</span>
        </label>
      </div>
      <a
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "ml-1 lg:ml-8",
          !hasDownloadUrl && "pointer-events-none opacity-50"
        )}
        href={instance.url ?? "#"}
        download={fileName}
        onClick={(e) => {
          if (!hasDownloadUrl) {
            e.preventDefault();
            update(document as any);
          } else {
            trackEvent(Events.PDF_DOWNLOADED);
          }
        }}
      >
        <ArrowDownTrayIcon className="h-4 w-4" />
        <span className="whitespace-nowrap">Download Resume</span>
      </a>
    </div>
  );
};

/**
 * Load ResumeControlBar client side since it uses usePDF, which is a web specific API
 */
export const ResumeControlBarCSR = dynamic(
  () => Promise.resolve(ResumeControlBar),
  {
    ssr: false,
  }
);

export const ResumeControlBarBorder = () => (
  <div className="absolute bottom-[var(--resume-control-bar-height)] w-full border-t border-gray-200 bg-app-panel" />
);

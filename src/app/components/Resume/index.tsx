"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { ResumeIframeCSR } from "components/Resume/ResumeIFrame";
import { ResumePDF } from "components/Resume/ResumePDF";
import { ResumeControlBarCSR } from "components/Resume/ResumeControlBar";
import { useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings } from "lib/redux/settingsSlice";
import { DEBUG_RESUME_PDF_FLAG } from "lib/constants";
import {
  useRegisterReactPDFFont,
  useRegisterReactPDFHyphenationCallback,
} from "components/fonts/hooks";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";
import type { Resume as ResumeType } from "lib/redux/types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const ZOOM_STEP = 0.03;

export const Resume = ({
  defaultScale = 0.8,
  resumeOverride,
}: {
  defaultScale?: number;
  resumeOverride?: ResumeType;
}) => {
  const [scale, setScale] = useState(defaultScale);
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const canvasRef = useRef<HTMLDivElement>(null);

  const storeResume = useAppSelector(selectResume);
  const resume = resumeOverride ?? storeResume;
  const settings = useAppSelector(selectSettings);
  const document = useMemo(
    () => <ResumePDF resume={resume} settings={settings} isPDF={true} />,
    [resume, settings]
  );

  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, scaleRef.current + delta)
      );
      setScale(Math.round(next * 100) / 100);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <>
      <NonEnglishFontsCSSLazyLoader />
      <div className="relative flex h-full flex-col">
        <div
          ref={canvasRef}
          className="relative min-h-0 flex-1 overflow-auto"
        >
          <div className="flex min-h-full min-w-full items-start justify-center p-4">
            <ResumeIframeCSR
              documentSize={settings.documentSize}
              scale={scale}
              enablePDFViewer={DEBUG_RESUME_PDF_FLAG}
            >
              <ResumePDF
                resume={resume}
                settings={settings}
                isPDF={DEBUG_RESUME_PDF_FLAG}
              />
            </ResumeIframeCSR>
          </div>
        </div>
        <ResumeControlBarCSR
          scale={scale}
          setScale={setScale}
          documentSize={settings.documentSize}
          document={document}
          fileName={
            ([resume.profile.firstName, resume.profile.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() || "Resume") + " - Resume"
          }
        />
      </div>
    </>
  );
};

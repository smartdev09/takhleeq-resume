"use client";

import { useState, useMemo } from "react";
import { useAppSelector } from "lib/redux/hooks";
import { selectResume } from "lib/redux/resumeSlice";
import { selectSettings } from "lib/redux/settingsSlice";
import { ResumePDF } from "components/Resume/ResumePDF";
import { ResumeIframeCSR } from "components/Resume/ResumeIFrame";
import {
  useRegisterReactPDFFont,
  useRegisterReactPDFHyphenationCallback,
} from "components/fonts/hooks";
import { NonEnglishFontsCSSLazyLoader } from "components/fonts/NonEnglishFontsCSSLoader";

export function TemplatePreview() {
  const [scale] = useState(0.7);
  const resume = useAppSelector(selectResume);
  const settings = useAppSelector(selectSettings);

  useRegisterReactPDFFont();
  useRegisterReactPDFHyphenationCallback(settings.fontFamily);

  const document = useMemo(
    () => <ResumePDF resume={resume} settings={settings} isPDF={false} />,
    [resume, settings]
  );

  return (
    <>
      <NonEnglishFontsCSSLazyLoader />
      <div className="flex justify-center p-6">
        <ResumeIframeCSR
          documentSize={settings.documentSize}
          scale={scale}
          enablePDFViewer={false}
        >
          {document}
        </ResumeIframeCSR>
      </div>
    </>
  );
}

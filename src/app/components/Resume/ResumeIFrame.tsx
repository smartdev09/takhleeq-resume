"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Frame from "react-frame-component";
import {
  A4_HEIGHT_PX,
  A4_HEIGHT_PT,
  A4_WIDTH_PX,
  A4_WIDTH_PT,
  LETTER_HEIGHT_PX,
  LETTER_HEIGHT_PT,
  LETTER_WIDTH_PX,
  LETTER_WIDTH_PT,
} from "lib/constants";
import dynamic from "next/dynamic";
import { getAllFontFamiliesToLoad } from "components/fonts/lib";

const getIframeInitialContent = (isA4: boolean) => {
  const width = isA4 ? A4_WIDTH_PT : LETTER_WIDTH_PT;
  const allFontFamilies = getAllFontFamiliesToLoad();

  const allFontFamiliesPreloadLinks = allFontFamilies
    .map(
      (font) =>
        `<link rel="preload" as="font" href="/fonts/${font}-Regular.ttf" type="font/ttf" crossorigin="anonymous">
<link rel="preload" as="font" href="/fonts/${font}-Bold.ttf" type="font/ttf" crossorigin="anonymous">`
    )
    .join("");

  const allFontFamiliesFontFaces = allFontFamilies
    .map(
      (font) =>
        `@font-face {font-family: "${font}"; src: url("/fonts/${font}-Regular.ttf");}
@font-face {font-family: "${font}"; src: url("/fonts/${font}-Bold.ttf"); font-weight: bold;}`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    ${allFontFamiliesPreloadLinks}
    <style>
      ${allFontFamiliesFontFaces}
    </style>
  </head>
  <body style='overflow: hidden; width: ${width}pt; margin: 0; padding: 0; -webkit-text-size-adjust:none;'>
    <div></div>
  </body>
</html>`;
};

const ResumeIframe = ({
  documentSize,
  scale,
  children,
  enablePDFViewer = false,
}: {
  documentSize: string;
  scale: number;
  children: React.ReactNode;
  enablePDFViewer?: boolean;
}) => {
  const isA4 = documentSize === "A4";
  const iframeInitialContent = useMemo(
    () => getIframeInitialContent(isA4),
    [isA4]
  );

  const width = isA4 ? A4_WIDTH_PX : LETTER_WIDTH_PX;
  const pageHeight = isA4 ? A4_HEIGHT_PX : LETTER_HEIGHT_PX;
  const pageHeightPt = isA4 ? A4_HEIGHT_PT : LETTER_HEIGHT_PT;

  const [numPages, setNumPages] = useState(1);
  const firstPageRef = useRef<HTMLDivElement>(null);

  const measureContentHeight = useCallback(() => {
    const wrapper = firstPageRef.current;
    if (!wrapper) return;
    const iframe = wrapper.querySelector("iframe");
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc?.body) return;
    const contentH = doc.body.scrollHeight;
    const pages = Math.max(1, Math.ceil(contentH / pageHeight));
    setNumPages((prev) => (prev === pages ? prev : pages));
  }, [pageHeight]);

  useEffect(() => {
    const id = setInterval(measureContentHeight, 400);
    return () => clearInterval(id);
  }, [measureContentHeight]);

  if (enablePDFViewer) {
    return (
      <DynamicPDFViewer className="h-full w-full">
        {children as any}
      </DynamicPDFViewer>
    );
  }

  const scaledW = Math.round(width * scale);
  const scaledH = Math.round(pageHeight * scale);
  const frameKey = isA4 ? "A4" : "LETTER";

  return (
    <div className="inline-flex items-start gap-6">
      {Array.from({ length: numPages }, (_, pageIdx) => (
        <div key={pageIdx} className="flex-shrink-0">
          <div
            ref={pageIdx === 0 ? firstPageRef : undefined}
            className="overflow-hidden rounded bg-white shadow-lg"
            style={{ width: scaledW, height: scaledH }}
          >
            <div
              style={{
                width: `${width}px`,
                height: `${pageHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <Frame
                style={{ width: "100%", height: "100%" }}
                initialContent={iframeInitialContent}
                key={`${frameKey}-${pageIdx}`}
              >
                {pageIdx === 0 ? (
                  children
                ) : (
                  <div style={{ marginTop: `${-pageHeightPt * pageIdx}pt` }}>
                    {children}
                  </div>
                )}
              </Frame>
            </div>
          </div>
          {numPages > 1 && (
            <p className="mt-2 text-center text-[11px] font-medium text-gray-400">
              {pageIdx + 1} / {numPages}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export const ResumeIframeCSR = dynamic(() => Promise.resolve(ResumeIframe), {
  ssr: false,
});

const DynamicPDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((module) => module.PDFViewer),
  {
    ssr: false,
  }
);

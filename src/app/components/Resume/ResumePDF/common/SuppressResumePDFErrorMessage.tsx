"use client";

import { useEffect } from "react";

const SUPPRESSED_PATTERNS = [
  "DOCUMENT",
  "PAGE",
  "TEXT",
  "VIEW",
  "incorrect casing",
  "PascalCase",
  "lowercase for HTML elements",
];

let patched = false;

/**
 * Suppress known, noisy ResumePDF development warnings from react-pdf when
 * rendering to DOM without PDFViewer (e.g. "<VIEW /> is using incorrect casing",
 * "Use PascalCase for React components, or lowercase for HTML elements").
 * See ResumePDF docstring in ResumePDF/index.tsx for context.
 */
export const SuppressResumePDFErrorMessage = () => {
  useEffect(() => {
    if (window.location.hostname !== "localhost" || patched) return;
    patched = true;

    const originalConsoleError = console.error;
    console.error = function filterWarnings(
      message?: unknown,
      ...rest: unknown[]
    ) {
      const fullMessage = [message, ...rest]
        .map((x) => String(x ?? ""))
        .join(" ");
      const shouldSuppress = SUPPRESSED_PATTERNS.some((pattern) =>
        fullMessage.includes(pattern)
      );
      if (!shouldSuppress) {
        originalConsoleError(message, ...rest);
      }
    };
  }, []);

  return null;
};

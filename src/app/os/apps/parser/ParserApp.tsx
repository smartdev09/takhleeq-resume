/**
 * `<ParserApp>` — windowed wrapper around the existing PDF parser
 * playground. The body is the same dropzone + sample-PDF + parsed-output
 * table the original `/resume-parser` route shipped, lifted out of the
 * marketing chrome (`<TopNavBar>` and the global app shell are gone — the
 * OS chrome replaces them).
 *
 * The parser is read-only debugging surface: it does NOT save to IndexedDB
 * and does NOT touch Redux. It exists so users (and us, while debugging
 * regressions) can confirm what the resume parser would extract from a
 * given PDF.
 */

"use client";

import { useEffect, useMemo, useState } from "react";

import { ResumeDropzone } from "components/ResumeDropzone";
import { Heading, Link, Paragraph } from "components/documentation";
import { ResumeTable } from "resume-parser/ResumeTable";
import { ResumeParserAlgorithmArticle } from "resume-parser/ResumeParserAlgorithmArticle";
import { groupLinesIntoSections } from "lib/parse-resume-from-pdf/group-lines-into-sections";
import { groupTextItemsIntoLines } from "lib/parse-resume-from-pdf/group-text-items-into-lines";
import { extractResumeFromSections } from "lib/parse-resume-from-pdf/extract-resume-from-sections";
import { readPdf } from "lib/parse-resume-from-pdf/read-pdf";
import type { TextItems } from "lib/parse-resume-from-pdf/types";
import { cn } from "lib/utils";
import type { AppComponentProps } from "../app-types";

const RESUME_EXAMPLES: ReadonlyArray<{
  fileUrl: string;
  description: React.ReactNode;
}> = [
  {
    fileUrl: "resume-example/laverne-resume.pdf",
    description: (
      <span>
        Borrowed from University of La Verne Career Center —{" "}
        <Link href="https://laverne.edu/careers/wp-content/uploads/sites/15/2010/12/Undergraduate-Student-Resume-Examples.pdf">
          Link
        </Link>
      </span>
    ),
  },
  {
    fileUrl: "resume-example/openresume-resume.pdf",
    description: (
      <span>Created with the Takhleeq builder.</span>
    ),
  },
];

const DEFAULT_FILE_URL = RESUME_EXAMPLES[0].fileUrl;

export default function ParserApp(_props: AppComponentProps<"parser">) {
  const [fileUrl, setFileUrl] = useState<string>(DEFAULT_FILE_URL);
  const [textItems, setTextItems] = useState<TextItems>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = useMemo(
    () => groupTextItemsIntoLines(textItems || []),
    [textItems],
  );
  const sections = useMemo(() => groupLinesIntoSections(lines), [lines]);
  const resume = useMemo(
    () => extractResumeFromSections(sections),
    [sections],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const next = await readPdf(fileUrl);
        if (!cancelled) setTextItems(next);
      } catch (err) {
        console.error("Failed to read PDF", err);
        if (!cancelled) {
          setError("We couldn't parse this PDF. Try a different file.");
          setTextItems([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <div
      data-testid="parser-app"
      className="flex h-full w-full bg-os-window text-os-ink"
    >
      <section
        className="flex w-1/2 min-w-0 flex-col items-center gap-3 border-r border-os-window-border bg-os-window-alt p-4"
        aria-label="PDF preview"
      >
        <div className="relative aspect-[7/9.5] w-full max-w-[480px] overflow-hidden rounded-lg border border-os-window-border bg-white shadow-sm">
          <iframe
            data-testid="parser-iframe"
            src={`${fileUrl}#navpanes=0`}
            className="h-full w-full"
            title="Resume preview"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                Loading PDF…
              </div>
            </div>
          )}
        </div>
      </section>

      <section
        className="w-1/2 min-w-0 overflow-y-auto px-5 py-4 text-os-ink"
        aria-label="Parsed output"
      >
        <Heading className="text-os-ink !mt-2">
          Resume Parser Playground
        </Heading>
        <Paragraph smallMarginTop>
          This playground showcases the Takhleeq resume parser and what it
          can extract from a resume PDF. Pick a sample below or drop in your
          own — everything runs locally in your browser.
        </Paragraph>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {RESUME_EXAMPLES.map((example, idx) => {
            const active = example.fileUrl === fileUrl;
            return (
              <article
                key={example.fileUrl}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={() => setFileUrl(example.fileUrl)}
                onKeyDown={(e) => {
                  if (e.key === " ") e.preventDefault();
                  if (e.key === "Enter" || e.key === " ") {
                    setFileUrl(example.fileUrl);
                  }
                }}
                className={cn(
                  "cursor-pointer rounded-lg border-2 bg-white px-3 py-2 shadow-sm outline-none transition-colors hover:bg-gray-50",
                  active ? "border-brand" : "border-gray-200",
                )}
                data-testid={`parser-example-${idx}`}
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  Example {idx + 1}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {example.description}
                </p>
              </article>
            );
          })}
        </div>

        <Paragraph>
          You can also <span className="font-semibold">drop your own PDF</span>{" "}
          to inspect what an Application Tracking System would parse. Better
          parsing results = a more ATS-friendly resume.
        </Paragraph>

        <div className="mt-3">
          <ResumeDropzone
            onFileUrlChange={(next) => setFileUrl(next || DEFAULT_FILE_URL)}
            playgroundView
            className="rounded-lg bg-white"
          />
        </div>

        <Heading level={2} className="!mt-6 text-os-ink">
          Parsing Results
        </Heading>
        {error && (
          <p
            data-testid="parser-error"
            role="alert"
            className="mt-2 text-sm text-red-500"
          >
            {error}
          </p>
        )}
        <div className="overflow-hidden rounded-lg border border-os-window-border bg-white shadow-sm">
          <ResumeTable resume={resume} />
        </div>

        <ResumeParserAlgorithmArticle
          textItems={textItems}
          lines={lines}
          sections={sections}
        />
        <div className="pt-12" />
      </section>
    </div>
  );
}

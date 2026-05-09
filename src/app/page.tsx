/**
 * Root route — mounts the OpenResume OS desktop.
 *
 * The OS chrome (`OSRoot`) is a "use client" component; this server-rendered
 * page wraps it with a `<noscript>` SEO fallback that pre-renders the same
 * marketing content the site previously shipped at `/`. Crawlers and users
 * with JS disabled get the marketing page; everyone else gets the desktop.
 *
 * Phase 4 cutover lives at this file. `/test-os` is removed in the same
 * commit so the OS preview only ships at `/`.
 */

import { OSRoot } from "os/OSRoot";
import { NoscriptFallback } from "./noscript-fallback";

export const metadata = {
  title: "OpenResume — Free Open-source Resume Builder",
  description:
    "Build, analyze, and tailor your resume in a calm, focused desktop. ATS-ready PDFs, AI-powered editing, and a paper-on-desk interface that stays out of your way.",
};

export default function Home() {
  return (
    <>
      <OSRoot />
      <noscript>
        <NoscriptFallback />
      </noscript>
    </>
  );
}

/**
 * Server-only marketing fallback rendered inside `<noscript>` so search
 * engine crawlers and JS-disabled users still see the conversion content.
 *
 * Pulled from the Hero/Features/Steps/FAQ copy; static markup with no
 * interactivity. The OS desktop replaces this entirely once JS boots.
 */

const FEATURES = [
  {
    title: "Resume Builder",
    body: "Drag-to-reorder sections, real-time PDF preview, automatic ATS scoring.",
  },
  {
    title: "Resume Parser",
    body: "Test how an applicant tracking system reads your existing PDF.",
  },
  {
    title: "AI Improvements",
    body: "Bring your own model — Ollama, OpenRouter, or Web LLM — to tailor your resume to a job description.",
  },
  {
    title: "Local-first",
    body: "Your resumes never leave your device. IndexedDB, no cloud, no signup.",
  },
];

const STEPS = [
  "Pick a template or import an existing PDF.",
  "Edit your details — every change updates the live PDF preview.",
  "Tailor to a job description and download an ATS-ready PDF.",
];

const REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? "xitanggg/open-resume";

export function NoscriptFallback() {
  return (
    <main
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#222",
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>
          Takhleeq — Free Open-source Resume Builder
        </h1>
        <p style={{ fontSize: 18, color: "#555" }}>
          Build, analyze, and tailor your resume in a calm, focused desktop.
          ATS-ready PDFs, AI-powered editing, local-first storage.
        </p>
        <p style={{ marginTop: 16 }}>
          <a
            href={`https://github.com/${REPO}`}
            style={{ color: "#2563eb" }}
            rel="noreferrer noopener"
          >
            Star us on GitHub →
          </a>
        </p>
      </header>

      <section aria-labelledby="features-heading" style={{ marginBottom: 32 }}>
        <h2 id="features-heading" style={{ fontSize: 24, marginBottom: 12 }}>
          Features
        </h2>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {FEATURES.map((f) => (
            <li key={f.title} style={{ marginBottom: 12 }}>
              <strong>{f.title}.</strong> {f.body}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps-heading" style={{ marginBottom: 32 }}>
        <h2 id="steps-heading" style={{ fontSize: 24, marginBottom: 12 }}>
          How it works
        </h2>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {STEPS.map((s) => (
            <li key={s} style={{ marginBottom: 8 }}>
              {s}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cta-heading" style={{ marginBottom: 32 }}>
        <h2 id="cta-heading" style={{ fontSize: 24, marginBottom: 12 }}>
          This site is interactive
        </h2>
        <p>
          Takhleeq runs as a small operating-system style desktop in your
          browser. To use the resume builder, parser, AI assistant, and
          template gallery, please enable JavaScript and refresh the page.
        </p>
      </section>

      <footer style={{ marginTop: 40, fontSize: 14, color: "#777" }}>
        <p>
          Takhleeq is open source under the AGPL license. Source code at{" "}
          <a
            href={`https://github.com/${REPO}`}
            style={{ color: "#2563eb" }}
            rel="noreferrer noopener"
          >
            github.com/{REPO}
          </a>
          .
        </p>
      </footer>
    </main>
  );
}

import { Link } from "components/documentation";

const QAS = [
  {
    question:
      "Q1. What is a resume builder, and why is it better than a resume template doc?",
    answer: (
      <>
        <p>
          A resume builder is an online tool that takes your information and
          automatically generates a professionally formatted resume. The
          alternative is to use a word processor template (Google Docs, Word)
          and manually format everything yourself.
        </p>
        <p>
          Manual templates are tedious and error-prone — inconsistent bullet
          styles, mismatched fonts, and spacing issues are common pitfalls.
          Takhleeq eliminates all of that by handling formatting automatically,
          so you can focus on what matters: writing compelling content. Changing
          fonts, colors, or layout takes a single click rather than hours of
          manual work.
        </p>
      </>
    ),
  },
  {
    question:
      "Q2. What uniquely sets Takhleeq apart from other resume builders?",
    answer: (
      <>
        <p>
          Other great free resume builders exist, e.g.{" "}
          <Link href="https://rxresu.me/">Reactive Resume</Link> and{" "}
          <Link href="https://flowcv.com/">FlowCV</Link>. Takhleeq stands out
          with several distinctive features:
        </p>
        <p>
          <span className="font-semibold">
            1. AI-powered resume improvements.
          </span>
          <br />
          One click to improve your ATS score, rewrite bullet points with
          stronger language, and tailor your entire resume to a specific job
          description. Works with Gemini, Groq, OpenAI, or a local AI model via
          Ollama.
        </p>
        <p>
          <span className="font-semibold">
            2. Multiple ATS-safe templates and multi-resume dashboard.
          </span>
          <br />
          Manage multiple versions of your resume — one for each role or company
          — from a personal dashboard. All templates are tested against top ATS
          platforms like Greenhouse and Lever.
        </p>
        <p>
          <span className="font-semibold">
            3. Global job market support, including Pakistan.
          </span>
          <br />
          Takhleeq is built for job seekers worldwide — from Karachi to San
          Francisco. It includes Pakistan-friendly date formats (DD/MM/YYYY),
          a country field, and local sample resumes.
        </p>
        <p>
          <span className="font-semibold">4. Super privacy focused.</span>
          <br />
          No sign-up required. All data stays in your browser — no accounts, no
          databases, nothing stored on a server. Your resume is yours alone.
        </p>
      </>
    ),
  },
  {
    question: "Q3. Who created Takhleeq and why?",
    answer: (
      <p>
        Takhleeq was originally created by{" "}
        <Link href="https://github.com/xitanggg">Xitang Zhao</Link> and designed
        by <Link href="https://www.linkedin.com/in/imzhi">Zhigang Wen</Link> as
        a weekend project to help first-generation students and immigrants avoid
        common resume mistakes. Since then, it has grown into an open-source
        community project used by job seekers around the world. This fork
        extends the original with AI-powered improvements, a multi-resume
        dashboard, additional templates, and support for the global job market —
        including Pakistan. The mission remains the same: help anyone create a
        modern, professional resume with confidence.
      </p>
    ),
  },
  {
    question: "Q4. How can I support Takhleeq?",
    answer: (
      <>
        <p>
          The most important thing you can do is{" "}
          <Link href="https://github.com/xitanggg/open-resume">
            star the GitHub repository
          </Link>
          . Starring is also required to unlock the one-click PDF export
          feature, so it&apos;s a win-win.
        </p>
        <p>
          You can also share feedback by{" "}
          <Link href="https://github.com/xitanggg/open-resume/issues/new">
            opening an issue
          </Link>{" "}
          on GitHub, or spread the word by sharing Takhleeq with friends,
          classmates, or your university&apos;s career center. The goal is to
          reach every job seeker who deserves a great resume but doesn&apos;t
          have access to expensive tools.
        </p>
      </>
    ),
  },
  {
    question: "Q5. Does Takhleeq work for Pakistani job seekers?",
    answer: (
      <p>
        Yes — Takhleeq was built with the global job market in mind, and
        Pakistan is a first-class citizen. The builder supports DD/MM/YYYY date
        formats commonly used in Pakistan and the broader South Asian job
        market. A country field is included in the profile section. Sample
        resumes reflect local conventions. Whether you&apos;re applying to
        companies in Karachi, Lahore, Dubai, or San Francisco, Takhleeq
        generates ATS-safe, professionally formatted resumes that travel well
        across borders.
      </p>
    ),
  },
];

export const QuestionsAndAnswers = () => {
  return (
    <section className="mx-auto mt-4 max-w-3xl rounded-2xl border border-gray-200 bg-white px-4 py-6 shadow-sm lg:px-6">
      <h2 className="text-center text-3xl font-bold">Questions & Answers</h2>
      <div className="mt-6 space-y-3">
        {QAS.map(({ question, answer }) => (
          <div
            key={question}
            className="rounded-xl border border-gray-200 bg-[#f7f9f8] px-4 py-4"
          >
            <h3 className="font-semibold leading-7 text-gray-900">{question}</h3>
            <div className="mt-3 grid gap-2 leading-7 text-gray-600">
              {answer}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

# Contributing to Takhleeq

Thank you for your interest in contributing! This document outlines how to get started.

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm

### Steps

```bash
git clone https://github.com/xitanggg/open-resume
cd open-resume
npm install
cp .env.example .env.local
# Fill in your GitHub OAuth credentials (see README for details)
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Code Style

- **TypeScript** strict mode — all new files must be `.ts` or `.tsx` with strict typing
- **ESLint** — configured via `eslint.config.mjs` (eslint-config-next). Run `npm run lint` before committing
- **Tailwind CSS** — use utility classes for styling; avoid inline styles
- **No barrel exports** — import directly from the source file
- **Server vs. client** — prefer React Server Components; add `"use client"` only when you need browser APIs or interactivity
- **No PII in analytics** — never pass user names, resume content, or file names to `trackEvent`

---

## Project Architecture

```
src/app/
├── (marketing)/          # Public landing pages (unauthenticated)
├── (workspace)/          # Authenticated workspace (dashboard, builder)
│   ├── dashboard/        # Resume dashboard
│   └── resume-builder/   # Builder workspace
├── api/                  # Next.js Route Handlers
│   └── auth/             # GitHub OAuth star-gate endpoints
├── components/
│   ├── Resume/           # PDF preview (react-pdf)
│   ├── ResumeForm/       # Resume editing forms
│   ├── agent/            # AI improvement tabs & job matcher flow
│   ├── builder/          # BuilderWorkspace orchestrator
│   ├── dashboard/        # Dashboard UI cards
│   └── ui/               # Shared design system primitives
├── lib/
│   ├── agent/            # AI providers, prompts, ATS scorer, diff
│   ├── auth/             # Cookie handling, GitHub OAuth helpers
│   ├── redux/            # Redux store, slices (resume, settings)
│   └── parse-resume-from-pdf/  # PDF-to-resume parser
└── globals.css           # Global styles & CSS variables
```

Key decisions:
- **State**: Redux Toolkit manages the live resume and settings; no server-side persistence yet (IndexedDB migration in progress)
- **PDF rendering**: `@react-pdf/renderer` renders the resume PDF client-side, loaded via `dynamic()` with `ssr: false`
- **AI**: Provider-agnostic via `AIProvider` interface in `lib/agent/providers/types.ts`; add a new provider by implementing that interface
- **Star gate**: GitHub OAuth flow lives in `src/app/api/auth/`; the gate can be disabled with `NEXT_PUBLIC_DISABLE_STAR_GATE=1`

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Make your changes** following the code style guidelines above
3. **Run checks** locally before opening a PR:
   ```bash
   npm run lint          # ESLint
   npx tsc --noEmit      # TypeScript type check
   npm run build         # Ensure production build succeeds
   ```
4. **Open a PR** against the `main` branch with:
   - A clear title describing what the PR does
   - A short description of the change and why it's needed
   - Screenshots or recordings for UI changes
5. **Address review feedback** promptly

### Commit Message Convention

Use conventional commits:

```
feat: add export-to-LinkedIn feature
fix: correct ATS scorer keyword weighting
docs: update README self-hosting section
refactor: extract provider config to separate hook
```

---

## Reporting Bugs

Open an issue at [github.com/xitanggg/open-resume/issues](https://github.com/xitanggg/open-resume/issues/new) with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS version
- Console errors (if any)

---

## Feature Requests

Open an issue tagged `enhancement`. Describe the use case and why it would benefit other users.

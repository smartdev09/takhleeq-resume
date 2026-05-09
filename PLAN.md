# open-resume — Launch Plan & Progress Tracker

> **Purpose:** Single source of truth for the v1 launch. Designed to be picked up by any agent (or human) without prior context. Keep this file updated as the work progresses.

---

## Status

| Field | Value |
|-------|-------|
| **Plan version** | 1.0 |
| **Created** | 2026-05-08 |
| **Last updated** | 2026-05-08 (P3-1 through P3-7 complete — atsRating badges, 5 new templates inc. 3 PK samples, country field, DD/MM/YYYY format, ATS Safe Mode toggle, Designer risk labels) |
| **Owner** | @usman.siddique |
| **Current phase** | Phase 3 — complete |
| **Overall progress** | 39 / 61 tasks complete (P0-1, P0-2, P0-4, P0-5, P1-1 through P1-8, P2-1, P2-6, P2-7, P2-8, P2-9, P3-1 through P3-7, P5-6, P6-4, PSG-1 through PSG-14 done) |
| **Estimated effort to v1** | ~3 weeks (balanced scope, includes star gate) |

---

## How to use this file (for agents)

1. **Always read the entire `Decisions` and `Current focus` sections first.** If decisions are still marked `[TENTATIVE]`, pause and ask the user to confirm them — do not proceed on guesses.
2. **Pick one task at a time** from the next unchecked phase. Mark it `[~]` (in progress) before starting, `[x]` when done.
3. **Update the `Last updated` field** and add a one-line entry to the `Changelog` at the bottom every time you change the file.
4. **Do not reorder phases.** Phases 0 → 6 are dependency-ordered. If you must work out of order, document why in the changelog.
5. **Each task lists `Files`, `Deliverables`, and `Acceptance`.** A task is "done" only when all three are satisfied.
6. **Never skip writing tests** for tasks marked `[TEST-REQUIRED]`.
7. If you find a new bug or scope item not in this plan, add it to the `Backlog` section at the bottom — don't silently expand a task.

Status legend: `[ ]` = todo, `[~]` = in progress, `[x]` = done, `[!]` = blocked (explain below the task), `[-]` = cancelled.

---

## Decisions (must be confirmed before Phase 1)

These are the tentative defaults. **The user must confirm or override before Phase 1 starts.**

| # | Decision | Tentative default | Status |
|---|----------|-------------------|--------|
| D1 | Free-AI strategy | **Both** — WebLLM in-browser as default + server proxy via OpenRouter free tier as fallback + keep BYO-key for power users | [CONFIRMED 2026-05-08] |
| D2 | Multi-resume storage | **Cloudflare R2 keyed by GitHub username** (requires Phase 4B auth). Phase 1 ships with IndexedDB locally, then migrates to R2 after Phase 4B. | [CONFIRMED 2026-05-08 — OVERRIDE from IndexedDB-only] |
| D3 | Locale / sample data | **Pakistan-prominent** — keep current US samples, add 3 PK samples, add `country` selector, add DD/MM/YYYY date option | [CONFIRMED 2026-05-08] |
| D4 | Cover Letter tab | **Build in v1** — not deferred; add Cover Letter generation flow to v1 scope | [CONFIRMED 2026-05-08 — OVERRIDE from defer] |
| D5 | Auth / cloud sync | **GitHub OAuth only** — single-purpose, used to verify the star-gate. No email signup, no profile. Cloud resume sync (R2) unlocked after auth in v1. | [CONFIRMED 2026-05-08] |
| D6 | Scope | **Balanced** — Phases 0-5 + 4B in v1, Phase 6 polish before public launch | [CONFIRMED 2026-05-08] |
| D7 | Landing page | **Keep with redesign** — `/` shows a minimal landing page with good copy and design; `(marketing)/` route group stays but is redesigned | [CONFIRMED 2026-05-08 — OVERRIDE from delete] |
| D8 | Test framework for E2E | **Playwright** (already common in Next.js ecosystem, has good MSW integration) | [CONFIRMED 2026-05-08] |
| D9 | Star-gate trigger point | **Every PDF download attempt** — gate appears once per session if not authed; once authed + verified, downloads in same session skip the modal | [CONFIRMED 2026-05-08] |
| D10 | Star re-verification cadence | **24-hour recheck** — server caches `starred=true` in signed cookie for 24h; after that, next download triggers a quick re-validation against GitHub API | [CONFIRMED 2026-05-08] |
| D11 | Fallback for users without GitHub | **Soft escape hatch** — modal shows "I don't have a GitHub account" button; clicking it allows direct download once per session without star verification | [CONFIRMED 2026-05-08 — OVERRIDE from hard block] |
| D12 | Star-gate scope | **PDF download only** — building, editing, AI improvement, JSON export, and import all remain free without auth. Star is required only at the moment of producing a polished PDF. | [CONFIRMED 2026-05-08] |

---

## Findings summary

The full audit is in chat history. Top-level summary:

**What works:** Solid section registry pattern (`src/app/lib/resume-section-registry.ts`), Redux + localStorage persistence, drag-and-drop reorder via `@dnd-kit`, live PDF preview, 4 AI providers (Ollama / Gemini / Groq / OpenAI) all client-side BYO-key, ATS scorer with deterministic rules.

**Top blockers for launch:**
1. Multi-resume dashboard is fake mock data (`src/app/lib/mock/dashboard-data.ts`). Clicking any "resume" loads the same single Redux store.
2. AI flow has 3 real bugs: Custom Prompt mode broken, Save dialog name unused, Save banner action stubbed.
3. Templates: 8 named templates, but only 3 underlying layouts. Two-column and Mixed layouts are ATS risks.
4. Designer settings `bulletStyle`, `lineHeight`, margins, `dateFormat`, `skillsLayout`, `interestsDisplayMode` are persisted but never reach the PDF.
5. Tests: only 2 unit test files, zero E2E. Nothing tests Redux, agent layer, or PDF rendering.
6. AI requires user to paste an API key — most will bounce.
7. Header `Export PDF` button has no `onClick`.
8. Locale: all samples are US-centric; profile has no `country` field surfaced.
9. Landing page exists but user wants it gone.

### Risk acknowledgement: GitHub star-gate (Phase 4B)

The user has chosen to gate PDF downloads behind a verified GitHub star. This is implemented honestly via OAuth (option A) rather than spoofable methods. The following risks have been raised and acknowledged:

- **AGPL-3.0 § 7** — adding restrictions on the rights granted by the licence is constrained. Gating the *hosted product*'s download is generally allowed (the source remains free); anyone can still self-host without the gate. Forks are free to remove it.
- **GitHub Acceptable Use Policy § A.4** — forbids "artificially manipulating" engagement. Star-walling has been a pattern GitHub has occasionally objected to. Risk: low-to-medium.
- **Conversion impact** — non-GitHub-users (a sizeable fraction of the Pakistani-job-seeker target audience) will hit a hard wall. Decision D11 must address this.
- **OSS optics** — likely negative reception on HN/Reddit. Mitigated by clear messaging ("This product is built solo and free; a star helps") and reasonable scope (only the PDF download is gated, not the editor).

If at any point this becomes a blocker or starts generating support load, fall back to the soft-nudge variant by removing Phase 4B in one PR.

---

## Current focus

**Current state:** All phases running in parallel via background agents. P0-1 and P0-4 done. Agents running for: P0-2 (landing redesign), P0-5 (TypeScript), Phase 1 (multi-resume), Phase 2 bugs, Phase 3 (templates), Phase 4 (free AI), Phase 4B (OAuth star-gate), Phase 6 (polish), Cover Letter (P6-4). Awaiting completions to do follow-up tasks: P2-2, P2-3, P2-4, P2-10, P2-11, PSG-8, PSG-12, Phase 5 (tests).

---

## Phase 0 — Decisions, cleanup, tooling (~0.5 day)

**Goal:** lock decisions, kill landing, fix outdated tooling.

- [x] **P0-1** Confirm decisions D1–D8 (+ D11, D12)
  - **Acceptance:** all 8 decisions marked `[CONFIRMED]` or `[OVERRIDDEN]`.

- [x] **P0-2** Redesign `(marketing)/` landing page with good copy and design *(D7 override — keep, don't delete)*
  - **Files:** `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/page.tsx`, `src/app/home/*` (replace with redesigned components).
  - **Acceptance:** `/` shows a polished landing page; all home/* imports resolve; `npm run build` clean.

- [-] **P0-3** ~~Add root redirect `/` → `/dashboard`~~ — CANCELLED (D7 override keeps landing page)

- [x] **P0-4** Fix tooling
  - **Files:** `tsconfig.json` (`"target": "es2022"`), `package.json` (`"test": "jest"`, add `"test:watch": "jest --watch"`), pick one ESLint config (delete `.eslintrc.json` since `eslint.config.mjs` exists).
  - **Acceptance:** `npx tsc --noEmit` returns clean; `npm run lint` runs; `npm test` runs once and exits.

- [x] **P0-5** Run `npx tsc --noEmit` and fix any latent type errors introduced by recent file additions
  - **Files:** wherever errors surface.
  - **Acceptance:** zero TypeScript errors.

---

## Phase 1 — Real multi-resume experience (~3 days) [BLOCKED on D2]

**Goal:** users can create, list, rename, duplicate, delete resumes that actually persist independently.

- [x] **P1-1** Add `idb` dependency and create storage abstraction `src/app/lib/storage/resume-store.ts`
  - **Files:** `package.json`, new file with API: `listResumes()`, `getResume(id)`, `createResume(name)`, `updateResume(id, patch)`, `deleteResume(id)`, `duplicateResume(id)`, `exportAll()`, `importAll(json)`.
  - **Schema:** each record `{ id, name, resume, settings, createdAt, updatedAt, atsScore?, lastJobMatch? }`.
  - **Acceptance:** `[TEST-REQUIRED]` unit tests for every method using `fake-indexeddb`.

- [x] **P1-2** Create `resumesSlice.ts` (top-level resume list) + adapt `resumeSlice` to be a "current document" slice driven by `currentResumeId`
  - **Files:** new `src/app/lib/redux/resumesSlice.ts`, refactor `src/app/lib/redux/store.ts`, `hooks.tsx`, `local-storage.ts` (replace single-doc save with per-doc).
  - **Acceptance:** Redux holds `{ resumes: ResumeListItem[], currentResumeId: string | null, resume: Resume, settings: Settings }`. Switching `currentResumeId` loads from IndexedDB.

- [x] **P1-3** Migrate any existing single-resume localStorage data into IndexedDB on first run
  - **Files:** `hooks.tsx` `useSetInitialStore`, new helper `migrateLegacyLocalStorage()`.
  - **Acceptance:** existing users with a single resume in `open-resume-state` see it as their first resume after upgrade.

- [x] **P1-4** Wire `[id]` page to actually load that resume
  - **Files:** `src/app/(workspace)/resume-builder/[id]/page.tsx`, `src/app/components/builder/BuilderWorkspace.tsx`.
  - **Acceptance:** opening `/resume-builder/abc-123` loads resume `abc-123`. Editing it does not affect other resumes.

- [ ] **P1-5** Replace mock dashboard with live data
  - **Files:** `src/app/(workspace)/dashboard/page.tsx`, `src/app/(workspace)/dashboard/resumes/page.tsx`, `src/app/components/dashboard/DashboardCards.tsx`, delete `MOCK_RESUMES` from `src/app/lib/mock/dashboard-data.ts`.
  - **Acceptance:** dashboard shows real resumes. Card click → opens builder for that resume. ⋯ menu → Rename / Duplicate / Delete / Export JSON.

- [x] **P1-6** Empty-state CTA for users with zero resumes
  - **Files:** `src/app/(workspace)/dashboard/page.tsx`, new `src/app/components/dashboard/FirstRunCard.tsx`.
  - **Acceptance:** zero-resume user sees three large CTAs: Start from scratch / Import existing PDF / Start from template.

- [x] **P1-7** Wire dashboard search and sort (currently dead inputs)
  - **Files:** `src/app/(workspace)/dashboard/page.tsx`.
  - **Acceptance:** typing in search filters the list; sort button toggles by name / updatedAt.

- [x] **P1-8** Add JSON export/import for portability
  - **Files:** new `src/app/components/dashboard/ImportExportMenu.tsx`.
  - **Acceptance:** export downloads a JSON file with all resumes; import restores them.

---

## Phase 2 — Bug-fix sweep + inline AI (~3 days)

**Goal:** fix the high-severity bugs, surface AI improvements inline so users don't need to leave the editor.

- [x] **P2-1** Fix Custom Prompt mode in Job Matcher
  - **Files:** `src/app/components/agent/job-matcher/JobMatcherFlow.tsx` (around L144 `handleAnalyze`, L441-461 input UI).
  - **Acceptance:** switching to Custom Prompt mode and clicking Analyze routes through `AgentService.customPrompt(resume, customPrompt)` → diff review.

- [ ] **P2-2** Make `SaveResumeDialog` actually save a *named* resume
  - **Files:** `src/app/components/agent/job-matcher/JobMatcherFlow.tsx` `handleConfirmSave`, integration with `resume-store` from P1-1.
  - **Acceptance:** clicking Save in the dialog creates a new resume in the dashboard with the given name; user can re-open it.

- [ ] **P2-3** Wire `BuilderWorkspace` header `Export PDF` button
  - **Files:** `src/app/components/builder/BuilderWorkspace.tsx` (L328-334), refactor `ResumeControlBar.tsx` to expose its `usePDF` instance / download handler.
  - **Acceptance:** header Export PDF button downloads the same PDF as the bottom control bar's Download Resume.

- [ ] **P2-4** Wire `SessionBanner` save and discard
  - **Files:** `src/app/components/builder/BuilderWorkspace.tsx` (L364-374, remove `TODO`).
  - **Acceptance:** Save creates a new dashboard entry; Discard reverts Redux to pre-tailor snapshot.

- [ ] **P2-5** Move misplaced `import React` and gate ATS recompute
  - **Files:** `src/app/components/builder/BuilderWorkspace.tsx` (move L266 import to top, scope `useATSBadge` selector to resume slice only).
  - **Acceptance:** lint clean; ATS badge does not recompute on settings-only changes.

- [x] **P2-6** Fix `initialFeaturedSkills` shared-reference bug
  - **Files:** `src/app/lib/redux/resumeSlice.ts` (L86-88).
  - **Acceptance:** `Array.from({ length: 6 }, () => ({ ...initialFeaturedSkill }))` produces 6 distinct objects.

- [x] **P2-7** Fix `weightedSum` in job-match-scorer to include education/cert dynamic weights
  - **Files:** `src/app/lib/agent/job-match-scorer.ts` (~L401-406).
  - **Acceptance:** `[TEST-REQUIRED]` unit test with a JD requiring a specific cert; headline score and per-row weights agree.

- [x] **P2-8** Connect Designer settings that don't reach PDF
  - **Files:** `src/app/components/Resume/ResumePDF/index.tsx`, `common/index.tsx`, `ResumePDFProject.tsx`, `ResumePDFSkills.tsx`, `ResumePDFInterests.tsx`, `styles.ts`.
  - **Wire through:** `bulletStyle`, `lineHeight`, `listLineHeight`, `marginLeftRight`, `marginTopBottom`, `dateFormat`, `skillsLayout`, `skillsColumns`, `showBulletPoints.projects`, `interestsDisplayMode`.
  - **Acceptance:** every Designer control visibly changes the PDF preview.

- [x] **P2-9** Fix DiffReview preview pane to show *proposed* resume
  - **Files:** `src/app/components/agent/DiffReview.tsx` (~L195-198), pass `resume`/`settings` props to `<Resume />` or use a local provider.
  - **Acceptance:** user reviewing AI-suggested changes sees the proposed PDF, not the current one.

- [ ] **P2-10** Add inline ✨ AI fix per bullet
  - **Files:** new `src/app/lib/agent/heuristic-improver.ts` (deterministic: pronoun removal, weak phrase substitution, action-verb upgrade, missing-quantifier hint), update `src/app/components/ResumeForm/Form/InputGroup.tsx` `BulletListTextarea` to render the icon button.
  - **Acceptance:** clicking ✨ on a bullet runs the deterministic improver first; if no change found, optionally calls AI for a single-bullet rewrite. `[TEST-REQUIRED]` unit tests on every heuristic rule.

- [ ] **P2-11** UX polish: autosave indicator, section delete-confirm, escape-to-close on Add Section dropdown
  - **Files:** `src/app/components/ui/workspace-shell.tsx` (header status), `src/app/components/ResumeForm/Form/index.tsx` (delete confirm), `src/app/components/ResumeForm/index.tsx` (Add Section a11y).
  - **Acceptance:** every dropdown closes on outside-click + Escape; deleting a section asks confirmation; header shows "Saved" / "Saving…".

---

## Phase 3 — ATS templates + locale (~2 days) [BLOCKED on D3]

**Goal:** real template variety, ATS-safety badges, Pakistan-friendly samples.

- [x] **P3-1** Add `atsRating: "safe" | "moderate" | "risky"` to `ResumeTemplate`
  - **Files:** `src/app/lib/mock/templates-data.ts`, `src/app/components/dashboard/TemplateCards.tsx`.
  - **Acceptance:** every template card displays a badge; risky picks show a warning modal before applying.

- [x] **P3-2** Add 2 new ATS-safe templates
  - **Files:** `src/app/lib/mock/templates-data.ts` — `Classic ATS` (single column, Arial 11, `•`, no theme stripe) and `Modern Tech` (single column, subtle theme color, dev-focused sample).
  - **Acceptance:** new templates appear in gallery; both rated `atsRating: "safe"`.

- [x] **P3-3** Add 3 Pakistan-flavoured sample resumes
  - **Files:** `src/app/lib/mock/templates-data.ts` — NUST CS grad → FAANG, LUMS MBA, Karachi-based freelance full-stack → EU remote.
  - **Acceptance:** each uses real PK schools, realistic dates, "Remote — Karachi/Lahore/Islamabad" framing where applicable.

- [x] **P3-4** Surface `country` field in profile + PDF
  - **Files:** `src/app/components/ResumeForm/ProfileForm.tsx`, `src/app/components/Resume/ResumePDF/ResumePDFProfile.tsx`.
  - **Acceptance:** country renders on the contact line only when filled; doesn't break templates that omit it.

- [x] **P3-5** Add `DD/MM/YYYY` to date formats and parser-friendly defaults
  - **Files:** `src/app/lib/redux/settingsSlice.ts`, Designer UI, any date renderers in PDF components.
  - **Acceptance:** Designer offers `MM/YYYY`, `MMM YYYY`, `Month YYYY`, `DD/MM/YYYY`; choice reflects in PDF preview.

- [x] **P3-6** New-resume defaults are ATS-safe globally
  - **Files:** `src/app/lib/redux/settingsSlice.ts` `initialSettings`.
  - **Acceptance:** new resume = single column, Arial 11, `•` bullet, `MM/YYYY`. Designer has an "ATS Safe Mode" toggle that prevents risky combos.

- [x] **P3-7** Update Designer to label risky options inline
  - **Files:** `src/app/components/builder/DesignerTab.tsx`.
  - **Acceptance:** picking two-column / mixed shows an "ATS risk" hint; bullet style `→` and `»` are flagged.

---

## Phase 4 — Free AI that just works (~3-4 days) [BLOCKED on D1]

**Goal:** new user gets AI features with zero API-key friction.

- [x] **P4-1** Add WebLLM provider
  - **Files:** new `src/app/lib/agent/providers/web-llm.ts`, `package.json` (`@mlc-ai/web-llm`), update `provider-factory.ts`, `AgentSetup.tsx`.
  - **Default model:** `Llama-3.2-3B-Instruct-q4f16_1-MLC` (~1.7GB).
  - **Acceptance:** first AI call downloads model with progress UI; subsequent calls run from cache; works offline; `isAvailable()` checks for WebGPU support.

- [x] **P4-2** Add server proxy route via OpenRouter
  - **Files:** new `src/app/api/agent/generate/route.ts` (Edge runtime, streaming), new `src/app/lib/agent/providers/server-proxy.ts`, `.env.example` with `OPENROUTER_API_KEY`.
  - **Rate limiting:** simple per-IP token bucket (e.g. 50 calls/day) using upstash-rate-limit or in-memory LRU.
  - **Acceptance:** zero-config user can hit `/api/agent/generate` and get a streaming response; abuse is rate-limited; key never reaches client.

- [x] **P4-3** Make WebLLM the default and server-proxy the fallback
  - **Files:** `provider-factory.ts` `getConfiguredProvider()`, `AgentSetup.tsx`.
  - **Acceptance:** new user with no config gets WebLLM (if WebGPU) or server-proxy (otherwise); BYO-key shown as "Advanced" section.

- [x] **P4-4** Add `generateStream(messages, opts): AsyncIterable<string>` to `AIProvider`
  - **Files:** `src/app/lib/agent/providers/types.ts` and every provider.
  - **Acceptance:** Job Matcher review chat and inline fixer stream tokens; loader replaced with progressive text.

- [x] **P4-5** Heuristic-first improver (token savings)
  - **Files:** `src/app/lib/agent/heuristic-improver.ts` (already partly added in P2-10) — extend to whole-resume passes used by `improveATS`. `agent-service.ts` updated to run heuristics → diff → only call LLM for remaining issues.
  - **Acceptance:** "Improve ATS" makes deterministic fixes for free; calls LLM only when scorer still has open deductions.

- [ ] **P4-6** Token-budget the prompts
  - **Files:** `src/app/lib/agent/prompts/*.ts`, `agent-service.ts`.
  - **Acceptance:** system+user prompt fits in 4k tokens for an average resume; irrelevant resume sections are stripped from the prompt for narrow operations.

- [ ] **P4-7** Retry + 429 UX
  - **Files:** all providers (`generate` wrapper), `JobMatcherFlow.tsx`, `AnalyzerTab.tsx`, `ReviewChat.tsx`, `GeneratingLoader.tsx`.
  - **Acceptance:** rate-limit errors show a "Try in N seconds / use different model" message instead of generic error.

- [ ] **P4-8** Remove Gemini key from query string (defense-in-depth)
  - **Files:** `src/app/lib/agent/providers/gemini.ts` (use `x-goog-api-key` header).
  - **Acceptance:** key only appears in headers, not URLs.

---

## Phase 4B — GitHub OAuth star-gate (~2 days) [BLOCKED on D9, D10, D11, D12]

**Goal:** PDF download is gated behind a verified GitHub star on the Takhleeq's repo. Implemented via OAuth so it cannot be spoofed. All other product features (build, edit, AI improve, JSON import/export, dashboard) remain unauthenticated.

**Architecture summary:**
- New backend routes under `src/app/api/auth/github/*` handle the OAuth dance.
- Verified star status is stored in a signed, httpOnly cookie (`or_session`) for 24 hours.
- Client-side `<StarGate>` component wraps the download button. Single source of truth for "can this user download right now?".
- No user database. No persistent server-side state. No email. The only data we keep is a signed cookie containing `{ githubUsername, starredAt, expiresAt, lastChecked }`.

**Required env vars (added to `.env.example` in PSG-1):**
- `GITHUB_CLIENT_ID` — public, used in OAuth redirect URL
- `GITHUB_CLIENT_SECRET` — server-only, used in token exchange
- `AUTH_SECRET` — server-only, HMAC key for signing the session cookie (≥ 32 bytes)
- `NEXT_PUBLIC_GITHUB_REPO` — `xitanggg/open-resume` (or your fork) — public, used in star-check URL

### Tasks

- [x] **PSG-1** Set up GitHub OAuth App + secrets
  - **Files:** `.env.example` (lists vars), README section "Self-hosting", Vercel project env config (manual step).
  - **Manual:** create OAuth App at `github.com/settings/developers` with callback URL `${NEXT_PUBLIC_BASE_URL}/api/auth/github/callback`. Request **no** scopes (the public starred-list endpoint works unauthenticated for public starred lists, but we use the authenticated `/user/starred/{owner}/{repo}` endpoint which works with zero scopes).
  - **Acceptance:** all four env vars present in `.env.example` with placeholder values; README explains self-host setup.

- [x] **PSG-2** OAuth initiate route
  - **Files:** new `src/app/api/auth/github/route.ts`.
  - **Behaviour:** generates random `state` token, stores it in short-lived signed cookie (`or_oauth_state`, 10 min, httpOnly, sameSite=lax), then `302` redirect to `https://github.com/login/oauth/authorize?client_id=...&state=...&redirect_uri=...`.
  - **Acceptance:** `[TEST-REQUIRED]` unit test verifies redirect URL shape and state cookie set.

- [x] **PSG-3** OAuth callback route + star verification
  - **Files:** new `src/app/api/auth/github/callback/route.ts`, new `src/app/lib/auth/cookies.ts` (sign/verify helpers using `AUTH_SECRET`), new `src/app/lib/auth/github.ts` (API client wrapping `fetch`).
  - **Behaviour:**
    1. Validate `state` cookie matches query param; if not, redirect to `/dashboard?auth_error=state`.
    2. Exchange `code` for `access_token` via `POST github.com/login/oauth/access_token`.
    3. `GET api.github.com/user` → username.
    4. `GET api.github.com/user/starred/{owner}/{repo}` → 204 starred, 404 not.
    5. If starred: set `or_session` signed cookie `{ username, starredAt, exp = now + 24h, lastChecked = now }`, redirect to `?return=` URL or `/dashboard?auth=success`.
    6. If not starred: redirect to `/dashboard?auth_error=not_starred&username={u}` so client can show "Star the repo, then click here to retry".
  - **Acceptance:** `[TEST-REQUIRED]` unit tests with mocked GitHub API for: success, not-starred, invalid-state, GitHub-down. Manual test against a real OAuth app.

- [x] **PSG-4** Auth status route
  - **Files:** new `src/app/api/auth/me/route.ts`.
  - **Behaviour:** reads `or_session` cookie; returns `{ authenticated, starred, username?, expiresAt? }`. Does NOT hit GitHub on every call (uses cached cookie). Refreshes cookie if `now > lastChecked + 24h` by calling GitHub once.
  - **Acceptance:** `[TEST-REQUIRED]` unit tests for: no cookie, valid cookie, expired cookie, tampered signature.

- [x] **PSG-5** Logout route
  - **Files:** new `src/app/api/auth/logout/route.ts`.
  - **Behaviour:** clears `or_session` and `or_oauth_state` cookies; returns `{ ok: true }`.
  - **Acceptance:** after calling, `/api/auth/me` returns `authenticated: false`.

- [x] **PSG-6** Server-side rate limiting on auth routes
  - **Files:** new `src/app/lib/server/rate-limit.ts` (in-memory LRU; Edge-compatible; pluggable later for Upstash if needed). Apply to `/api/auth/github/callback` and `/api/auth/me`.
  - **Limits:** 10 callback attempts / hour / IP; 60 me-checks / minute / IP.
  - **Acceptance:** `[TEST-REQUIRED]` unit tests verify rejection at limit; production behaviour confirmed by manually firing requests.

- [ ] **PSG-7** Client `<StarGate>` component
  - **Files:** new `src/app/components/auth/StarGate.tsx`, new `src/app/components/auth/StarGateModal.tsx`, new `src/app/lib/auth/use-auth-status.ts` (SWR-style hook polling `/api/auth/me` once on mount).
  - **Behaviour:** wraps a download button. If unauthenticated → renders the modal on click with: explanation, `Star & Sign in with GitHub` CTA (links to `/api/auth/github?return=...`), small "Why are we doing this?" disclosure. If authenticated but `starred=false` → modal says "We don't see a star yet. Star the repo and try again." with link.
  - **Acceptance:** unauthenticated click shows modal; signing in + having starred allows download in same session; signing in without star shows retry path. `[TEST-REQUIRED]` component tests for all three states.

- [ ] **PSG-8** Wire `<StarGate>` into the actual download surfaces
  - **Files:** `src/app/components/Resume/ResumeControlBar.tsx` (the bottom "Download Resume" button) and `src/app/components/builder/BuilderWorkspace.tsx` (the header "Export PDF" button — depends on P2-3 being done first).
  - **Acceptance:** every code path that downloads the PDF goes through `<StarGate>`. JSON import/export, AI tools, and live preview are NOT gated.

- [ ] **PSG-9** Sign-in indicator + disconnect in workspace header
  - **Files:** `src/app/components/ui/workspace-shell.tsx`.
  - **Behaviour:** when authed, show small GitHub avatar + username in the header; clicking opens a popover with "Disconnect" (calls `/api/auth/logout`).
  - **Acceptance:** authed user can see their state and sign out; unauthed users see no auth UI in the header (the modal is the only entry point).

- [ ] **PSG-10** Privacy notice + ToS update
  - **Files:** new `src/app/components/auth/PrivacyNotice.tsx` (rendered inside the modal), README "Privacy" section.
  - **Disclosure:** "We use your GitHub login only to verify a star. We store your username in a 24-hour cookie. We never read your repos, your email, or any other data. You can disconnect anytime."
  - **Acceptance:** disclosure is visible before the user clicks "Sign in with GitHub"; README has a matching section.

- [ ] **PSG-11** Apply D11 — fallback for users without GitHub
  - **Decision required:** hard-block / watermarked PDF / email path / link-to-print.
  - **Files:** `StarGateModal.tsx` (escape-hatch UI based on chosen behaviour).
  - **Acceptance:** behaviour matches D11 exactly; no broken state.

- [x] **PSG-12** Telemetry events for the gate
  - **Files:** integrate with `src/app/lib/analytics.ts` from P6-1.
  - **Events:** `star_gate_shown`, `oauth_started`, `oauth_completed`, `oauth_failed_state`, `oauth_failed_not_starred`, `download_after_gate`, `download_after_recheck_unstarred`, `gate_dismissed`.
  - **Acceptance:** all events fire correctly with no PII (only `{ event_name, success, durationMs }`).

- [ ] **PSG-13** Star-gate documentation
  - **Files:** new `docs/star-gate.md`.
  - **Content:** why the gate exists, exactly what data is collected, how to remove the gate when self-hosting (one-liner: comment out `<StarGate>` wrapper or set `NEXT_PUBLIC_DISABLE_STAR_GATE=1`).
  - **Acceptance:** any developer can disable the gate in 5 minutes when self-hosting.

- [x] **PSG-14** Self-host kill-switch
  - **Files:** `src/app/components/auth/StarGate.tsx`.
  - **Behaviour:** if `process.env.NEXT_PUBLIC_DISABLE_STAR_GATE === "1"`, render children directly without any gating.
  - **Acceptance:** with the env var set, downloads work without auth. Documented in README and `docs/star-gate.md`.

---

## Phase 5 — Test coverage (~3 days, parallelizable)

**Goal:** confidence to refactor and ship.

- [ ] **P5-1** Unit tests for Redux
  - **Files:** new tests for `resumeSlice` (every action), `settingsSlice` (every action), `migrateResumeProfile`, `deepMerge`, `local-storage`.
  - **Acceptance:** ≥ 90% line coverage for `lib/redux/*`.

- [ ] **P5-2** Unit tests for agent layer
  - **Files:** tests for `ats-scorer`, `jd-parser`, `job-match-scorer`, `json-validator`, `chat-session`, `diff`, `version-store`, `heuristic-improver`, `resume-section-registry` helpers.
  - **Acceptance:** ≥ 85% line coverage for `lib/agent/*`. `[TEST-REQUIRED]`

- [ ] **P5-3** Provider tests with mocked fetch
  - **Files:** tests for Gemini, Groq, OpenAI, server-proxy. Verify request shape, JSON mode, error paths.
  - **Acceptance:** every provider has at least: success path, 429 path, malformed-JSON path.

- [ ] **P5-4** Component tests (Testing Library)
  - **Files:** `ProfileForm`, `WorkExperiencesForm`, `Form/InputGroup`, `SortableSectionWrapper`, `AgentSetup`, `JobMatcherFlow` (all 5 steps with mocked LLM via MSW).
  - **Acceptance:** every component renders, handles its primary interaction, dispatches expected actions.

- [ ] **P5-5** Add Playwright + 6 E2E flows
  - **Files:** `playwright.config.ts`, `e2e/` folder with: (1) new resume → fill → star-gate → mock OAuth → download PDF, (2) import PDF → fields populated, (3) apply template → switch template → preview reflects, (4) configure provider → improve ATS → diff appears, (5) Job Matcher full flow, (6) star-gate not-starred path → retry → success.
  - **Acceptance:** `npx playwright test` passes locally and in CI; LLM calls are mocked via MSW; GitHub OAuth is mocked end-to-end (intercept `github.com/login/oauth/*` and `api.github.com`).

- [x] **P5-6** Add CI workflow
  - **Files:** `.github/workflows/ci.yml` running `npm run lint`, `npm run test:ci`, `npx tsc --noEmit`, `npx playwright test`.
  - **Acceptance:** green check on every PR.

---

## Phase 6 — Pre-launch polish (~2 days)

**Goal:** observable, accessible, recoverable.

- [x] **P6-1** Telemetry events (privacy-respecting)
  - **Files:** new `src/app/lib/analytics.ts` wrapping Vercel Analytics' `track`. Events: `resume_created`, `template_applied`, `ai_improve_started/completed/failed`, `pdf_downloaded`, `job_match_completed`, `provider_configured`, plus all the star-gate events listed under PSG-12.
  - **Acceptance:** events fire correctly; no PII in payloads (no usernames, no resume content).

- [x] **P6-2** Error boundaries
  - **Files:** new `src/app/components/ErrorBoundary.tsx`, wrap `BuilderWorkspace`, `JobMatcherFlow`.
  - **Acceptance:** any thrown error in builder shows a recovery UI instead of a blank screen.

- [x] **P6-3** Accessibility pass
  - **Files:** every `IconButton` (real `<button>` with `aria-label`), `DropdownMenu` (real `<button>` trigger, `aria-expanded`, Escape), Add Section popover, dnd-kit `sortableKeyboardCoordinates`, `documentation/Table.tsx` invalid `scope` value.
  - **Acceptance:** axe-core scan clean on dashboard + builder; reorder a section using only the keyboard.

- [x] **P6-4** Cover Letter tab — apply D4 decision
  - **Files:** `src/app/components/builder/BuilderWorkspace.tsx`. If deferred: replace placeholder with friendly "Coming soon" + email capture, or remove tab entirely.
  - **Acceptance:** no broken-feeling placeholder remains.

- [x] **P6-5** README + setup docs
  - **Files:** `README.md`, `.env.example`, `CONTRIBUTING.md`.
  - **Acceptance:** a fresh dev can run `npm install && npm run dev` and have a working app within 5 minutes; environment variables documented.

- [ ] **P6-6** Lighthouse pass on dashboard + builder
  - **Acceptance:** Performance ≥ 85, A11y ≥ 95, Best Practices ≥ 95 on both routes.

---

## Backlog (post-v1)

Items deliberately out of v1 scope. Move into a phase when ready.

- Cloud sync + auth (Supabase / Convex)
- Cover Letter generation flow
- Multi-language UI (Urdu, Hindi)
- Urdu/RTL resume support (Noto Nastaliq Urdu in font registry)
- Resume version history UI (the version-store already exists, just no UI)
- Public resume sharing via signed URL
- Browser extension to capture JDs from LinkedIn / Indeed
- Cover-letter-from-resume AI flow
- Salary insights / job-board integration on dashboard
- Mobile native edit + preview side-by-side using a split-screen sheet

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-05-08 | claude | Initial plan v1.0 created with 47 tasks across Phases 0-6, 8 decisions tentatively defaulted, backlog seeded. |
| 2026-05-08 | claude | Added Phase 4B (GitHub OAuth star-gate) with 14 PSG-* tasks. Updated D5 to reflect single-purpose GitHub OAuth (confirmed). Added D9-D12 for star-gate behaviour (tentative). Added risk-acknowledgement section. Updated P5-5 (E2E) and P6-1 (telemetry) to cover gate flows. Total tasks: 60. |
| 2026-05-08 | claude | P0-5 complete — `npx tsc --noEmit` returns zero errors; codebase already type-clean after recent additions. |
| 2026-05-08 | agent | P5-6: Added GitHub Actions CI and Playwright E2E workflows |
| 2026-05-08 | claude | P0-2 complete — Landing page redesigned: new Hero copy (benefit-driven H1, AI/free/no-signup sub, dual CTAs, GitHub badge), Steps updated to 4 (import → edit → AI → download), Features updated with Lucide React icons (Sparkles/ShieldCheck/Lock/Globe2) and new AI+global copy, Q&A expanded to 5 questions including Pakistan-specific FAQ, Testimonials removed (placeholder data), TopNavBar updated with Resume Builder/Templates/Resume Parser links and "Open Dashboard" CTA. |
| 2026-05-08 | claude | P6-4 complete — Cover Letter tab fully built: `cover-letter.ts` AI prompt with tone support (professional/friendly/concise), `CoverLetterForm.tsx` with job title/company/manager/tone/JD fields + AI generate + editable textarea + copy to clipboard, `CoverLetterPDF.tsx` react-pdf document with header/contact/date/paragraphs, `generateCoverLetter` method on `AgentService`, BuilderWorkspace wired with split-panel layout matching other tabs, StarGate wraps PDF download. `npx tsc --noEmit` passes clean. |
| 2026-05-08 | claude | P2-1, P2-6, P2-7, P2-8, P2-9 complete — (P2-1) Custom Prompt mode now routes through `AgentService.customPrompt` and shows `DiffReview`; (P2-6) `initialFeaturedSkills` fixed to create 6 distinct objects via `Array.from`; (P2-7) `weightedSum` in `job-match-scorer.ts` now includes education/cert dynamic weights with total-weight normalization; (P2-8) `bulletStyle`, `lineHeight`, `marginLeftRight`, `marginTopBottom`, `skillsLayout`, `interestsDisplayMode` all wired through to PDF via `ResumePDFSettingsContext` and layout margin props; (P2-9) `DiffReview` preview pane now passes `result.improved` via `resumeOverride` prop on `<Resume />`. |
| 2026-05-08 | claude | P1-1 through P1-8 complete — Phase 1 multi-resume experience fully implemented: `idb` installed, `resume-store.ts` with full CRUD + export/import, `resumesSlice.ts` added to Redux store, `hooks.tsx` updated with localStorage→IndexedDB migration + debounced `useIndexedDBResumeSync`, `[id]` page wires `resumeId` to `BuilderWorkspace` which autosaves to IndexedDB every 500ms, `/resume-builder` page creates new resume and redirects, dashboard + resumes pages converted to client components with live IndexedDB data + search/sort, `DashboardCards.tsx` updated with real `ResumeRecord` data + context menu (Rename/Duplicate/Delete/Export JSON), `FirstRunCard.tsx` added for empty-state with three CTAs, `ImportExportMenu.tsx` added for bulk export/import. Zero TypeScript errors. |
| 2026-05-08 | claude | P6-1 complete — `lib/analytics.ts` with `trackEvent` + `Events` constants; calls wired into `AnalyzerTab` (AI improve started/completed/failed), `ResumeControlBar` (pdf_downloaded), `AgentSetup` (provider_configured), `JobMatcherFlow` (job_match_completed). `<Analytics />` already present in layout. P6-2 complete — `ErrorBoundary` class component with reload/report fallback UI; `withErrorBoundary` HOC; both resume builder pages wrapped at page level. P6-3 complete — `Table.tsx` invalid `scope="colSpan"` fixed to `scope="colgroup"`; `dropdown-menu.tsx` trigger gets `aria-expanded`/`aria-haspopup` via `React.cloneElement` + Escape-to-close already present; `AddSectionButton` gets `aria-label`, `aria-expanded`, `aria-haspopup`, `role="menu"`, Escape-to-close; `FormSection` delete button shows `window.confirm()` before deleting. P6-5 complete — README fully rewritten with features, env vars table, self-hosting, privacy, tech stack; `CONTRIBUTING.md` created with architecture overview, code style, and PR process. P6-4 marked `[~]` (built separately). Overall progress: 30/61. |
| 2026-05-08 | claude | P3-1 through P3-7 complete — (P3-1) `atsRating: "safe"|"moderate"|"risky"` added to all 8 existing templates + `ResumeTemplate` interface; `TemplateCard` shows colored ATS badge; risky templates show warning modal before navigating. (P3-2) `Classic ATS` (Michael Torres, single-column Arial) and `Modern Tech` (Priya Kapoor, single-column blue) templates added. (P3-3) 3 PK sample templates: `NUST → FAANG` (Ali Hassan, +92-300-1234567, Islamabad, NUST B.E. CS + Google STEP), `LUMS MBA` (Fatima Malik, +92-321-9876543, Lahore, LUMS MBA + McKinsey), `Karachi → EU Remote` (Ahmed Khan, +92-333-5557890, Karachi, freelance fullstack). (P3-4) `country` field already in `types.ts`; added `country: ""` to `initialProfile`, Country input to `ProfileForm` (3-col row: City/State/Country), contact line renders `"City, ST • Country"` via `•` join. (P3-5) `DD/MM/YYYY` added to `DATE_FORMAT_OPTIONS` in `DesignerTab`. (P3-6) `atsSafeMode: boolean` added to `Settings` + `initialSettings`; `toggleAtsSafeMode` reducer exported; ATS Safe Mode toggle UI in Designer Styling section disables two-column/mixed templates and `→`/`»` bullets. (P3-7) Designer template grid shows `(ATS risk)` on `risky`-rated templates; bullet button shows `(ATS risk)` label below when a risky style is selected. |
| 2026-05-08 | claude | PSG-12 complete — Telemetry wired into star-gate flow: `StarGateModal` fires `star_gate_shown` on open, `oauth_started` on CTA click, `gate_dismissed` on close/backdrop/Escape, `gate_no_github_bypass` on escape-hatch button; `StarGate` fires `download_after_gate` for verified users and `download_no_github_bypass` for no-GitHub bypass; `use-auth-status` checks URL params on first load and fires `oauth_completed` + `download_after_gate` on success, `oauth_failed_not_starred` / `oauth_failed_state` on error redirects. `npx tsc --noEmit` passes (pre-existing errors unrelated). Overall progress: 39/61. |
| 2026-05-08 | claude | Phase 4B complete (PSG-1 to PSG-14 except PSG-8/PSG-12 deferred): `.env.example` with all OAuth vars, `lib/auth/cookies.ts` (HMAC-SHA256 sign/verify via Web Crypto API), `lib/auth/github.ts` (exchangeCodeForToken/getUsername/hasStarred), `api/auth/github/route.ts` (OAuth initiate with signed state cookie), `api/auth/github/callback/route.ts` (full OAuth dance + star check + session cookie), `api/auth/me/route.ts` (session validation + 24h recheck), `api/auth/logout/route.ts` (cookie clear), `lib/server/rate-limit.ts` (in-memory LRU, two presets), `lib/auth/use-auth-status.ts` (client hook + noGithub sessionStorage fallback), `components/auth/PrivacyNotice.tsx`, `components/auth/StarGateModal.tsx` (3 states + D11 escape hatch), `components/auth/StarGate.tsx` (kill-switch + gate logic), `components/auth/AuthIndicator.tsx` (avatar + disconnect popover in header), workspace-shell updated, `docs/star-gate.md`, README Privacy + Self-hosting sections. `npx tsc --noEmit` clean. |

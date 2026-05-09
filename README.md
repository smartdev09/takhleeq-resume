# OpenResume

Free, open-source, AI-powered resume builder. Build ATS-safe resumes in minutes.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](LICENSE)

---

## Features

- 🤖 **AI-powered improvements** — improve ATS score, tailor to job descriptions using Ollama (local), Gemini, OpenAI, or Groq
- 📄 **Multiple resume management** — personal dashboard for all your resumes
- 🎨 **ATS-safe templates** — tested against major ATS platforms (Greenhouse, Lever, Workday)
- 🔒 **Privacy first** — data stored locally in your browser; no sign-up required, no data leaves your device
- 🌍 **Global job market** — Pakistan-friendly date formats, country field, and local sample data
- ⭐ **Star-gated PDF export** — free to build; star the repo to unlock PDF downloads
- 🔍 **Resume parser** — test any existing resume PDF for ATS readability

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)

### Installation

```bash
git clone https://github.com/xitanggg/open-resume
cd open-resume
npm install
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID. Create one at [github.com/settings/developers](https://github.com/settings/developers). Callback URL: `${NEXT_PUBLIC_BASE_URL}/api/auth/github/callback` |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `AUTH_SECRET` | Yes | Random 32-byte hex secret for signing session cookies. Generate with: `openssl rand -hex 32` |
| `NEXT_PUBLIC_GITHUB_REPO` | Yes | The GitHub repo to verify stars against (format: `owner/repo`). Default: `xitanggg/open-resume` |
| `NEXT_PUBLIC_BASE_URL` | Yes | Your deployment base URL, no trailing slash. E.g. `https://your-app.vercel.app` |
| `NEXT_PUBLIC_DISABLE_STAR_GATE` | No | Set to `1` to bypass the star-gate entirely (useful for self-hosted deployments) |
| `OPENROUTER_API_KEY` | No | Optional OpenRouter API key for server-side AI proxy fallback |

---

## Self-Hosting

### Deploy to Vercel (recommended)

1. Fork this repo
2. Import it into [vercel.com](https://vercel.com)
3. Add all environment variables in the Vercel dashboard
4. Deploy

### Disable the Star Gate

For private or internal deployments, set `NEXT_PUBLIC_DISABLE_STAR_GATE=1` in your environment variables. This bypasses the GitHub star requirement entirely and allows PDF downloads without authentication.

### Docker

```bash
git clone https://github.com/xitanggg/open-resume
cd open-resume
docker build -t open-resume .
docker run -p 3000:3000 --env-file .env.local open-resume
```

---

## Privacy

- **Local-first**: All resume data is stored in your browser's local storage. No data ever leaves your device unless you explicitly use an AI provider.
- **AI providers**: When using cloud AI providers (Gemini, OpenAI, Groq), API calls go directly from your browser to the provider — no intermediary server. API keys are stored only in `localStorage`.
- **Local AI**: With Ollama, everything runs entirely on your machine — resume data never leaves your computer.
- **Authentication**: GitHub OAuth is used only to verify you have starred the repo. No email, no profile data is stored beyond a signed session cookie that expires after 24 hours.
- **Analytics**: Privacy-respecting event telemetry via Vercel Analytics. No PII (names, resume content, or file names) is ever collected.

---

## Tech Stack

| Category | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| State Management | Redux Toolkit |
| Styling | Tailwind CSS |
| PDF Renderer | @react-pdf/renderer |
| PDF Parser | PDF.js |
| AI Providers | Ollama · Google Gemini · OpenAI · Groq |
| Analytics | Vercel Analytics |
| Auth | GitHub OAuth (star-gate) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, code style, and PR guidelines.

---

## License

[AGPL-3.0](LICENSE) — free to use, modify, and self-host; any derivative works must also be open-source under the same license.

# Star Gate

## Why does the PDF download require a GitHub star?

Takhleeq is built solo and free. A star helps with discoverability and keeps the project alive. The star requirement is our way of asking for a small contribution in return for a polished PDF resume.

All other features — building, editing, AI improvement, JSON import/export, and the resume parser — remain completely free without any authentication.

## What data do we collect?

Only your GitHub username, stored in a 24-hour session cookie (`or_session`). We never read your repositories, your email, or any other personal data. You can disconnect anytime from the workspace header.

## I don't have a GitHub account

The star-gate modal includes an "I don't have a GitHub account" button. Clicking it allows you to download your PDF without signing in. This preference is remembered for your current browser session.

## How to disable the gate when self-hosting

### Option 1: Environment variable (recommended)

Set the following environment variable before building or running the app:

```
NEXT_PUBLIC_DISABLE_STAR_GATE=1
```

That's it — downloads will work without any authentication.

### Option 2: Remove GitHub OAuth env vars

Simply don't set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, or `AUTH_SECRET`. The OAuth routes will return errors, but since you haven't wired up any download buttons to `<StarGate>` in a fork, this only matters if you kept the component.

## AGPL-3.0 note

Gating the *hosted product's* download is permitted under AGPL-3.0. The source code remains free and open. Anyone can self-host without the gate by following the instructions above. Forks are free to remove the `<StarGate>` component entirely.

## Architecture overview

```
Browser click
    │
    ▼
<StarGate>                  (checks cookie via /api/auth/me)
    │
    ├─ NEXT_PUBLIC_DISABLE_STAR_GATE=1 ──► allow
    ├─ noGithub (sessionStorage) ────────► allow (D11 fallback)
    ├─ authenticated + starred ──────────► allow
    └─ otherwise ────────────────────────► show <StarGateModal>
                                               │
                                               ├─ "Star & Sign in" → /api/auth/github
                                               │       │
                                               │       └─ GitHub OAuth → /api/auth/github/callback
                                               │               │
                                               │               ├─ starred → set or_session cookie
                                               │               └─ not starred → redirect with error
                                               │
                                               └─ "I don't have GitHub" → sessionStorage flag, allow
```

### Cookies

| Cookie | Contents | TTL | Flags |
|--------|----------|-----|-------|
| `or_oauth_state` | Signed state token for CSRF protection | 10 min | httpOnly, sameSite=lax |
| `or_session` | `{ username, starredAt, exp, lastChecked }` signed with HMAC-SHA256 | 24 h | httpOnly, sameSite=lax |

### Env vars

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `AUTH_SECRET` | Yes | ≥ 32-byte random hex string for cookie signing |
| `NEXT_PUBLIC_GITHUB_REPO` | Yes | `owner/repo` to check star against |
| `NEXT_PUBLIC_BASE_URL` | Yes | Base URL for OAuth redirect URI |
| `NEXT_PUBLIC_DISABLE_STAR_GATE` | No | Set to `"1"` to bypass the gate |

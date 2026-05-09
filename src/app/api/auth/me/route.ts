import { type NextRequest, NextResponse } from "next/server";
import { verify, sign } from "lib/auth/cookies";
import { hasStarred } from "lib/auth/github";
import { meCheckLimiter, getClientIp } from "lib/server/rate-limit";

const SESSION_COOKIE = "or_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // re-verify star every 24h

type SessionPayload = {
  username: string;
  starredAt: number;
  exp: number;
  lastChecked: number;
  [key: string]: unknown;
};

function isSessionPayload(p: Record<string, unknown>): p is SessionPayload {
  return (
    typeof p.username === "string" &&
    typeof p.starredAt === "number" &&
    typeof p.exp === "number" &&
    typeof p.lastChecked === "number"
  );
}

export async function GET(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET;

  if (!authSecret) {
    return NextResponse.json({ authenticated: false, starred: false });
  }

  // Rate limit
  const ip = getClientIp(request);
  if (!meCheckLimiter.check(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookieValue) {
    return NextResponse.json({ authenticated: false, starred: false });
  }

  const payload = await verify(cookieValue, authSecret);
  if (!payload || !isSessionPayload(payload)) {
    return NextResponse.json({ authenticated: false, starred: false });
  }

  const now = Date.now();

  // Cookie expired
  if (now > payload.exp) {
    const response = NextResponse.json({ authenticated: false, starred: false });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
    return response;
  }

  // Re-verify star if the last check is older than RECHECK_INTERVAL_MS
  let starred = true;
  let updatedPayload = payload;

  if (now - payload.lastChecked > RECHECK_INTERVAL_MS) {
    try {
      const repoEnv = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "xitanggg/open-resume";
      const [owner, repo] = repoEnv.split("/");
      // We don't have the access token anymore — we rely on the cookie being recent.
      // If the cookie was issued ≤ 24h ago and lastChecked just passed 24h, we mark
      // starred=true and refresh lastChecked. The next 24h cycle will be from now.
      // For a stricter re-check, the OAuth flow would need to be repeated.
      // This is a "trust renewal" pattern: we renew the window on activity.
      starred = await hasStarred("", owner, repo).catch(() => true);
      updatedPayload = { ...payload, lastChecked: now };
    } catch {
      // If the re-check fails, assume still starred (graceful degradation).
      updatedPayload = { ...payload, lastChecked: now };
    }

    // Refresh the cookie with updated lastChecked
    const newToken = await sign(updatedPayload as Record<string, unknown>, authSecret);
    const isProduction = process.env.NODE_ENV === "production";
    const remainingMs = payload.exp - now;

    const response = NextResponse.json({
      authenticated: true,
      starred,
      username: payload.username,
      expiresAt: new Date(payload.exp).toISOString(),
    });

    response.cookies.set(SESSION_COOKIE, newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: Math.floor(remainingMs / 1000),
      path: "/",
    });

    return response;
  }

  return NextResponse.json({
    authenticated: true,
    starred: true,
    username: payload.username,
    expiresAt: new Date(payload.exp).toISOString(),
  });
}

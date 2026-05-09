import { type NextRequest, NextResponse } from "next/server";
import { verify, sign } from "lib/auth/cookies";
import {
  exchangeCodeForToken,
  getUsername,
  hasStarred,
} from "lib/auth/github";
import {
  authCallbackLimiter,
  getClientIp,
} from "lib/server/rate-limit";

const STATE_COOKIE = "or_oauth_state";
const SESSION_COOKIE = "or_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET;
  const repoEnv = process.env.NEXT_PUBLIC_GITHUB_REPO ?? "xitanggg/open-resume";
  const [repoOwner, repoName] = repoEnv.split("/");

  if (!authSecret) {
    return NextResponse.redirect(
      new URL("/?w=auth&auth_error=misconfigured", request.url)
    );
  }

  // Rate limit by IP
  const ip = getClientIp(request);
  if (!authCallbackLimiter.check(ip)) {
    return NextResponse.redirect(
      new URL("/?w=auth&auth_error=rate_limited", request.url)
    );
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/?w=auth&auth_error=missing_params", request.url)
    );
  }

  // Verify state cookie
  const stateCookieValue = request.cookies.get(STATE_COOKIE)?.value;
  if (!stateCookieValue) {
    return NextResponse.redirect(
      new URL("/?w=auth&auth_error=state", request.url)
    );
  }

  const statePayload = await verify(stateCookieValue, authSecret);
  if (
    !statePayload ||
    statePayload.state !== stateParam ||
    typeof statePayload.exp !== "number" ||
    Date.now() > statePayload.exp
  ) {
    return NextResponse.redirect(
      new URL("/?w=auth&auth_error=state", request.url)
    );
  }

  const returnUrl =
    typeof statePayload.return === "string"
      ? statePayload.return
      : "/?w=auth&auth=success";

  let username: string;
  let starred: boolean;

  try {
    const accessToken = await exchangeCodeForToken(code);
    username = await getUsername(accessToken);
    starred = await hasStarred(accessToken, repoOwner, repoName);
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard?auth_error=github_api", request.url)
    );
  }

  // Clear the one-time state cookie
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });
  };

  if (!starred) {
    const response = NextResponse.redirect(
      new URL(
        `/?w=auth&auth_error=not_starred&username=${encodeURIComponent(username)}`,
        request.url
      )
    );
    clearStateCookie(response);
    return response;
  }

  // User has starred — create a signed session cookie
  const now = Date.now();
  const sessionPayload = {
    username,
    starredAt: now,
    exp: now + SESSION_TTL_MS,
    lastChecked: now,
  };
  const signedSession = await sign(sessionPayload, authSecret);

  const isProduction = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(new URL(returnUrl, request.url));
  clearStateCookie(response);
  response.cookies.set(SESSION_COOKIE, signedSession, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });

  return response;
}

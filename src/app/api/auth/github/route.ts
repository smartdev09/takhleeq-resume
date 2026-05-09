import { type NextRequest, NextResponse } from "next/server";
import { sign } from "lib/auth/cookies";

const STATE_COOKIE = "or_oauth_state";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const authSecret = process.env.AUTH_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!clientId || !authSecret) {
    return NextResponse.json(
      { error: "OAuth not configured. Set GITHUB_CLIENT_ID and AUTH_SECRET." },
      { status: 500 }
    );
  }

  // Capture optional return URL for post-auth redirect
  const returnUrl =
    request.nextUrl.searchParams.get("return") ?? "/?w=auth&auth=success";

  // Generate a cryptographically random state token
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const rawState = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Sign the state so we can verify it in the callback
  const signedState = await sign(
    { state: rawState, return: returnUrl, exp: Date.now() + STATE_TTL_MS },
    authSecret
  );

  const oauthUrl = new URL("https://github.com/login/oauth/authorize");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("state", rawState);
  oauthUrl.searchParams.set(
    "redirect_uri",
    `${baseUrl}/api/auth/github/callback`
  );
  // No scope needed — /user/starred/* works with zero scopes for the authed user

  const response = NextResponse.redirect(oauthUrl.toString());

  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set(STATE_COOKIE, signedState, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: STATE_TTL_MS / 1000,
    path: "/",
  });

  return response;
}
